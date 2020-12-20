@preprocessor typescript

@{%
import moo from 'moo'
import * as ast from './ast'

const operation = (operator: ast.Operator) =>
	([expr, , , , val]: any[]) =>
		new ast.Operation(operator, expr as ast.Expression, val as ast.Expression)

const unaryOperation = (operator: ast.UnaryOperator) =>
	([, , value]: any[]) =>
		new ast.UnaryOperation(operator, value as ast.Expression)

const compare = (comparison: ast.Compare) =>
	([compareExpr, , , , expr]: any[]) =>
		[...compareExpr, { expr, comparison }]

const escapes: { [key: string]: string } = {
	n: '\n', r: '\r', t: '\t', v: '\v', 0: '\0', f: '\f', b: '\b'
}
function unescape (char: string): string {
	return escapes[char] || char
}

// Order of rules matter! So most specific -> most general
const lexer = moo.compile({
	keyword: ['import', 'print', 'return', 'var', 'else'],
	symbol: [
		'->', '|', ':', '<', '=', '>', '+', '-', '*', '/', '^', '&', '|',
		'.', '//', '%'
	],
	lbracket: ['{', '[', '('],
	rbracket: ['}', ']', ')'],
	number: /\d+/,
	identifier: /[a-zA-Z]\w*/,
	string: {
		match: /"(?:[^\r\n\\"]|\\[^uU]|\\[uU])*"/,
		value: string => string
			.slice(1, -1)
			.replace(
				/\\(?:([^u])|u\{([0-9a-f])\})/gi,
				([, char, unicode]) => char ? unescape(char) : String.fromCodePoint(parseInt(unicode, 16))
			)
	},
	comment: /[ \t]*;.*?$/,
	newlines: { match: /\s*(?:\r?\n)\s*/, lineBreaks: true },
	spaces: /[ \t]+/,
	whitespace: { match: /\s+/, lineBreaks: true },
})
%}

@lexer lexer

main -> _ block _ {% ([, block]) => block %}

# statement
# ...
block -> commentedStatement {% ([statement]) => new ast.Block(statement ? [statement] : []) %}
	| block newlines commentedStatement {% ([block, , statement]) => statement ? block.withStatement(statement) : block %}

commentedStatement -> lineComment {% () => null %}
	| statement lineComment:? {% id %}

# command [; comment] | ; comment
statement -> expression {% id %}
	| "import" __ identifier {% ([, , id]) => new ast.ImportStmt(id) %}
	| "var" __ declaration _ "<" _ expression {% ([, , decl, , , , expr]) => new ast.VarStmt(decl, expr) %}
	| funcDef {% id %}
	| loop {% id %}

funcDef -> ">" _ funcDefHeader funcDefReturnType:? _ "|" _ block newlines funcDefEnd {% ([, , header, returnType, , , , block, , end]) => new ast.FuncDeclaration(header, returnType, block, end) %}

funcDefHeader -> identifier {% ([id]) => ({ name: id, params: [] }) %}
	| identifier __ funcDefParams {% ([id, , params]) => ({ name: id, params }) %}

funcDefParams -> declaration {% ([decl]) => [decl] %}
	| funcDefParams __ declaration {% ([params, , decl]) => [...params, decl] %}

funcDefReturnType -> _ "->" _ type {% ([, , , type]) => type %}

funcDefEnd -> "<" {% () => null %}
	| "<" _spaces expression {% ([, , expr]) => expr %}

loop -> ">" _ "loop" _ value _ declaration _ "|" _ block newlines "<" {% ([, , , , value, , decl, , , , block]) => new ast.LoopStmt(value, decl, block) %}

declaration -> identifier _ ":" _ type {% ([id, , , , type]) => new ast.Declaration(id, type) %}

type -> modIdentifier {% id %}

expression -> booleanExpression {% id %}
	| "print" __ expression {% ([, , expr]) => new ast.Print(expr) %}
	| "return" __ expression {% ([, , expr]) => new ast.Return(expr) %}
	| ifExpression {% id %}

booleanExpression -> notExpression {% id %}
	| booleanExpression _ "&" _ notExpression {% operation(ast.Operator.AND) %}
	| booleanExpression _ "|" _ notExpression {% operation(ast.Operator.OR) %}

notExpression -> compareExpression {% id %}
	| "not" _ notExpression {% unaryOperation(ast.UnaryOperator.NOT) %}

compareExpression -> compareExpression_ {% ([comparisons]) => comparisons.length === 1 ? comparisons[0].expr : new ast.Comparisons(comparisons) %}

# The first comparison gets ignored anyways
compareExpression_ -> sumExpression {% ([expr]) => [{ expr, comparison: ast.Compare.EQUAL }] %}
	| compareExpression_ _ "=" _ sumExpression {% compare(ast.Compare.EQUAL) %}
	| compareExpression_ _ ">" _ sumExpression {% compare(ast.Compare.GREATER) %}
	| compareExpression_ _ "<" _ sumExpression {% compare(ast.Compare.LESS) %}

sumExpression -> productExpression {% id %}
	| sumExpression _ "+" _ productExpression {% operation(ast.Operator.ADD) %}
	| sumExpression _ "-" _ productExpression {% operation(ast.Operator.MINUS) %}

productExpression -> exponentExpression {% id %}
	| productExpression _ "*" _ exponentExpression {% operation(ast.Operator.MULTIPLY) %}
	| productExpression _ "/" _ exponentExpression {% operation(ast.Operator.DIVIDE) %}
	| productExpression _ "//" _ exponentExpression {% operation(ast.Operator.INT_DIVIDE) %}
	| productExpression _ "%" _ exponentExpression {% operation(ast.Operator.MODULO) %}

exponentExpression -> unaryExpression {% id %}
	| exponentExpression _ "^" _ unaryExpression {% operation(ast.Operator.EXPONENT) %}

unaryExpression -> value {% id %}
	| "-" _ unaryExpression {% unaryOperation(ast.UnaryOperator.NEGATE) %}

value -> modIdentifier {% id %}
	| number {% ([num]) => new ast.Number(num) %}
	| string {% ([str]) => new ast.String(str) %}
	| "(" _ expression _ ")" {% ([, , expr]) => expr %}
	| functionCall {% id %}

# identifier [...parameters]
functionCall -> "{" _ value _ "}" {% ([, , value]) => new ast.CallFunc(value) %}
	| "{" _ value __ parameters _ "}" {% ([, , value, , params]) => new ast.CallFunc(value, params) %}

# expression ...
parameters -> value {% ([expr]) => [expr] %}
	| parameters __ value {% ([params, , expr]) => [...params, expr] %}

ifExpression -> "if" __ expression (_ "->" _ | __ "then" __)
	expression
	(__ "else" __ expression):?
	{% ([, , cond, , a, b]) => new ast.If(cond, a, b && b[3]) %}

modIdentifier -> identifier {% ([id]) => new ast.Identifier(id) %}
	| modIdentifier "." identifier {% ([modIdent, , id]) => modIdent.identifier(id) %}

identifier -> %identifier {% ([token]) => token.value %}

number -> %number {% ([token]) => token.value %}

string -> %string {% ([token]) => token.value %}

char -> %safeChar {% id %}
	| "\\" . {% ([, char]) => char %}

# ; comment
lineComment -> %comment {% () => null %}

newlines -> %newlines {% () => null %}

_spaces -> %spaces:? {% () => null %}

# Obligatory whitespace
__ -> (%newlines | %whitespace | %spaces) {% () => null %}

# Optional whitespace
_ -> __:? {% () => null %}
