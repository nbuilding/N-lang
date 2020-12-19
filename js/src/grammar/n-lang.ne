@preprocessor typescript

@{%
import moo from 'moo'
import ast from './ast'

const operator = operatorName => ([expr, , , , val]) => new ast.Operator(operatorName, expr, val)

const lexer = moo.compile({})
%}

@lexer lexer

main -> _ block _ {% ([, block]) => block %}

# statement
# ...
block -> statement {% ([statement]) => new ast.Block(statement ? [statement] : []) %}
	| block newlines commentedStatement {% ([block, , statement]) => statement ? block.withStatement(statement) : block %}

commentedStatement -> lineComment {% () => null %}
	| statement _space lineComment:? {% id %}

# command [; comment] | ; comment
statement -> expression {% id %}
	| "import" __ identifier {% ([, , id]) => new ast.ImportStmt(id) %}
	| "print" __ expression {% ([, , expr]) => new ast.PrintStmt(expr) %}
	| "return" __ expression {% ([, , expr]) => new ast.ReturnStmt(expr) %}
	| "var" __ declaration _ "<" _ expression {% ([, , decl, , , , expr]) => new ast.VarStmt(decl, expr) %}
	| funcDef {% id %}
	| loop {% id %}
	| ifStatement {% id %}

funcDef -> ">" _ funcDefHeader funcDefReturnType:? _ "|" _ block newlines funcDefEnd {% ([, , header, returnType, , , , block, , end]) => new ast.FuncDeclaration(header, returnType, block, end) %}

funcDefHeader -> identifier {% ([id]) => ({ name: id, params: [] }) %}
	| identifier __ funcDefParams {% ([id, , params]) => ({ name: id, params }) %}

funcDefParams -> declaration {% ([decl]) => [decl] %}
	| funcDefParams __ declaration {% ([params, , decl]) => [...params, decl] %}

funcDefReturnType -> _ "->" _ type {% ([, , , type]) => type %}

funcDefEnd -> "<" {% () => null %}
	| "<" _ expression {% ([, , expr]) => expr %}

loop -> ">" _ "loop" _ value _ declaration _ "|" _ block newlines "<" {% ([, , , , value, , decl, , , , block]) => new ast.LoopStmt(value, decl, block) %}

declaration -> identifier _ ":" _ type {% ([id, , , , type]) => new ast.Declaration(id, type) %}

type -> identifier {% id %}

expression -> booleanExpression {% id %}

booleanExpression -> compareExpression {% id %}
	| booleanExpression _ "&" _ compareExpression {% operator('and') %}
	| booleanExpression _ "|" _ compareExpression {% operator('or') %}

compareExpression -> equalExpression {% id %}
	| sumExpression _ ">" _ sumExpression {% operator('greater-than') %}
	| sumExpression _ "<" _ sumExpression {% operator('less-than') %}

# TODO
equalExpression -> sumExpression {% id %}
	| equalExpression _ "=" _ sumExpression

sumExpression -> productExpression {% id %}
	| sumExpression _ "+" _ productExpression {% operator('add') %}
	| sumExpression _ "-" _ productExpression {% operator('minus') %}

productExpression -> unaryExpression {% id %}
	| productExpression _ "*" _ unaryExpression {% operator('multiply') %}
	| productExpression _ "/" _ unaryExpression {% operator('divide') %}

unaryExpression -> value {% id %}
	| "-" _ unaryExpression {% ([, , value]) => ({ type: 'negate', a: value }) %}
	| "~" _ unaryExpression {% ([, , value]) => ({ type: 'not', a: value }) %}
	| "!" _ unaryExpression {% ([, , value]) => ({ type: 'not', a: value }) %}

value -> modIdentifier {% id %}
	| number {% id %}
	| string {% id %}
	| "(" _ expression _ ")" {% ([, , expr]) => expr %}
	| functionCall {% id %}
	| ifExpression

# identifier [...parameters]
functionCall -> "{" _ value _ "}" {% ([, , id]) => new ast.CallFunc(id) %}
	| "{" _ value __ parameters _ "}" {% ([, , id, , params]) => new ast.CallFunc(id, params) %}

# expression ...
parameters -> value {% ([expr]) => [expr] %}
	| parameters __ value {% ([params, , expr]) => [...params, expr] %}

ifStatement -> "if" __ expression _ "->" _ statement (__ "else" __ statement):? {% ([, , expr, , , , stmt, maybeElse]) => new ast.IfStmt(expr, stmt, maybeElse) %}

ifExpression -> "if" __ expression __ "then" __ value (__ "else" __ value):?

modIdentifier -> identifier {% id %}
	| modIdentifier "." identifier

identifier -> [_a-zA-Z] [\w]:* {% ([head, tail]) => head + tail.join('') %}

number -> [\d]:+ {% ([num]) => ({ type: 'num', value: num.join('') }) %}

string -> "\"" char:+ "\"" {% ([, str]) => ({ type: 'str', value: str.join('') }) %}

char -> [^"\\] {% id %}
	| "\\" . {% ([, char]) => char %}

# ; comment
lineComment -> ";" [^\r\n]:+ {% () => null %}

newlines -> _space newline:+ _space

newline -> "\r":? "\n" {% () => null %}

_space -> [ \t]:* {% () => null %}

# Obligatory whitespace
__ -> [\s]:+ {% () => null %}

# Optional whitespace
_ -> [\s]:* {% () => null %}
