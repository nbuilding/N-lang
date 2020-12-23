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
		'->', '|', ':', '<', '<=', '==', '=', '=>', '>', '+', '-', '*', '/', '^',
		'.', '//', '%', '&', '|', '/=', '!='
	],
	lbracket: ['{', '[', '(', '<'],
	rbracket: ['}', ']', ')', '>'],
	semicolon: ';',
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
	comment: /\/\/.*?$/,
	newline: { match: /\r?\n/, lineBreaks: true },
	spaces: /[ \t]+/,
	whitespace: { match: /\s+/, lineBreaks: true },
})
%}

@lexer lexer

main -> _ block _ {% ([, block]) => block %}

# statement
# ...
block -> commentedStatement {% ([statement]) => new ast.Block(statement ? [statement] : []) %}
	| block blockSeparator commentedStatement {% ([block, , statement]) => statement ? block.withStatement(statement) : block %}

commentedStatement -> lineComment {% () => null %}
	| statement lineComment:? {% id %}

statement -> expression {% id %}
	| "import" __ identifier {% ([, , id]) => new ast.ImportStmt(id) %}
	| "var" __ declaration _ "=" _ expression {% ([, , decl, , , , expr]) => new ast.VarStmt(decl, expr) %}

expression -> booleanExpression {% id %}
	| "print" __ expression {% ([, , expr]) => new ast.Print(expr) %}
	| "return" __ expression {% ([, , expr]) => new ast.Return(expr) %}
	| ifExpression {% id %}
	| funcExpr {% id %}
	| forLoop {% id %}

funcExpr -> "[" _ funcDefParams _ "]" _ "->" _ type __ value {% ([, , params, , , , , , returnType, , expr]) => new ast.Function(params, returnType, expr) %}

funcDefParams -> declaration {% ([decl]) => [decl] %}
	| funcDefParams __ declaration {% ([params, , decl]) => [...params, decl] %}

forLoop -> "for" _ declaration _ value _ value {% ([, , decl, , value, , expr]) => new ast.For(decl, value, expr) %}

declaration -> identifier (_ ":" _ type):? {% ([id, maybeType]) => new ast.Declaration(id, maybeType ? maybeType[3] : null) %}

type -> modIdentifier {% id %}

booleanExpression -> notExpression {% id %}
	| booleanExpression _ "&" _ notExpression {% operation(ast.Operator.AND) %}
	| booleanExpression _ "|" _ notExpression {% operation(ast.Operator.OR) %}

notExpression -> compareExpression {% id %}
	| "not" _ notExpression {% unaryOperation(ast.UnaryOperator.NOT) %}

compareExpression -> compareExpression_ {% ([comparisons]) => comparisons.length === 1 ? comparisons[0].expr : new ast.Comparisons(comparisons) %}

# The first comparison gets ignored anyways
compareExpression_ -> sumExpression {% ([expr]) => [{ expr, comparison: ast.Compare.EQUAL }] %}
	| compareExpression_ _ ("==" | "=") _ sumExpression {% compare(ast.Compare.EQUAL) %}
	| compareExpression_ _ ">" _ sumExpression {% compare(ast.Compare.GREATER) %}
	| compareExpression_ _ "<" _ sumExpression {% compare(ast.Compare.LESS) %}
	| compareExpression_ _ ">=" _ sumExpression {% compare(ast.Compare.GEQ) %}
	| compareExpression_ _ "<=" _ sumExpression {% compare(ast.Compare.LEQ) %}
	| compareExpression_ _ ("!=" | "/=") _ sumExpression {% compare(ast.Compare.NEQ) %}

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

# Generally, values are the same as expressions except they require some form of
# enclosing brackets for more complex expressions, which can help avoid syntax
# ambiguities.
value -> modIdentifier {% id %}
	| number {% ([num]) => new ast.Number(num) %}
	| string {% ([str]) => new ast.String(str) %}
	| "(" _ expression _ ")" {% ([, , expr]) => expr %}
	| functionCall {% id %}
	| "{" _ block _ "}" {% ([, , block]) => block %}

# identifier [...parameters]
functionCall -> "<" _ value _ ">" {% ([, , value]) => new ast.CallFunc(value) %}
	| "<" _ value __ parameters _ ">" {% ([, , value, , params]) => new ast.CallFunc(value, params) %}

# expression ...
parameters -> value {% ([expr]) => [expr] %}
	| parameters __ value {% ([params, , expr]) => [...params, expr] %}

ifExpression -> "if" __ expression __ value (__ "else" __ value):?
	{% ([, , cond, , a, b]) => new ast.If(cond, a, b && b[3]) %}

modIdentifier -> identifier {% ([id]) => new ast.Identifier(id) %}
	| modIdentifier "." identifier {% ([modIdent, , id]) => modIdent.identifier(id) %}

identifier -> %identifier {% ([token]) => token.value %}

number -> %number {% ([token]) => token.value %}

string -> %string {% ([token]) => token.value %}

char -> %safeChar {% id %}
	| "\\" . {% ([, char]) => char %}

# // comment
lineComment -> %comment {% () => null %}

blockSeparator -> (_spaces (newline | ";")):+ _spaces {% () => null %}

newline -> lineComment:? %newline {% () => null %}

_spaces -> %spaces:? {% () => null %}

# Obligatory whitespace
__ -> (newline | %whitespace | %spaces):+ {% () => null %}

# Optional whitespace
_ -> __:? {% () => null %}
