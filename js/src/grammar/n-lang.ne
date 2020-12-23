@preprocessor typescript

@{%
import moo from 'moo'
import * as ast from './ast'

const {
	from,
	Operation: { operation },
	UnaryOperation: { operation: unaryOperation },
} = ast

const escapes: { [key: string]: string } = {
	n: '\n', r: '\r', t: '\t', v: '\v', 0: '\0', f: '\f', b: '\b'
}

// Order of rules matter! So most specific -> most general
const lexer = moo.compile({
	keyword: ['import', 'print', 'return', 'var', 'else', 'for'],
	symbol: [
		'->', ':', '.',
	],
	arithmeticOperator: [
		'+', '-', '*', '//', '%', '/', '^',
	],
	comparisonOperator: [
		'<', '<=', '=', '==', '=>', '>', '/=', '!=',
	],
	booleanOperator: [
		'&', '|', 'not',
	],
	lbracket: ['{', '[', '(', '<'],
	rbracket: ['}', ']', ')', '>'],
	semicolon: ';',
	number: /\d+/,
	identifier: /[a-zA-Z]\w*/,
	string: {
		match: /"(?:[^\r\n\\"]|\\[nrtv0fb]|u\{[0-9a-fA-F]+\})*"/,
		value: string => string
			.slice(1, -1)
			.replace(
				/\\(?:([^u])|u\{([0-9a-fA-F]+)\})/g,
				([, char, unicode]) => char ? escapes[char] : String.fromCodePoint(parseInt(unicode, 16))
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
block -> (block blockSeparator):* statement {% from(ast.Block) %}

statement -> expression {% id %}
	| "import" __ %identifier {% from(ast.ImportStmt) %}
	| "var" __ declaration _ "=" _ expression {% from(ast.VarStmt) %}

expression -> booleanExpression {% id %}
	| "print" __ expression {% from(ast.Print) %}
	| "return" __ expression {% from(ast.Return) %}
	| ifExpression {% id %}
	| funcExpr {% id %}
	| forLoop {% id %}

funcExpr -> "[" _ declaration (__ declaration):* _ "]" _ "->" _ type __ value {% from(ast.Function) %}

funcDefParams -> declaration {% ([decl]) => [decl] %}
	| funcDefParams __ declaration {% ([params, , decl]) => [...params, decl] %}

forLoop -> "for" _ declaration _ value _ value {% from(ast.For) %}

declaration -> %identifier (_ ":" _ type):? {% from(ast.Declaration) %}

type -> modIdentifier {% id %}

booleanExpression -> notExpression {% id %}
	| booleanExpression _ "&" _ notExpression {% operation(ast.Operator.AND) %}
	| booleanExpression _ "|" _ notExpression {% operation(ast.Operator.OR) %}

notExpression -> compareExpression {% id %}
	| "not" _ notExpression {% unaryOperation(ast.UnaryOperator.NOT) %}

compareExpression -> sumExpression {% id %}
	| (sumExpression _ compareOperator _):+ sumExpression {% from(ast.Comparisons) %}

compareOperator -> ("==" | "=") {% ([token]) => ({ ...token[0], value: ast.Compare.EQUAL }) %}
	| ">" {% ([token]) => ({ ...token, value: ast.Compare.GREATER }) %}
	| "<" {% ([token]) => ({ ...token, value: ast.Compare.LESS }) %}
	| ">=" {% ([token]) => ({ ...token, value: ast.Compare.GEQ }) %}
	| "<=" {% ([token]) => ({ ...token, value: ast.Compare.LEQ }) %}
	| ("!=" | "/=") {% ([token]) => ({ ...token[0], value: ast.Compare.NEQ }) %}

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
	| %number {% from(ast.Number) %}
	| %string {% from(ast.String) %}
	| "(" _ expression _ ")" {% ([, , expr]) => expr %}
	| functionCall {% id %}
	| "{" _ block _ "}" {% ([, , block]) => block %}

# identifier [...parameters]
functionCall -> "<" _ value (__ value):* _ ">" {% from(ast.CallFunc) %}

ifExpression -> "if" __ expression __ value (__ "else" __ value):? {% from(ast.If) %}

modIdentifier -> (%identifier "."):* %identifier {% from(ast.Identifier) %}

# // comment
lineComment -> %comment {% () => null %}

blockSeparator -> (_spaces (newline | ";")):+ _spaces {% () => null %}

newline -> lineComment:? %newline {% () => null %}

_spaces -> %spaces:? {% () => null %}

# Obligatory whitespace
__ -> (newline | %whitespace | %spaces):+ {% () => null %}

# Optional whitespace
_ -> __:? {% () => null %}
