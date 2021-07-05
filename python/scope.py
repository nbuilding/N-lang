import math
import os.path
import sys

import lark
import re
from lark import Lark
from colorama import Fore, Style

from variable import Variable
from function import Function
from native_function import NativeFunction
from type import (
    NType,
    NGenericType,
    NAliasType,
    NTypeVars,
    NModule,
    apply_generics,
    apply_generics_to,
    resolve_equal_types,
    NClass,
)
from enums import EnumType, EnumValue, EnumPattern
from native_function import NativeFunction
from native_types import n_list_type, n_cmd_type, none, yes
from ncmd import Cmd
from type_check_error import TypeCheckError, display_type
from display import display_value
from operation_types import (
    binary_operation_types,
    unary_operation_types,
    comparable_types,
    iterable_types,
    legacy_iterable_types,
)
from file import File
from imported_error import ImportedError
import native_functions
from syntax_error import format_error
from classes import NConstructor
from modules import libraries

unit_test_results = {}

basepath = ""
if getattr(sys, "frozen", False):
    basepath = os.path.dirname(sys.executable)
elif __file__:
    basepath = os.path.dirname(__file__)

syntaxpath = os.path.join(basepath, "syntax.lark")


def parse_file(file_path, base_path, parent_imports):
    import_scope = Scope(
        base_path=base_path, file_path=file_path, parent_imports=parent_imports
    )
    native_functions.add_funcs(import_scope)

    with open(syntaxpath, "r") as f:
        parse = f.read()
    n_parser = Lark(parse, start="start", propagate_positions=True)

    with open(file_path, "r", encoding="utf-8") as f:
        file = File(f, name=os.path.relpath(file_path, start=base_path))

    try:
        tree = file.parse(n_parser)
    except lark.exceptions.UnexpectedCharacters as e:
        format_error(e, file)
    except lark.exceptions.UnexpectedEOF as e:
        format_error(e, file)

    return import_scope, tree, file


async def eval_file(file_path, base_path, parent_imports):
    import_scope, tree, _ = parse_file(file_path, base_path, parent_imports)

    import_scope.variables = {
        **import_scope.variables,
        **(await parse_tree(tree, import_scope)).variables,
    }
    return import_scope


def type_check_file(file_path, base_path, parent_imports):
    import_scope, tree, text_file = parse_file(file_path, base_path, parent_imports)

    scope = type_check(tree, import_scope)
    import_scope.variables = {**import_scope.variables, **scope.variables}
    import_scope.public_types = {**import_scope.public_types, **scope.public_types}
    import_scope.errors += scope.errors[:]
    import_scope.warnings += scope.warnings[:]
    return import_scope, text_file


def type_check(tree, import_scope):
    scope = import_scope.new_scope(inherit_errors=False)
    if tree.data == "start":
        for child in tree.children:
            scope.type_check_command(child)
    else:
        scope.errors.append(
            TypeCheckError(
                tree, "Internal issue: I cannot type check from a non-starting branch."
            )
        )
    return scope


async def parse_tree(tree, import_scope):
    if tree.data == "start":
        scope = import_scope.new_scope(inherit_errors=False)
        for child in tree.children:
            await scope.eval_command(child)
        return scope
    else:
        raise SyntaxError("Unable to run parse_tree on non-starting branch")


def get_destructure_pattern(tree):
    if isinstance(tree, lark.Tree):
        if tree.data == "record_pattern":
            entries = []
            for pattern in tree.children:
                if isinstance(pattern, lark.Token):
                    entries.append((pattern.value, (pattern.value, pattern)))
                else:
                    key, value = pattern.children
                    entries.append((key.value, get_destructure_pattern(value)))
            return (dict(entries), tree)
        elif tree.data == "tuple_pattern":
            return (
                tuple(get_destructure_pattern(pattern) for pattern in tree.children),
                tree,
            )
        elif tree.data == "list_pattern":
            patterns = []
            for pattern in tree.children:
                patterns.append(get_destructure_pattern(pattern))
            return (patterns, tree)
        elif tree.data == "enum_pattern":
            enum_name, *pattern_trees = tree.children
            patterns = []
            for pattern in pattern_trees:
                patterns.append(get_destructure_pattern(pattern))
            return (EnumPattern(enum_name, patterns), tree)
    return (None if tree.value == "_" else tree.value, tree)


def pattern_to_name(pattern_and_src):
    pattern, _ = pattern_and_src
    if isinstance(pattern, str):
        return pattern
    else:
        return "<destructuring pattern>"


def get_arguments(tree):
    """
    The arguments syntax briefly had the WS token which had to be removed.
    """
    arguments = [tree for tree in tree.children if isinstance(tree, lark.Tree)]
    if len(arguments) > 0 and arguments[0].data == "generic_declaration":
        return arguments[0].children, arguments[1:]
    else:
        return [], arguments


escapes = {
    "n": "\n",
    "r": "\r",
    "t": "\t",
    "v": "\v",
    "0": "\0",
    "f": "\f",
    "b": "\b",
    '"': '"',
    "\\": "\\",
}


def unescape_sequence(escape_sequence_match):
    if escape_sequence_match[1]:
        return escapes[escape_sequence_match[1]]
    elif escape_sequence_match[2]:
        return chr(int(escape_sequence_match[2], 16))
    else:
        return escape_sequence_match[3]


def unescape(string):
    return re.sub(
        r'\\(?:([nrtv0fb"\\])|u\{([0-9a-fA-F]+)\}|\{(.)\})', unescape_sequence, string
    )


class Scope:
    def __init__(
        self,
        parent=None,
        parent_function=None,
        errors=None,
        warnings=None,
        base_path="",
        file_path="",
        parent_imports=None,
        parent_type="top",
        stack_trace=None,
        unit_tests=None,
    ):
        self.parent = parent
        self.parent_function = parent_function
        self.variables = {}
        self.types = {}
        self.public_types = {}
        self.errors = errors if errors is not None else []
        self.warnings = warnings if warnings is not None else []
        # The path of the directory containing the initial file. Used to
        # determine the relative path of a file to the starting file.
        self.base_path = base_path
        # The path of the file the Scope is associated with.
        self.file_path = file_path
        # The other files it has been imported from to prevent circular imports
        self.parent_imports = parent_imports if parent_imports is not None else []
        self.parent_type = parent_type

        self.stack_trace = stack_trace if stack_trace is not None else []
        self.unit_tests = unit_tests if unit_tests is not None else []

    def new_scope(
        self,
        parent_function=None,
        inherit_errors=True,
        parent_type=None,
        inherit_stack_trace=True,
        inherit_unit_tests=True,
    ):
        return Scope(
            self,
            parent_function=parent_function or self.parent_function,
            errors=self.errors if inherit_errors else [],
            warnings=self.warnings if inherit_errors else [],
            base_path=self.base_path,
            file_path=self.file_path,
            parent_imports=self.parent_imports,
            parent_type=parent_type or self.parent_type,
            stack_trace=self.stack_trace if inherit_stack_trace else [],
            unit_tests=self.unit_tests if inherit_unit_tests else [],
        )

    def get_variable(self, name, err=True):
        variable = self.variables.get(name)
        if variable is None:
            if self.parent:
                return self.parent.get_variable(name, err=err)
            elif err:
                raise NameError(
                    "You tried to get a variable/function `%s`, but it isn't defined."
                    % name
                )
        else:
            return variable

    def get_type(self, name, err=True):
        scope_type = self.types.get(name)
        if scope_type is None:
            if self.parent:
                return self.parent.get_type(name, err=err)
            elif err:
                raise NameError(
                    "You tried to get a type `%s`, but it isn't defined." % name
                )
        else:
            return scope_type

    def get_parent_function(self):
        if self.parent_function is None:
            if self.parent:
                return self.parent.get_parent_function()
            else:
                return None
        else:
            return self.parent_function

    def get_parent_types(self, types):
        if self.parent_type not in types:
            if self.parent:
                return self.parent.get_parent_types(types)
            else:
                return None
        else:
            return self.parent_type

    def get_module_type(self, module_type, err=True):
        *modules, type_name = module_type.children
        if len(modules) > 0:
            current_module = self.get_variable(modules[0].value, err=err)
            if current_module is None:
                self.errors.append(
                    TypeCheckError(
                        modules[0],
                        "I can't find `%s` from this scope." % modules[0].value,
                    )
                )
                return None
            current_module = current_module.type
            if not isinstance(current_module, NModule):
                self.errors.append(
                    TypeCheckError(modules[0], "%s is not a module." % modules[0].value)
                )
                return None
            for module in modules[1:]:
                current_module = current_module.get(module.value)
                if not isinstance(current_module, NModule):
                    self.errors.append(
                        TypeCheckError(module, "%s is not a module." % module.value)
                    )
                    return None
            n_type = current_module.types.get(type_name.value)
            if n_type is None:
                self.errors.append(
                    TypeCheckError(
                        type_name,
                        "The module doesn't export a type `%s`." % type_name.value,
                    )
                )
                return None
        else:
            n_type = self.get_type(type_name.value, err=err)
            if n_type is None:
                self.errors.append(
                    TypeCheckError(
                        module_type,
                        "I don't know what type you're referring to by `%s`."
                        % type_name.value,
                    )
                )
                return None
        if n_type == "invalid":
            return None
        else:
            return n_type

    def parse_type(self, tree_or_token, err=True):
        if isinstance(tree_or_token, lark.Tree):
            if tree_or_token.data == "with_typevars":
                module_type, *typevars = tree_or_token.children
                typevar_type = self.get_module_type(module_type, err=err)
                parsed_typevars = [
                    self.parse_type(typevar, err=err) for typevar in typevars
                ]
                if typevar_type is None:
                    return None
                elif isinstance(typevar_type, NAliasType) or isinstance(
                    typevar_type, NTypeVars
                ):
                    # Duck typing :sunglasses:
                    if len(typevars) < len(typevar_type.typevars):
                        self.errors.append(
                            TypeCheckError(
                                tree_or_token,
                                "%s expects %d type variable(s)."
                                % (
                                    display_type(typevar_type),
                                    len(typevar_type.typevars),
                                ),
                            )
                        )
                        return None
                    elif len(typevars) > len(typevar_type.typevars):
                        self.errors.append(
                            TypeCheckError(
                                tree_or_token,
                                "%s only expects %d type variable(s)."
                                % (
                                    display_type(typevar_type),
                                    len(typevar_type.typevars),
                                ),
                            )
                        )
                        return None
                    return (
                        typevar_type.with_typevars(parsed_typevars)
                        if None not in parsed_typevars
                        else None
                    )
                else:
                    self.errors.append(
                        TypeCheckError(
                            tree_or_token,
                            "%s doesn't take any type variables."
                            % display_type(typevar_type),
                        )
                    )
                    return None
            elif tree_or_token.data == "tupledef":
                tuple_type = [
                    self.parse_type(child, err=err) for child in tree_or_token.children
                ]
                return tuple_type if None not in tuple_type else None
            elif tree_or_token.data == "recorddef":
                record_type = {
                    entry.children[0].value: self.parse_type(entry.children[1], err=err)
                    for entry in tree_or_token.children
                }
                return record_type if None not in record_type.values() else None
            elif tree_or_token.data == "module_type":
                n_type = self.get_module_type(tree_or_token, err=err)
                if n_type is None:
                    return None
                elif (
                    isinstance(n_type, NAliasType) or isinstance(n_type, NTypeVars)
                ) and len(n_type.typevars) > 0:
                    self.errors.append(
                        TypeCheckError(
                            tree_or_token,
                            "%s expects %d type variables."
                            % (display_type(n_type), len(n_type.typevars)),
                        )
                    )
                    return None
                elif isinstance(n_type, NAliasType):
                    return n_type.with_typevars()
                return n_type
            elif tree_or_token.data == "func_type":
                func_types = tree_or_token.children
                if (
                    isinstance(func_types[0], lark.Tree)
                    and func_types[0].data == "generic_declaration"
                ):
                    generics, *func_types = func_types
                    scope = self.new_scope()
                    for generic in generics.children:
                        if generic.value in scope.types:
                            self.errors.append(
                                TypeCheckError(
                                    generic,
                                    "You already defined a generic type with this name.",
                                )
                            )
                        scope.types[generic.value] = NGenericType(generic.value)
                else:
                    scope = self
                func_type = tuple(
                    scope.parse_type(child, err=err) for child in func_types
                )
                if None in func_type:
                    return None
                # If the function type returns a function, flatten the entire
                # thing
                if isinstance(func_type[-1], tuple):
                    func_type = tuple([*func_type[0:-1], *func_type[-1]])
                return func_type
            elif err:
                raise NameError(
                    "Type annotation of type %s; I am not ready for this."
                    % tree_or_token.data
                )
            else:
                self.errors.append(
                    TypeCheckError(
                        tree_or_token,
                        "Internal problem: encountered a type annotation type %s."
                        % tree_or_token.data,
                    )
                )
                return None
        elif tree_or_token.type == "UNIT":
            return "unit"
        elif err:
            raise NameError(
                "Type annotation token of type %s; I am not ready for this."
                % tree_or_token.data
            )
        else:
            self.errors.append(
                TypeCheckError(
                    tree_or_token,
                    "Internal problem: encountered a type annotation token type %s."
                    % tree_or_token.data,
                )
            )
            return None

    def get_name_type(self, name_type, err=True, get_type=True):
        pattern = get_destructure_pattern(name_type.children[0])
        if len(name_type.children) == 1:
            # No type annotation given, so it's implied
            return pattern, "infer"
        else:
            return (
                pattern,
                self.parse_type(name_type.children[1], err) if get_type else "whatever",
            )

    """
    Sets variables from a pattern given a value or a type and returns whether
    the entire pattern matched.

    This is used by both type-checking (with warn=True) and interpreting
    (warn=False). During type-checking, `value_or_type` is the type (notably,
    tuples are lists), so it must determine whether it's even reasonable to
    destructure the type (for example, it doesn't make sense to destructure a
    record as a list), and error accordingly. During interpreting,
    `value_or_type` is the actual value, and thanks to the type-checker, the
    value should be guaranteed to fit the pattern.

    - warn=True - Is the pattern valid?
    - warn=False - Does the pattern match?

    Note that this sets variables while checking the pattern, so it's possible
    that variables are assigned even if the entire pattern doesn't match.
    Fortunately, this is only used in cases where the conditional let would
    create a new scope (such as in an if statement), so the extra variables can
    be discarded if the pattern ends up not matching.

    NOTE: This must return True if warn=True. (In other words, don't short
    circuit if a pattern fails to match.)
    """

    def assign_to_pattern(
        self,
        pattern_and_src,
        value_or_type,
        warn=False,
        path=None,
        public=False,
        certain=False,
    ):
        path_name = path or "the value"
        pattern, src = pattern_and_src
        if isinstance(pattern, dict):
            is_dict = isinstance(value_or_type, dict)
            if is_dict:
                # Should this be an error? Warning?
                unused_keys = [
                    key for key in value_or_type.keys() if key not in pattern
                ]
                if len(unused_keys) > 0:
                    self.errors.append(
                        TypeCheckError(
                            src,
                            "%s (%s) has field(s) %s, but you haven't destructured them. (Hint: use `_` to denote unused fields.)"
                            % (
                                display_type(value_or_type),
                                path_name,
                                ", ".join(unused_keys),
                            ),
                        )
                    )
            else:
                if warn:
                    if value_or_type is not None:
                        self.errors.append(
                            TypeCheckError(
                                src,
                                "I can't destructure %s as a record because %s is not a record."
                                % (path_name, display_type(value_or_type)),
                            )
                        )
                else:
                    raise TypeError("Destructuring non-record as record.")
            for key, (sub_pattern, parse_src) in pattern.items():
                value = value_or_type.get(key) if is_dict else None
                if is_dict and value is None:
                    if warn:
                        self.errors.append(
                            TypeCheckError(
                                parse_src,
                                "I can't get the field %s from %s because %s doesn't have that field."
                                % (key, path_name, display_type(value_or_type)),
                            )
                        )
                    else:
                        raise TypeError("Given record doesn't have a key %s." % key)
                valid = self.assign_to_pattern(
                    (sub_pattern, parse_src),
                    value,
                    warn,
                    "%s.%s" % (path or "<record>", key),
                    public,
                    certain=certain,
                )
                if not valid:
                    return False
        elif isinstance(pattern, tuple):
            # I believe the interpreter uses actual Python tuples, while the
            # type checker uses lists for tuple types. We should fix that for
            # the type checker.
            is_tuple = (
                isinstance(value_or_type, list)
                if warn
                else isinstance(value_or_type, tuple)
            )
            if not is_tuple:
                if warn:
                    if value_or_type is not None:
                        self.errors.append(
                            TypeCheckError(
                                src,
                                "I can't destructure %s as a tuple because %s is not a tuple."
                                % (path_name, display_type(value_or_type)),
                            )
                        )
                else:
                    raise TypeError("Destructuring non-record as record.")
            if is_tuple and len(pattern) != len(value_or_type):
                if warn:
                    if len(pattern) > len(value_or_type):
                        _, parse_src = pattern[len(value_or_type)]
                        self.errors.append(
                            TypeCheckError(
                                parse_src,
                                "I can't destructure %d items from a %s."
                                % (len(pattern), display_type(value_or_type)),
                            )
                        )
                    else:
                        self.errors.append(
                            TypeCheckError(
                                src,
                                "I can't destructure only %d items from a %s. (Hint: use `_` to denote unused members of a destructured tuple.)"
                                % (len(pattern), display_type(value_or_type)),
                            )
                        )
                else:
                    raise TypeError(
                        "Number of destructured values from tuple doesn't match tuple length."
                    )
            for i, (sub_pattern, parse_src) in enumerate(pattern):
                value = (
                    value_or_type[i] if is_tuple and i < len(value_or_type) else None
                )
                valid = self.assign_to_pattern(
                    (sub_pattern, parse_src),
                    value,
                    warn,
                    "%s.%d" % (path or "<tuple>", i),
                    public,
                    certain=certain,
                )
                if not valid:
                    return False
        elif isinstance(pattern, EnumPattern):
            if warn:
                problem = False
                if not isinstance(value_or_type, EnumType):
                    if value_or_type is not None:
                        self.errors.append(
                            TypeCheckError(
                                src,
                                "I cannot destructure %s as an enum because it's a %s."
                                % (path_name, display_type(value_or_type)),
                            )
                        )
                    problem = True
                else:
                    variant_types = value_or_type.get_types(pattern.variant)
                    if variant_types is None:
                        self.errors.append(
                            TypeCheckError(
                                src,
                                "%s has no variant %s because it's a %s."
                                % (
                                    path_name,
                                    pattern.variant,
                                    display_type(value_or_type),
                                ),
                            )
                        )
                        problem = True
                    elif len(pattern.patterns) < len(variant_types):
                        self.errors.append(
                            TypeCheckError(
                                src,
                                "Variant %s has %d fields, but you only destructure %d of them."
                                % (
                                    pattern.variant,
                                    len(variant_types),
                                    len(pattern.patterns),
                                ),
                            )
                        )
                        problem = True
                    elif len(pattern.patterns) > len(variant_types):
                        self.errors.append(
                            TypeCheckError(
                                pattern.patterns[len(variant_types)][1],
                                "Variant %s only has %d fields."
                                % (pattern.variant, len(variant_types)),
                            )
                        )
                        problem = True
            else:
                if not isinstance(value_or_type, EnumValue):
                    raise TypeError("Destructuring non-enum as enum.")
                elif pattern.variant != value_or_type.variant:
                    return False
            if warn and not problem and certain and len(value_or_type.variants) > 1:
                self.errors.append(
                    TypeCheckError(
                        src,
                        "I can't be sure that %s will be a `%s`; for example, it could instead be a `%s`."
                        % (
                            path_name,
                            pattern.variant,
                            (
                                value_or_type.variants[1]
                                if value_or_type.variants[0][0] == pattern.variant
                                else value_or_type.variants[0]
                            )[0],
                        ),
                    )
                )
                problem = True
            for i, (sub_pattern, parse_src) in enumerate(pattern.patterns):
                if warn:
                    value = None if problem else variant_types[i]
                else:
                    value = value_or_type.values[i]
                valid = self.assign_to_pattern(
                    (sub_pattern, parse_src),
                    value,
                    warn,
                    "%s.%s#%d" % (path or "<enum>", pattern.variant, i + 1),
                    public,
                    certain=certain,
                )
                if not valid:
                    return False
        elif isinstance(pattern, list):
            if warn:
                if (
                    not isinstance(value_or_type, NTypeVars)
                    or value_or_type.base_type is not n_list_type
                ):
                    if value_or_type is not None:
                        self.errors.append(
                            TypeCheckError(
                                src,
                                "I cannot destructure %s as a list because it's a %s."
                                % (path_name, display_type(value_or_type)),
                            )
                        )
                    return True
                contained_type = value_or_type.typevars[0]
            else:
                if not isinstance(value_or_type, list):
                    raise TypeError("Destructuring non-list as list.")
            if warn and certain:
                self.errors.append(
                    TypeCheckError(
                        src,
                        "I can't be sure that %s has exactly %d item(s); for example, it could instead %s."
                        % (
                            path_name,
                            len(pattern),
                            "have two items" if len(pattern) == 0 else "be empty",
                        ),
                    )
                )
            if not warn and len(value_or_type) != len(pattern):
                return False
            for i, (sub_pattern, parse_src) in enumerate(pattern):
                valid = self.assign_to_pattern(
                    (sub_pattern, parse_src),
                    contained_type if warn else value_or_type[i],
                    warn,
                    "%s[%d]" % (path or "<enum variant>", i),
                    public,
                    certain=certain,
                )
                if not valid:
                    return False
        elif pattern is not None:
            name = pattern
            if warn and name in self.variables:
                self.errors.append(
                    TypeCheckError(src, "You've already defined `%s`." % name)
                )
            self.variables[name] = Variable(value_or_type, value_or_type, public)
        return True

    async def eval_record_entry(self, entry):
        if isinstance(entry, lark.Tree):
            if entry.data == "spread":
                return [entry.children[0]]
            return entry.children[0].value, await self.eval_expr(entry.children[1])
        else:
            return entry.value, self.eval_value(entry)

    """
    Deals with spread operators for lists
    """

    def eval_spread_list(self, spread_tree, list_val):
        for val in self.get_variable(spread_tree.children[0]).value:
            list_val.append(val)

    def eval_value(self, value):
        if value.type == "HEX":
            return int(value.value, 16)
        if value.type == "BINARY":
            return int(value.value, 2)
        if value.type == "OCTAL":
            return int(value.value, 8)
        if value.type == "NUMBER":
            if "." in str(value.value):
                return float(value)
            return int(value)
        elif value.type == "STRING":
            return unescape(value[1:-1])
        elif value.type == "BOOLEAN":
            if value.value == "false":
                return False
            elif value.value == "true":
                return True
            else:
                raise SyntaxError("Unexpected boolean value %s" % value.value)
        elif value.type == "NAME":
            return self.get_variable(value.value).value
        elif value.type == "UNIT":
            return ()
        else:
            raise SyntaxError(
                "Unexpected value type %s value %s" % (value.type, value.value)
            )

    """
    Evaluate a parsed expression with Trees and Tokens from Lark.
    """

    async def eval_expr(self, expr):
        if isinstance(expr, lark.Token):
            return self.eval_value(expr)

        if expr.data == "ifelse_expr":
            condition, if_true, if_false = expr.children
            scope = self.new_scope()
            if condition.data == "conditional_let":
                pattern, value = condition.children
                if scope.assign_to_pattern(
                    get_destructure_pattern(pattern), await self.eval_expr(value)
                ):
                    return await scope.eval_expr(if_true)
                else:
                    return await scope.eval_expr(if_false)
            elif await self.eval_expr(condition):
                return await self.eval_expr(if_true)
            else:
                return await self.eval_expr(if_false)
        elif expr.data == "function_def" or expr.data == "anonymous_func":
            if expr.data == "function_def":
                arguments, returntype, codeblock = expr.children
            else:
                arguments, returntype, *codeblock = expr.children
                codeblock = lark.tree.Tree("code_block", codeblock)
            _, arguments = get_arguments(arguments)
            return Function(
                self,
                [self.get_name_type(arg, get_type=False) for arg in arguments],
                returntype,
                codeblock,
            )
        elif expr.data == "function_callback" or expr.data == "function_callback_pipe":
            if expr.data == "function_callback":
                function, *arguments = expr.children[0].children
            else:
                mainarg = expr.children[0]
                function, *arguments = expr.children[1].children
                arguments.append(mainarg)
            arg_values = []
            for arg in arguments:
                arg_values.append(await self.eval_expr(arg))
            if len(arg_values) == 0:
                arg_values = [()]
            func = await self.eval_expr(function)
            if not isinstance(func, NativeFunction):
                with open(self.file_path, "r", encoding="utf-8") as f:
                    self.stack_trace.append(
                        (
                            expr,
                            File(
                                f,
                                name=os.path.relpath(
                                    self.file_path, start=self.base_path
                                ),
                            ),
                        )
                    )
            return await func.run(arg_values)
        elif expr.data == "or_expression":
            left, _, right = expr.children
            return await self.eval_expr(left) or await self.eval_expr(right)
        elif expr.data == "and_expression":
            left, _, right = expr.children
            return await self.eval_expr(left) and await self.eval_expr(right)
        elif expr.data == "not_expression":
            _, value = expr.children
            return not await self.eval_expr(value)
        elif expr.data == "in_expression":
            left, _, right = expr.children
            return await self.eval_expr(left) in await self.eval_expr(right)
        elif expr.data == "compare_expression":
            # compare_expression chains leftwards. It's rather complex because it
            # chains but doesn't accumulate a value unlike addition. Also, there's a
            # lot of comparison operators.
            # For example, (1 = 2) = 3 (in code as `1 = 2 = 3`).
            left, comparison, right = expr.children
            if left.data == "compare_expression":
                # If left side is a comparison, it also needs to be true for the
                # entire expression to be true.
                if not await self.eval_expr(left):
                    return False
                # Use the left side's right value as the comparison value for this
                # comparison. For example, for `1 = 2 = 3`, where `1 = 2` is `left`,
                # we'll use `2`, which is `left`'s `right`.
                left = left.children[2]
            comparison = comparison.type
            if comparison == "EQUALS":
                return await self.eval_expr(left) == await self.eval_expr(right)
            elif comparison == "GORE":
                return await self.eval_expr(left) >= await self.eval_expr(right)
            elif comparison == "LORE":
                return await self.eval_expr(left) <= await self.eval_expr(right)
            elif comparison == "LESS":
                return await self.eval_expr(left) < await self.eval_expr(right)
            elif comparison == "GREATER":
                return await self.eval_expr(left) > await self.eval_expr(right)
            elif comparison == "NEQUALS":
                return await self.eval_expr(left) != await self.eval_expr(right)
            else:
                raise SyntaxError(
                    "Unexpected operation for compare_expression: %s" % comparison
                )
        elif expr.data == "sum_expression":
            left, operation, right = expr.children
            if operation.type == "ADD":
                return await self.eval_expr(left) + await self.eval_expr(right)
            elif operation.type == "SUBTRACT":
                return await self.eval_expr(left) - await self.eval_expr(right)
            else:
                raise SyntaxError(
                    "Unexpected operation for sum_expression: %s" % operation
                )
        elif expr.data == "product_expression":
            left, operation, right = expr.children
            if operation.type == "MULTIPLY":
                return await self.eval_expr(left) * await self.eval_expr(right)
            elif operation.type == "DIVIDE":
                dividend = await self.eval_expr(left)
                divisor = await self.eval_expr(right)
                if divisor == 0:
                    if isinstance(divisor, int):
                        # Division by zero for ints will safely return 0, like
                        # Elm. Alternatively, it could unrecoverably panic
                        # like Rust.
                        return 0
                    else:
                        # Conform with float standards for float division by
                        # zero.
                        if dividend == 0:
                            return float("nan")
                        # Distinguish between negative and positive zero
                        # https://stackoverflow.com/a/25338224
                        elif math.copysign(1, divisor) == -1:
                            return float("-inf")
                        else:
                            return float("inf")
                return dividend / divisor
            elif operation.type == "MODULO":
                return await self.eval_expr(left) % await self.eval_expr(right)
            elif operation.type == "SHIFTL":
                return await self.eval_expr(left) << await self.eval_expr(right)
            elif operation.type == "SHIFTR":
                return await self.eval_expr(left) >> await self.eval_expr(right)
            else:
                raise SyntaxError(
                    "Unexpected operation for product_expression: %s" % operation
                )
        elif expr.data == "exponent_expression":
            left, _, right = expr.children
            return await self.eval_expr(left) ** await self.eval_expr(right)
        elif expr.data == "unary_expression":
            operation, value = expr.children
            if operation.type == "SUBTRACT":
                return -await self.eval_expr(value)
            elif operation.type == "NOT":
                return not await self.eval_expr(value)
            else:
                raise SyntaxError(
                    "Unexpected operation for unary_expression: %s" % operation
                )
        elif expr.data == "char":
            val = expr.children[0]
            if isinstance(val, lark.Tree):
                if val.data == "hex_pattern":
                    hex_val = val.children[0]
                    hex_val.type = "HEX"
                    return chr(self.eval_value(hex_val))
                code = val.children[0].value
                if code == "n":
                    return "\n"
                elif code == "t":
                    return "\t"
                elif code == "r":
                    return "\r"
                elif code == "v":
                    return "\v"
                elif code == "0":
                    return "\0"
                elif code == "f":
                    return "\f"
                elif code == "b":
                    return "\b"
                else:
                    raise SyntaxError("Unexpected escape code: %s" % code)
            else:
                return val.value
        elif expr.data == "value":
            token_or_tree = expr.children[0]
            if isinstance(token_or_tree, lark.Tree):
                return await self.eval_expr(token_or_tree)
            else:
                return self.eval_value(token_or_tree)
        elif expr.data == "impn":
            if expr.children[0].type == "STRING":
                rel_file_path = unescape(expr.children[0].value[1:-1])
            else:
                # Support old syntax
                rel_file_path = expr.children[0].value + ".n"
            file_path = os.path.join(os.path.dirname(self.file_path), rel_file_path)
            with open(self.file_path, "r", encoding="utf-8") as f:
                self.stack_trace.append(
                    (
                        expr,
                        File(
                            f,
                            name=os.path.relpath(self.file_path, start=self.base_path),
                        ),
                    )
                )
            val = await eval_file(
                file_path,
                self.base_path,
                self.parent_imports + [os.path.normpath(self.file_path)],
            )
            self.stack_trace += val.stack_trace
            holder = {}
            for key in val.variables.keys():
                if val.variables[key].public:
                    holder[key] = val.variables[key].value
            unit_test_results[rel_file_path] += val.unit_tests[:]
            return NModule(rel_file_path, holder)
        elif expr.data == "record_access":
            return (await self.eval_expr(expr.children[0]))[expr.children[1].value]
        elif expr.data == "tupleval":
            values = []
            for e in expr.children:
                values.append(await self.eval_expr(e))
            return tuple(values)
        elif expr.data == "listval":
            values = []
            for e in expr.children:
                if isinstance(e, lark.Tree) and e.data == "spread":
                    self.eval_spread_list(e, values)
                else:
                    values.append(await self.eval_expr(e))
            return values
        elif expr.data == "recordval":
            record_type = {}
            spreads = []
            non_spread = {}
            for entry in expr.children:
                entry_val = await self.eval_record_entry(entry)
                if isinstance(entry_val, list):
                    spreads.append(self.get_variable(entry_val[0]).value)
                else:
                    name, val = entry_val
                    non_spread[name] = val
            for spread in spreads:
                for k in spread.keys():
                    record_type[k] = spread[k]
            for k in non_spread.keys():
                record_type[k] = non_spread[k]
            return record_type
        elif expr.data == "await_expression":
            value, _ = expr.children
            command = await self.eval_expr(value)
            _, using_await_future, cmd_resume_future = self.get_parent_function()
            if not using_await_future.done():
                using_await_future.set_result((True, None))
                await cmd_resume_future
            if isinstance(command, Cmd):
                return await command.eval()
            else:
                # Sometimes cmd functions will return the contained value if
                # they don't use await. That's fine because type checking will
                # allow it, but the interpreter doesn't know that.
                return command
        elif expr.data == "match":
            input_value, match_block = expr.children
            inp = await self.eval_expr(input_value)
            values = {}
            default = match_block.children[-1].children[-1]

            for match_value in match_block.children[0:-1]:
                match, value = match_value.children
                values[await self.eval_expr(match)] = value

            if inp in values:
                return await self.eval_expr(values[inp])

            return await self.eval_expr(default)
        else:
            print("(parse tree):", expr)
            raise SyntaxError("Unexpected command/expression type %s" % expr.data)

    """
    Evaluates a command given parsed Trees and Tokens from Lark.
    """

    async def eval_command(self, tree):
        if tree.data == "main_instruction" or tree.data == "last_instruction":
            tree = tree.children[0]
        if (
            tree.data == "if"
            or tree.data == "ifelse"
            or tree.data == "for"
            or tree.data == "for_legacy"
            or tree.data == "while"
        ):
            tree = lark.tree.Tree("instruction", [tree])
        elif tree.data == "code_block":
            exit, value = (False, None)
            for instruction in tree.children:
                exit, value = await self.eval_command(instruction)
                if exit:
                    return exit, value
            return exit, value
        elif tree.data != "instruction":
            raise SyntaxError("Command %s not implemented" % (tree.data))

        command = tree.children[0]

        if command.data == "imp":
            import_name = command.children[0].value
            lib = libraries["libraries." + import_name]
            self.variables[import_name] = Variable(
                None,
                NModule(
                    import_name,
                    {
                        key: NativeFunction.from_imported(
                            self, types, getattr(lib, key)
                        )
                        for key, types in lib._values().items()
                    },
                ),
            )
            try:
                lib._prepare(self)
            except AttributeError:
                # Apparently it's more Pythonic to use try/except than hasattr
                pass
        elif command.data == "for" or command.data == "for_legacy":
            var, iterable, code = command.children
            pattern, _ = self.get_name_type(var, get_type=False)
            if command.data == "for":
                iterval = await self.eval_expr(iterable)
            else:
                iterval = range(int(iterable))
            for i in iterval:
                scope = self.new_scope()

                scope.assign_to_pattern(pattern, i, certain=True)
                exit, value = await scope.eval_command(code)
                if exit == "continue":
                    continue
                if exit == "break":
                    return False, None
                if exit:
                    return True, value
        elif command.data == "while":
            var, code = command.children
            val = await self.eval_expr(var)
            while val:
                scope = self.new_scope()

                exit, value = await scope.eval_command(code)
                if exit == "continue":
                    val = await self.eval_expr(var)
                    continue
                if exit == "break":
                    return False, None
                if exit:
                    return True, value
                val = await self.eval_expr(var)
        elif command.data == "return":
            return (True, await self.eval_expr(command.children[0]))
        elif command.data == "break":
            return ("break", None)
        elif command.data == "continue":
            return ("continue", None)
        elif command.data == "declare":
            modifiers, name_type, value = command.children
            pattern, _ = self.get_name_type(name_type, get_type=False)
            public = any(modifier.type == "PUBLIC" for modifier in modifiers.children)
            self.assign_to_pattern(
                pattern, await self.eval_expr(value), False, None, public, certain=True
            )
        elif command.data == "vary":
            name, value = command.children
            self.get_variable(name.value).value = await self.eval_expr(value)
        elif command.data == "if":
            condition, body = command.children
            scope = self.new_scope()
            if condition.data == "conditional_let":
                pattern, value = condition.children
                yes = scope.assign_to_pattern(
                    get_destructure_pattern(pattern), await self.eval_expr(value)
                )
            else:
                yes = await self.eval_expr(condition)
            if yes:
                exit, value = await scope.eval_command(body)
                if exit:
                    return (exit, value)
        elif command.data == "ifelse":
            condition, if_true, if_false = command.children
            scope = self.new_scope()
            if condition.data == "conditional_let":
                pattern, value = condition.children
                yes = scope.assign_to_pattern(
                    get_destructure_pattern(pattern), await self.eval_expr(value)
                )
            else:
                yes = await self.eval_expr(condition)
            if yes:
                exit, value = await scope.eval_command(if_true)
            else:
                exit, value = await self.new_scope().eval_command(if_false)
            if exit:
                return (exit, value)
        elif command.data == "enum_definition":
            _, type_def, constructors = command.children
            type_name, *_ = type_def.children
            enum_type = NType(type_name.value)
            self.types[type_name.value] = enum_type
            for constructor in constructors.children:
                modifiers, constructor_name, *types = constructor.children
                public = any(
                    modifier.type == "PUBLIC" for modifier in modifiers.children
                )
                if len(types) >= 1:
                    self.variables[constructor_name] = NativeFunction(
                        self,
                        [("idk", arg_type) for arg_type in types],
                        enum_type,
                        EnumValue.construct(constructor_name),
                        public=public,
                    )
                else:
                    self.variables[constructor_name] = Variable(
                        enum_type, EnumValue(constructor_name), public=public
                    )
        elif command.data == "alias_definition":
            modifiers, alias_def, alias_raw_type = command.children
            alias_name, *_ = alias_def.children
            public = any(modifier.type == "PUBLIC" for modifier in modifiers.children)
            if (
                isinstance(alias_raw_type, lark.Tree)
                and alias_raw_type.data == "recorddef"
            ):
                if alias_name.value not in self.variables:
                    self.variables[alias_name.value] = NativeFunction(
                        self,
                        [("idk", "whatever")] * len(alias_raw_type.children),
                        "The alias return value, but types are removed at runtime",
                        lambda *args: {
                            entry.children[0].value: arg
                            for entry, arg in zip(alias_raw_type.children, args)
                        },
                        public=public,
                    )
        elif command.data == "class_definition":
            modifiers, name, class_args, class_body = command.children
            public = any(modifier.type == "PUBLIC" for modifier in modifiers.children)
            self.variables[name.value] = NConstructor(
                self,
                [
                    self.get_name_type(arg, get_type=False)
                    for arg in class_args.children
                ],
                class_body,
                public,
            )
        elif command.data == "assert":
            assert_type = command.children[0].children[0]
            assert_type = command.children[0].children[0]
            if assert_type.data == "assert_val":
                expr = await self.eval_expr(assert_type.children[0])
                self.unit_tests.append(
                    {
                        "hasPassed": expr,
                        "fileLine": command.line,
                        "unitTestType": "value",
                        "possibleTypes": none,
                    }
                )
            return (False, None)
        else:
            await self.eval_expr(command)

        # No return
        return (False, None)

    """
    A helper function to generalize getting a type name and its type variables,
    used by enum and type alias definitions. It also puts the type variables in
    a temporary scope so that the type definition can use them.
    """

    def get_name_typevars(self, type_def):
        type_name, *type_typevars = type_def.children
        if type_name.value in self.types:
            self.errors.append(
                TypeCheckError(
                    type_name, "You've already defined the type `%s`." % type_name.value
                )
            )
        scope = self.new_scope()
        typevars = []
        for typevar_name in type_typevars:
            typevar = NGenericType(typevar_name.value)
            if typevar_name.value in scope.types:
                self.errors.append(
                    TypeCheckError(
                        typevar_name,
                        "You've already used the generic type `%s`."
                        % typevar_name.value,
                    )
                )
            scope.types[typevar_name.value] = typevar
            typevars.append(typevar)
        return type_name, scope, typevars

    def get_record_entry_type(self, entry):
        if isinstance(entry, lark.Tree):
            if entry.data == "spread":
                return [entry.children[0]]
            return entry.children[0].value, self.type_check_expr(entry.children[1])
        else:
            return entry.value, self.get_value_type(entry)

    def get_value_type(self, value):
        if isinstance(value, lark.Tree):
            if value.data == "char":
                return "char"
        if value.type == "HEX" or value.type == "BINARY" or value.type == "OCTAL":
            return "int"
        if value.type == "NUMBER":
            if "." in str(value.value):
                return "float"
            return "int"
        elif value.type == "STRING":
            return "str"
        elif value.type == "BOOLEAN":
            return "bool"
        elif value.type == "NAME":
            variable = self.get_variable(value.value, err=False)
            if variable is None:
                self.errors.append(
                    TypeCheckError(value, "You haven't yet defined %s." % value.value)
                )
                return None
            else:
                return variable.type
        elif value.type == "UNIT":
            return "unit"

        self.errors.append(
            TypeCheckError(
                value, "Internal problem: I don't know the value type %s." % value.type
            )
        )

    """
    Type checks spread operators for lists
    """

    def type_check_spread_list(self, spread_tree):
        spread_var = self.get_variable(spread_tree.children[0], err=False)
        if spread_var == None:
            self.errors.append(
                TypeCheckError(
                    spread_tree.children[0],
                    "The variable %s does not exist in this scope"
                    % spread_tree.children[0],
                )
            )
            return None
        if not isinstance(spread_var.type, NTypeVars):
            self.errors.append(
                TypeCheckError(
                    spread_tree.children[0],
                    "The .. operator cannot be uses on a non-list type inside a list",
                )
            )
            return None
        if spread_var.type.name != "list":
            self.errors.append(
                TypeCheckError(
                    spread_tree.children[0],
                    "The .. operator cannot be uses on a non-list type inside a list",
                )
            )
            return None
        return spread_var.type.typevars[0]

    """
    Type checks an expression and returns its type.
    """

    def type_check_expr(self, expr):
        if isinstance(expr, lark.Token):
            return self.get_value_type(expr)

        if expr.data == "ifelse_expr":
            condition, if_true, if_false = expr.children
            scope = self.new_scope()
            elsescope = self.new_scope()
            if condition.data == "conditional_let":
                pattern, value = condition.children
                eval_type = self.type_check_expr(value)
                scope.assign_to_pattern(
                    get_destructure_pattern(pattern), eval_type, True
                )
            else:
                cond_type = self.type_check_expr(condition)
                if cond_type is not None and cond_type != "bool":
                    self.errors.append(
                        TypeCheckError(
                            condition,
                            "The condition here should be a boolean, not a %s."
                            % display_type(cond_type),
                        )
                    )
            if_true_type = scope.type_check_expr(if_true)
            if_false_type = elsescope.type_check_expr(if_false)
            if if_true_type is None or if_false_type is None:
                return None
            return_type, incompatible = resolve_equal_types(if_true_type, if_false_type)
            if incompatible:
                self.errors.append(
                    TypeCheckError(
                        expr,
                        "The branches of the if-else expression should have the same type, but the true branch has type %s while the false branch has type %s."
                        % (display_type(if_true_type), display_type(if_false_type)),
                    )
                )
                return None
            if isinstance(condition.children[0], lark.Token):
                if condition.children[0].value == "true":
                    self.warnings.append(
                        TypeCheckError(
                            condition,
                            "The else statement of the expression will never run.",
                        )
                    )
                if condition.children[0].value == "false":
                    self.warnings.append(
                        TypeCheckError(
                            condition,
                            "The if statement of the expression will never run.",
                        )
                    )
            return return_type
        elif expr.data == "function_def" or expr.data == "anonymous_func":
            if expr.data == "function_def":
                arguments, returntype, codeblock = expr.children
            else:
                arguments, returntype, *cb = expr.children
                codeblock = lark.tree.Tree("code_block", cb)
            generic_types = []
            generics, arguments = get_arguments(arguments)
            wrap_scope = self.new_scope()
            for generic in generics:
                if generic.value in wrap_scope.types:
                    self.errors.append(
                        TypeCheckError(
                            generic,
                            "You already defined a generic type with this name.",
                        )
                    )
                generic_type = NGenericType(generic.value)
                wrap_scope.types[generic.value] = generic_type
                generic_types.append(generic_type)
            arguments = [wrap_scope.get_name_type(arg, err=False) for arg in arguments]
            dummy_function = Function(
                self,
                arguments,
                wrap_scope.parse_type(returntype, err=False),
                codeblock,
                generic_types,
            )
            scope = wrap_scope.new_scope(parent_function=dummy_function)
            for arg_pattern, arg_type in arguments:
                scope.assign_to_pattern(arg_pattern, arg_type, True, certain=True)
            returnvalue = scope.type_check_command(codeblock)
            if returnvalue is None:
                _, incompatible = resolve_equal_types(dummy_function.returntype, "unit")
                if n_cmd_type.is_type(dummy_function.returntype):
                    if incompatible:
                        _, incompatible = resolve_equal_types(
                            dummy_function.returntype.typevars[0], "unit"
                        )
                    if incompatible:
                        self.errors.append(
                            TypeCheckError(
                                codeblock,
                                "The function return type of a %s or a %s is unable to support the default return of %s [maybe you forgot a return]."
                                % (
                                    display_type(dummy_function.returntype),
                                    display_type(dummy_function.returntype.typevars[0]),
                                    display_type("unit"),
                                ),
                            )
                        )
                elif incompatible:
                    self.errors.append(
                        TypeCheckError(
                            codeblock,
                            "The function return type of a %s is unable to support the default return of %s [maybe you forgot a return]."
                            % (
                                display_type(dummy_function.returntype),
                                display_type("unit"),
                            ),
                        )
                    )
            return dummy_function.type
        elif expr.data == "function_callback" or expr.data == "function_callback_pipe":
            if expr.data == "function_callback":
                function, *arguments = expr.children[0].children
            else:
                mainarg = expr.children[0]
                function, *arguments = expr.children[1].children
                arguments.append(mainarg)

            if len(arguments) == 0:
                arguments.append("unit")
            func_type = self.type_check_expr(function)
            if func_type is None:
                return None
            if not isinstance(func_type, tuple):
                self.errors.append(
                    TypeCheckError(
                        expr,
                        "You tried to call a %s, which isn't a function."
                        % display_type(func_type),
                    )
                )
                return None
            *arg_types, return_type = func_type
            generics = {}
            parameters_have_none = False
            for n, (argument, arg_type) in enumerate(
                zip(arguments, arg_types), start=1
            ):
                check_type = argument
                if argument != "unit":
                    check_type = self.type_check_expr(check_type)
                if check_type is None:
                    parameters_have_none = True
                resolved_arg_type = apply_generics(arg_type, check_type, generics)
                _, incompatible = resolve_equal_types(check_type, resolved_arg_type)
                if incompatible:
                    if expr.data == "function_callback":
                        self.errors.append(
                            TypeCheckError(
                                argument,
                                "%s's argument #%d should be a %s, but you gave a %s."
                                % (
                                    display_type(func_type),
                                    n,
                                    display_type(resolved_arg_type),
                                    display_type(check_type),
                                ),
                            )
                        )
                    else:
                        if n == len(arguments):
                            self.errors.append(
                                TypeCheckError(
                                    argument,
                                    "This left operand of |>, which I pass as the last argument to %s, should be a %s, but you gave a %s."
                                    % (
                                        display_type(func_type),
                                        display_type(resolved_arg_type),
                                        display_type(check_type),
                                    ),
                                )
                            )
                        else:
                            self.errors.append(
                                TypeCheckError(
                                    argument,
                                    "The argument #%d here should be a %s because the function is a %s, but you gave a %s."
                                    % (
                                        n,
                                        display_type(resolved_arg_type),
                                        display_type(func_type),
                                        display_type(check_type),
                                    ),
                                )
                            )
            if len(arguments) > len(arg_types):
                self.errors.append(
                    TypeCheckError(
                        expr,
                        "A %s has %d argument(s), but you gave %d."
                        % (display_type(func_type), len(arg_types), len(arguments)),
                    )
                )
                return None
            elif len(arguments) < len(arg_types):
                return tuple(
                    apply_generics_to(arg_type, generics)
                    for arg_type in func_type[len(arguments) :]
                )
            elif parameters_have_none and len(generics) > 0:
                # If one of the parameters is none, the generics likely did not
                # get assigned correctly, so the function's return type is
                # unknown.
                return None
            else:
                return apply_generics_to(return_type, generics)
        elif expr.data == "value":
            token_or_tree = expr.children[0]
            if isinstance(token_or_tree, lark.Tree):
                if token_or_tree.data != "char":
                    return self.type_check_expr(token_or_tree)
                else:
                    return self.get_value_type(token_or_tree)
            else:
                return self.get_value_type(token_or_tree)
        elif expr.data == "record_access":
            value, field = expr.children
            value_type = self.type_check_expr(value)
            if value_type is None:
                return None
            elif not isinstance(value_type, dict):
                self.errors.append(
                    TypeCheckError(
                        value,
                        "You can only get fields from records, not %s."
                        % display_type(value_type),
                    )
                )
                return None
            elif field.value not in value_type:
                self.errors.append(
                    TypeCheckError(
                        expr,
                        "%s doesn't have a field `%s`."
                        % (display_type(value_type), field.value),
                    )
                )
                return None
            else:
                return value_type[field.value]
        elif expr.data == "await_expression":
            value, _ = expr.children
            value_type = self.type_check_expr(value)
            contained_type = None
            if n_cmd_type.is_type(value_type):
                contained_type = value_type.typevars[0]
            elif value_type is not None:
                self.errors.append(
                    TypeCheckError(
                        expr,
                        "You can only use the await operator on cmds, not %s."
                        % display_type(value_type),
                    )
                )
            parent_function = self.get_parent_function()
            if parent_function is None:
                self.errors.append(
                    TypeCheckError(
                        expr, "You can't use the await operator outside a function."
                    )
                )
            elif parent_function.returntype is not None and not n_cmd_type.is_type(
                parent_function.returntype
            ):
                self.errors.append(
                    TypeCheckError(
                        expr,
                        "You can only use the await operator in a function that returns a cmd, but the surrounding function returns a %s."
                        % display_type(parent_function.returntype),
                    )
                )
            return contained_type
        elif expr.data == "match":
            input_value, match_block = expr.children
            value_type = self.type_check_expr(input_value)
            first_match, first_value = match_block.children[0].children
            first_match_type = self.type_check_expr(first_match)
            first_value_type = self.type_check_expr(first_value)
            for i, match_value in enumerate(match_block.children):
                match, value = match_value.children
                if (
                    i != len(match_block.children) - 1
                    and self.type_check_expr(match) != first_match_type
                    and self.type_check_expr(match) != None
                ):
                    self.errors.append(
                        TypeCheckError(
                            match_value,
                            "The match check #%s's type is %s while the first check's type is %s"
                            % (
                                str(i + 1),
                                display_type(self.type_check_expr(match)),
                                display_type(first_match_type),
                            ),
                        )
                    )
                if (
                    self.type_check_expr(value) != first_value_type
                    and self.type_check_expr(match) != None
                ):
                    self.errors.append(
                        TypeCheckError(
                            match_value,
                            "The match value #%s's type is %s while the first value's type is %s"
                            % (
                                str(i + 1),
                                display_type(self.type_check_expr(value)),
                                display_type(first_value_type),
                            ),
                        )
                    )

            if value_type != first_match_type:
                self.errors.append(
                    TypeCheckError(
                        input_value,
                        "The input value's type is %s while the match's input type is %s"
                        % (display_type(value_type), display_type(first_match_type)),
                    )
                )
            return first_match_type
        if len(expr.children) == 2 and isinstance(expr.children[0], lark.Token):
            operation, value = expr.children
            operation_type = operation.type
            if operation_type == "NOT_KW":
                operation_type = "NOT"
            types = unary_operation_types.get(operation_type)
            if types:
                value_type = self.type_check_expr(value)
                if value_type is None:
                    return None
                # Treating each operation like a function until one of their
                # types matches the operands' types.
                for operand_type, result_type in types:
                    generics = {}
                    resolved_type = apply_generics(operand_type, value_type, generics)
                    _, incompatible = resolve_equal_types(value_type, resolved_type)
                    if incompatible:
                        continue
                    return apply_generics_to(result_type, generics)
                self.errors.append(
                    TypeCheckError(
                        expr,
                        "I don't know how to use %s on a %s."
                        % (operation.type, display_type(value_type)),
                    )
                )
                return None

        # For now, we assert that both operands are of the same time. In the
        # future, when we add traits for operations, this assumption may no
        # longer hold.
        if len(expr.children) == 3 and isinstance(expr.children[1], lark.Token):
            left, operation, right = expr.children
            types = binary_operation_types.get(operation.type)
            if types:
                left_type = self.type_check_expr(left)
                right_type = self.type_check_expr(right)
                # If either operand's type is None, we can't be sure what the
                # result type could be. (Could it be str + char? or str + str?)
                if left_type is None or right_type is None:
                    return None
                # Treating each operation like a function until one of their
                # types matches the operands' types.
                for left_operand_type, right_operand_type, result_type in types:
                    generics = {}
                    resolved_type = apply_generics(
                        left_operand_type, left_type, generics
                    )
                    _, incompatible = resolve_equal_types(left_type, resolved_type)
                    if incompatible:
                        continue
                    resolved_type = apply_generics(
                        right_operand_type, right_type, generics
                    )
                    _, incompatible = resolve_equal_types(right_type, resolved_type)
                    if incompatible:
                        continue
                    return apply_generics_to(result_type, generics)
                self.errors.append(
                    TypeCheckError(
                        expr,
                        "I don't know how to use %s on a %s and %s."
                        % (
                            operation.type,
                            display_type(left_type),
                            display_type(right_type),
                        ),
                    )
                )
                return None
            elif expr.data == "compare_expression":
                left, comparison, right = expr.children
                if left.data == "compare_expression":
                    # We'll assume that any type errors will have been logged,
                    # so this can only return 'bool' or None. We don't care
                    # either way.
                    self.type_check_expr(left)
                    # We don't want to report errors twice, so we create a new
                    # scope to store the errors, then discard the scope.
                    scope = self.new_scope()
                    scope.errors = []
                    scope.warnings = []
                    left_type = scope.type_check_expr(left.children[2])
                else:
                    left_type = self.type_check_expr(left)
                right_type = self.type_check_expr(right)
                resolved_type, incompatible = resolve_equal_types(left_type, right_type)
                if incompatible:
                    self.errors.append(
                        TypeCheckError(
                            comparison,
                            "I can't compare %s and %s because they aren't the same type. You know they won't ever be equal."
                            % (display_type(left_type), display_type(right_type)),
                        )
                    )
                if (
                    comparison.type != "EQUALS"
                    and comparison.type != "NEQUALS"
                    and comparison.type != "NEQUALS_QUIRKY"
                ):
                    if (
                        resolved_type is not None
                        and resolved_type not in comparable_types
                    ):
                        self.errors.append(
                            TypeCheckError(
                                comparison,
                                "I don't know how to compare %s."
                                % display_type(resolved_type),
                            )
                        )
                # We don't return None even if there are errors because we know
                # for sure that comparison operators return a boolean.
                return "bool"

        elif expr.data == "tupleval":
            return [self.type_check_expr(e) for e in expr.children]
        elif expr.data == "listval":
            if len(expr.children) == 0:
                return n_list_type

            first, *rest = [
                self.type_check_spread_list(e)
                if isinstance(e, lark.Tree) and e.data == "spread"
                else self.type_check_expr(e)
                for e in expr.children
            ]
            contained_type = first

            for i, item_type in enumerate(rest):
                resolved_contained_type, incompatible = resolve_equal_types(
                    contained_type, item_type
                )
                if incompatible:
                    self.errors.append(
                        TypeCheckError(
                            expr.children[i + 1],
                            "The list item #%s's type is %s while the first item's type is %s"
                            % (i + 2, display_type(item_type), display_type(first)),
                        )
                    )
                elif resolved_contained_type is not None:
                    # To deal with cases like [[], [3]] as list[int]
                    contained_type = resolved_contained_type

            if contained_type is None:
                return None
            else:
                return n_list_type.with_typevars([contained_type])
        elif expr.data == "impn":
            if expr.children[0].type == "STRING":
                rel_file_path = unescape(expr.children[0].value[1:-1])
            else:
                # Support old syntax
                rel_file_path = expr.children[0].value + ".n"
            file_path = os.path.join(os.path.dirname(self.file_path), rel_file_path)
            if os.path.normpath(file_path) == os.path.normpath(self.file_path):
                self.errors.append(
                    TypeCheckError(
                        expr.children[0], "You cannot import the file that is running"
                    )
                )
                return None
            if os.path.isfile(file_path):
                if os.path.normpath(file_path) in self.parent_imports:
                    self.errors.append(
                        TypeCheckError(
                            expr.children[0], "Circular imports are not allowed"
                        )
                    )
                    return None
                impn, f = type_check_file(
                    file_path,
                    self.base_path,
                    self.parent_imports + [os.path.normpath(self.file_path)],
                )
                if len(impn.errors) != 0:
                    self.errors.append(ImportedError(impn.errors[:], f))
                if len(impn.warnings) != 0:
                    self.warnings.append(ImportedError(impn.warnings[:], f))
                holder = {}
                for key in impn.variables.keys():
                    if impn.variables[key].public:
                        holder[key] = impn.variables[key].type
                if holder == {}:
                    self.warnings.append(
                        TypeCheckError(
                            expr.children[0],
                            "There was nothing to import from %s" % expr.children[0],
                        )
                    )
                unit_test_results[rel_file_path] = impn.unit_tests[:]
                return NModule(rel_file_path, holder, types=impn.public_types)
            else:
                self.errors.append(
                    TypeCheckError(
                        expr.children[0], "The file %s does not exist" % rel_file_path
                    )
                )
                return None
        elif expr.data == "recordval":
            record_type = {}
            spreads = []
            non_spread = {}
            for entry in expr.children:
                entry_val = self.get_record_entry_type(entry)
                if isinstance(entry_val, list):
                    spread_var = self.get_variable(entry_val[0], err=False)
                    if spread_var == None:
                        self.errors.append(
                            TypeCheckError(
                                entry_val[0],
                                "The variable %s does not exist in this scope"
                                % entry_val[0],
                            )
                        )
                        return None
                    if not isinstance(spread_var.type, dict):
                        self.errors.append(
                            TypeCheckError(
                                entry_val[0],
                                "The .. operator cannot be uses on a non-record type inside a record",
                            )
                        )
                        return None
                    spreads.append(spread_var.type)
                else:
                    name, val = entry_val
                    non_spread[name] = val
            for spread in spreads:
                for k in spread.keys():
                    record_type[k] = spread[k]
            for k in non_spread.keys():
                record_type[k] = non_spread[k]
            if None in record_type.values():
                return None
            else:
                return record_type
        self.errors.append(
            TypeCheckError(
                expr,
                "Internal problem: I don't know the command/expression type %s."
                % expr.data,
            )
        )
        return None

    """
    Type checks a command. Returns whether any code will run after the command
    to determine if any code is unreachable.
    """

    def type_check_command(self, tree):
        if tree.data == "main_instruction" or tree.data == "last_instruction":
            tree = tree.children[0]
        if (
            tree.data == "if"
            or tree.data == "ifelse"
            or tree.data == "for"
            or tree.data == "for_legacy"
            or tree.data == "while"
        ):
            tree = lark.tree.Tree("instruction", [tree])
        elif tree.data == "code_block":
            exit_point = None
            warned = False
            for instruction in tree.children:
                exit = self.type_check_command(instruction)
                if exit and exit_point is None:
                    exit_point = exit
                elif exit_point and not warned:
                    warned = True
                    self.warnings.append(
                        TypeCheckError(
                            exit_point,
                            "There are commands after this return statement, but I will never run them.",
                        )
                    )
            parent_function = self.get_parent_function()
            return exit_point
        elif tree.data != "instruction":
            self.errors.append(
                TypeCheckError(
                    tree,
                    "Internal problem: I only deal with instructions, not %s."
                    % tree.data,
                )
            )
            return False

        command = tree.children[0]

        if command.data == "imp":
            import_name = command.children[0].value
            import_type = None
            if import_name in self.variables:
                self.errors.append(
                    TypeCheckError(
                        command.children[0],
                        "You've already used the name `%s`." % import_name,
                    )
                )
            try:
                imp = libraries["libraries." + command.children[0].value]
                types = {}
                try:
                    types = imp._types()
                except AttributeError:
                    pass
                import_type = NModule(import_name, imp._values(), types=types)
            except AttributeError:
                self.errors.append(
                    TypeCheckError(
                        command.children[0],
                        "`%s` isn't a compatible native library." % command.children[0],
                    )
                )
            except KeyError:
                self.errors.append(
                    TypeCheckError(
                        command.children[0],
                        "I can't find the native library `%s`." % command.children[0],
                    )
                )
            self.variables[import_name] = Variable(import_type, import_type)
        elif command.data == "for" or command.data == "for_legacy":
            if command.data == "for_legacy":
                iterable_types_src = legacy_iterable_types
                self.warnings.append(
                    TypeCheckError(command, "This syntax is decapricated.")
                )
            else:
                iterable_types_src = iterable_types
            var, iterable, code = command.children
            pattern, ty = self.get_name_type(var, err=False)
            iterable_type = self.type_check_expr(iterable)
            iterated_type = None
            for ideal_iterable_type, ideal_iterated_type in iterable_types_src:
                # Treating iteration like a function until one of their types
                # matches the iterable's types.
                generics = {}
                resolved_type = apply_generics(
                    ideal_iterable_type, iterable_type, generics
                )
                _, incompatible = resolve_equal_types(iterable_type, resolved_type)
                if incompatible:
                    continue
                iterated_type = apply_generics_to(ideal_iterated_type, generics)
            if iterable_type is not None:
                if iterated_type is None:
                    self.errors.append(
                        TypeCheckError(
                            iterable,
                            "I can't loop over a %s." % display_type(iterable_type),
                        )
                    )
                elif ty == "infer":
                    ty = iterated_type
                elif ty != iterated_type:
                    self.errors.append(
                        TypeCheckError(
                            ty,
                            "Looping over a %s produces %s values, not %s."
                            % (
                                display_type(iterable_type),
                                display_type(iterated_type),
                                display_type(ty),
                            ),
                        )
                    )
            scope = self.new_scope(parent_type="for")
            scope.assign_to_pattern(pattern, ty, True, certain=True)
            return scope.type_check_command(code)
        elif command.data == "while":
            var, code = command.children
            bool_type = self.type_check_expr(var)
            if bool_type != "bool":
                self.errors.append(
                    TypeCheckError(
                        iterable,
                        "I need a bool not a %s." % display_type(bool_type),
                    )
                )
            scope = self.new_scope(parent_type="while")
            return scope.type_check_command(code)
        elif command.data == "return":
            return_type = self.type_check_expr(command.children[0])
            parent_function = self.get_parent_function()
            if parent_function is None:
                self.errors.append(
                    TypeCheckError(command, "You can't return outside a function.")
                )
            else:
                # e.g. return []
                _, incompatible = resolve_equal_types(
                    parent_function.returntype, return_type
                )
                if n_cmd_type.is_type(parent_function.returntype):
                    if incompatible:
                        _, incompatible = resolve_equal_types(
                            parent_function.returntype.typevars[0], return_type
                        )
                    if incompatible:
                        self.errors.append(
                            TypeCheckError(
                                command.children[0],
                                "You returned a %s, but the function is supposed to return a %s or a %s."
                                % (
                                    display_type(return_type),
                                    display_type(parent_function.returntype),
                                    display_type(
                                        parent_function.returntype.typevars[0]
                                    ),
                                ),
                            )
                        )
                elif incompatible:
                    self.errors.append(
                        TypeCheckError(
                            command.children[0],
                            "You returned a %s, but the function is supposed to return a %s."
                            % (
                                display_type(return_type),
                                display_type(parent_function.returntype),
                            ),
                        )
                    )
            return command
        elif command.data == "continue":
            if self.get_parent_types(["while", "for"]) == None:
                self.errors.append(
                    TypeCheckError(
                        command,
                        "The command continue can only be used inside while or for loops",
                    )
                )
            return command
        elif command.data == "break":
            if self.get_parent_types(["while", "for", "if"]) == None:
                self.errors.append(
                    TypeCheckError(
                        command,
                        "The command continue can only be used inside if statements or while or for loops",
                    )
                )
            return command
        elif command.data == "declare":
            modifiers, name_type, value = command.children
            pattern, ty = self.get_name_type(name_type, err=False)
            name = pattern_to_name(pattern)

            value_type = self.type_check_expr(value)
            resolved_value_type = apply_generics(value_type, ty)
            if ty == "infer":
                ty = resolved_value_type
            else:
                _, incompatible = resolve_equal_types(ty, resolved_value_type)
                if incompatible:
                    self.errors.append(
                        TypeCheckError(
                            value,
                            "You set %s, which is defined to be a %s, to what evaluates to a %s."
                            % (name, display_type(ty), display_type(value_type)),
                        )
                    )

            public = any(modifier.type == "PUBLIC" for modifier in modifiers.children)
            self.assign_to_pattern(pattern, ty, True, None, public, certain=True)
        elif command.data == "vary":
            name, value = command.children
            variable = self.get_variable(name.value, err=False)
            if variable is None:
                self.errors.append(
                    TypeCheckError(
                        name, "The variable `%s` does not exist." % (name.value)
                    )
                )
            else:
                ty = variable.type
                value_type = self.type_check_expr(value)

                # Allow for cases like
                # let empty = [] // empty has type list[t]
                # NOTE: At this point, `empty` can be used, for example, as an
                # argument that expects list[int]. This might be a bug.
                # var empty = ["wow"] // empty now is known to have type
                # list[str]
                resolved_type, incompatible = resolve_equal_types(ty, value_type)
                if incompatible:
                    self.errors.append(
                        TypeCheckError(
                            value,
                            "You set %s, which is defined to be a %s, to what evaluates to a %s."
                            % (name, display_type(ty), display_type(value_type)),
                        )
                    )
                variable.type = resolved_type
        elif command.data == "if":
            condition, body = command.children
            scope = self.new_scope(parent_type="if")
            if condition.data == "conditional_let":
                pattern, value = condition.children
                eval_type = self.type_check_expr(value)
                scope.assign_to_pattern(
                    get_destructure_pattern(pattern), eval_type, True
                )
            else:
                cond_type = self.type_check_expr(condition)
                if isinstance(condition.children[0], lark.Token):
                    if condition.children[0].value == "true":
                        self.warnings.append(
                            TypeCheckError(condition, "This will always run.")
                        )
                    if condition.children[0].value == "false":
                        self.warnings.append(
                            TypeCheckError(condition, "This will never run.")
                        )
                if cond_type is not None and cond_type != "bool":
                    self.errors.append(
                        TypeCheckError(
                            condition,
                            "The condition here should be a boolean, not a %s."
                            % display_type(cond_type),
                        )
                    )
            scope.type_check_command(body)
        elif command.data == "ifelse":
            condition, if_true, if_false = command.children
            scope = self.new_scope(parent_type="if")
            elsescope = self.new_scope(parent_type="if")
            if condition.data == "conditional_let":
                pattern, value = condition.children
                eval_type = self.type_check_expr(value)
                scope.assign_to_pattern(
                    get_destructure_pattern(pattern), eval_type, True
                )
            else:
                cond_type = self.type_check_expr(condition)
                if isinstance(condition.children[0], lark.Token):
                    if condition.children[0].value == "true":
                        self.warnings.append(
                            TypeCheckError(
                                condition,
                                "The else statement of the expression will never run.",
                            )
                        )
                    if condition.children[0].value == "false":
                        self.warnings.append(
                            TypeCheckError(
                                condition,
                                "The if statement of the expression will never run.",
                            )
                        )
                if cond_type is not None and cond_type != "bool":
                    self.errors.append(
                        TypeCheckError(
                            condition,
                            "The condition here should be a boolean, not a %s."
                            % display_type(cond_type),
                        )
                    )
            exit_if_true = scope.type_check_command(if_true)
            exit_if_false = elsescope.type_check_command(if_false)
            if exit_if_true and exit_if_false:
                return command
        elif command.data == "enum_definition":
            modifiers, type_def, constructors = command.children
            type_name, scope, typevars = self.get_name_typevars(type_def)
            variants = []
            enum_type = EnumType(type_name.value, variants, typevars)
            self.types[type_name] = enum_type
            if any(modifier.type == "PUBLIC" for modifier in modifiers.children):
                self.public_types[type_name] = self.types[type_name]
            for constructor in constructors.children:
                modifiers, constructor_name, *types = constructor.children
                public = any(
                    modifier.type == "PUBLIC" for modifier in modifiers.children
                )
                types = [
                    scope.parse_type(type_token, err=False) for type_token in types
                ]
                variants.append((constructor_name.value, types))
                if constructor_name.value in self.variables:
                    self.errors.append(
                        TypeCheckError(
                            constructor_name,
                            "You've already defined `%s` in this scope."
                            % constructor_name.value,
                        )
                    )
                if len(types) >= 1:
                    self.variables[constructor_name.value] = NativeFunction(
                        self,
                        [("idk", arg_type) for arg_type in types],
                        enum_type,
                        id,
                        public=public,
                    )
                else:
                    self.variables[constructor_name.value] = Variable(
                        enum_type, "I don't think this is used", public=public
                    )
        elif command.data == "alias_definition":
            modifiers, alias_def, alias_raw_type = command.children
            alias_name, scope, typevars = self.get_name_typevars(alias_def)
            alias_type = scope.parse_type(alias_raw_type, err=False)
            if alias_type is None:
                self.types[alias_name] = "invalid"
            else:
                self.types[alias_name] = NAliasType(
                    alias_name.value, alias_type, typevars
                )
            public = any(modifier.type == "PUBLIC" for modifier in modifiers.children)
            if public:
                self.public_types[alias_name] = self.types[alias_name]
            if (
                isinstance(alias_raw_type, lark.Tree)
                and alias_raw_type.data == "recorddef"
                and isinstance(alias_type, dict)
            ):
                if alias_name in self.variables:
                    self.warnings.append(
                        TypeCheckError(
                            alias_def,
                            "Type aliases for records now declare constructor functions, but `%s` already exists. In the future, this may become an error."
                            % alias_name,
                        )
                    )
                else:
                    self.variables[alias_name] = Variable(
                        tuple(alias_type.values()) + (alias_type,),
                        "I don't think this is used",
                        public=public,
                    )
        elif command.data == "class_definition":
            modifiers, name, class_args, class_body = command.children
            public = any(modifier.type == "PUBLIC" for modifier in modifiers.children)

            generics, class_args = get_arguments(class_args)
            if len(generics) > 0:
                self.errors.append(
                    TypeCheckError(
                        class_args.children[0], "Classes do not support generic types."
                    )
                )
                return False

            arguments = [self.get_name_type(arg, err=False) for arg in class_args]

            class_type = NClass(name)

            constructor_type = tuple(
                [*(arg_type for _, arg_type in arguments), class_type]
            )

            scope = self.new_scope(
                parent_function=None, inherit_errors=False, parent_type="class"
            )
            for arg_pattern, arg_type in arguments:
                scope.assign_to_pattern(arg_pattern, arg_type, True, certain=True)
            scope.type_check_command(class_body)

            for prop_name, var in scope.variables.items():
                if var.public:
                    class_type[prop_name] = var.type

            if name.value in self.types:
                scope.errors.append(
                    TypeCheckError(
                        name,
                        "You've already defined the `%s` type in this scope."
                        % name.value,
                    )
                )
            self.types[name.value] = class_type
            if public:
                self.public_types[name.value] = self.types[name.value]

            if name.value in self.variables:
                scope.errors.append(
                    TypeCheckError(
                        name, "You've already defined `%s` in this scope." % name.value
                    )
                )
            self.variables[name.value] = Variable(
                constructor_type, constructor_type, public
            )
            class_type = NClass(name)

            scope = self.new_scope(parent_function=None, parent_type="class")
            for arg_pattern, arg_type in arguments:
                scope.assign_to_pattern(arg_pattern, arg_type, True, certain=True)
            scope.type_check_command(class_body)

            for prop_name, var in scope.variables.items():
                if var.public:
                    if var.type is None:
                        class_type = "invalid"
                        break
                    else:
                        class_type[prop_name] = var.type
        elif command.data == "assert":
            assert_type = command.children[0].children[0]
            if assert_type.data == "assert_type":
                expr, ty = assert_type.children
                expr_type = self.type_check_expr(expr)
                check_type = self.parse_type(ty, False)
                if expr_type == None or check_type == None:
                    self.errors.append(
                        TypeCheckError(
                            command,
                            "The expression or the type to check against evaluates to None, so the result is ambiguous as there is an error.",
                        )
                    )
                    return False
                _, incompatible = resolve_equal_types(expr_type, check_type)
                self.unit_tests.append(
                    {
                        "hasPassed": not incompatible,
                        "fileLine": command.line,
                        "unitTestType": "type",
                        "possibleTypes": yes(
                            (
                                display_type(expr_type, False),
                                display_type(check_type, True),
                            )
                        ),
                    }
                )
            elif assert_type.data == "assert_val":
                expr = assert_type.children[0]
                expr_type = self.type_check_expr(expr)
                if expr_type != "bool":
                    self.errors.append(
                        TypeCheckError(
                            command, "Cannot use assert value on a %s." % expr_type
                        )
                    )
            return False
        else:
            self.type_check_expr(command)

        # No return
        return False

    def add_native_function(self, name, argument_types, return_type, function):
        self.variables[name] = NativeFunction(
            self, argument_types, return_type, function
        )
