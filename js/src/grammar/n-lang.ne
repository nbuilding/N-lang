@preprocessor typescript

@{%
import moo from 'moo'
import * as ast from './ast'

const {
	from,
	includeBrackets,
	Operation: { operation },
	UnaryOperation: { operation: unaryOperation },
} = ast

const escapes: { [key: string]: string } = {
	n: '\n', r: '\r', t: '\t', v: '\v', 0: '\0', f: '\f', b: '\b',
	'"': '"', '\\': '\\',
}
function unescape (str: string): string {
	return str.replace(
		/\\(?:([nrtv0fb"\\])|u\{([0-9a-fA-F]+)\}|\{(.|[\uD800-\uDBFF][\uDC00-\uDFFF])\})/g,
		(_, name, unicode, char) => name
			? escapes[name]
			: unicode
			? String.fromCodePoint(parseInt(unicode, 16))
			: char
	)
}

// Order of rules matter! So most specific -> most general
const lexer = moo.states({
	main: {
		comment: /\/\/.*?$/,
		multilineCommentStart: { match: '/*', push: 'multilineComment' },
		symbol: [
			'->', ':', '.', ',',
		],
		arithmeticOperator: [
			'+', '-', '*', '%', '/', '^',
		],
		comparisonOperator: [
			'<=', '==', '=>', '/=', '!=', '<', '=', '>',
		],
		booleanOperator: [
			'&&', '||', '&', '|', '!', '~',
		],
		lbracket: ['{', '[', '(', '<'],
		rbracket: ['}', ']', ')', '>'],
		semicolon: ';',
		identifier: {
			match: /_?[a-zA-Z]\w*/,
			type: moo.keywords({
				'import keyword': 'import',
				'print keyword': 'print',
				'return keyword': 'return',
				'let keyword': 'let',
				'else keyword': 'else',
				'for keyword': 'for',
				'not operator': 'not',
			}),
		},
		discard: '_',
		float: /-?(?:\d+\.\d*|\.\d+)/,
		number: /-?\d+/,
		string: {
			match: /"(?:[^\r\n\\"]|\\(?:[nrtv0fb"\\]|u\{[0-9a-fA-F]+\}|\{(?:.|[\uD800-\uDBFF][\uDC00-\uDFFF])\}))*"/,
			value: string => unescape(string.slice(1, -1)),
		},
		char: {
			match: /\\(?:[nrtv0fb"\\]|u\{[0-9a-fA-F]+\}|\{(?:.|[\uD800-\uDBFF][\uDC00-\uDFFF])\})/,
			value: char => unescape(char),
		},
		newline: { match: /\r?\n/, lineBreaks: true },
		spaces: /[ \t]+/,
		whitespace: { match: /\s+/, lineBreaks: true },
	},
	multilineComment: {
		multilineCommentStart: { match: '/*', push: 'multilineComment' },
		multilineCommentEnd: { match: '*/', pop: 1 },
		any: { match: /[^]+?/, lineBreaks: true },
	},
})
%}

@lexer lexer

main -> _ block _ {% ([, block]) => block %}
	| _ {% () => ast.Block.empty() %}

# statement
# ...
block -> (statement blockSeparator):* statement {% from(ast.Block) %}

statement -> expression {% id %}
	| "import" __ %identifier {% from(ast.ImportStmt) %}
	| "let" __ declaration _ "=" _ expression {% from(ast.VarStmt) %}

expression -> tupleExpression {% id %}
	| "print" __ expression {% from(ast.Print) %}
	| "print" bracketedExpression {% from(ast.Print) %}
	| "return" __ expression {% from(ast.Return) %}
	| "return" bracketedExpression {% from(ast.Return) %}
	| ifExpression {% id %}
	| funcExpr {% id %}
	| forLoop {% id %}

bracketedExpression -> bracketedValue {% id %}
	| funcExpr {% id %}

funcExpr -> "[" _ declaration (__ declaration):* _ "]" _ "->" _ type _ ("{" _ block _ "}" | ":" _ expression) {% from(ast.Function) %}

funcDefParams -> declaration {% ([decl]) => [decl] %}
	| funcDefParams __ declaration {% ([params, , decl]) => [...params, decl] %}

forLoop -> "for" _ declaration _ value _ value {% from(ast.For) %}

declaration -> %identifier (_ ":" _ type):? {% from(ast.Declaration) %}
	| "_" (_ ":" _ type):? {% from(ast.Declaration) %}

type -> tupleTypeExpr {% id %}

tupleTypeExpr -> funcTypeExpr {% id %}
	| (funcTypeExpr _ "," _):+ funcTypeExpr {% from(ast.TupleType) %}

funcTypeExpr -> typeValue {% id %}
	| typeValue _ "->" _ funcTypeExpr {% from(ast.FuncType) %}

typeValue -> modIdentifier {% id %}
	| "(" _ type _ ")" {% includeBrackets %}
	| "(" _ ")" {% from(ast.UnitType) %}

tupleExpression -> booleanExpression {% id %}
	| (booleanExpression _ "," _):+ booleanExpression {% from(ast.Tuple) %}

booleanExpression -> notExpression {% id %}
	| booleanExpression _ ("&&" | "&") _ notExpression {% operation(ast.Operator.AND) %}
	| booleanExpression _ ("||" | "|") _ notExpression {% operation(ast.Operator.OR) %}

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
	| productExpression _ "%" _ exponentExpression {% operation(ast.Operator.MODULO) %}

exponentExpression -> unaryExpression {% id %}
	| exponentExpression _ "^" _ unaryExpression {% operation(ast.Operator.EXPONENT) %}

unaryExpression -> value {% id %}
	| "-" _ unaryExpression {% unaryOperation(ast.UnaryOperator.NEGATE) %}
	| ("!" | "~") _ unaryExpression {% unaryOperation(ast.UnaryOperator.NOT) %}

# Generally, values are the same as expressions except they require some form of
# enclosing brackets for more complex expressions, which can help avoid syntax
# ambiguities.
value -> modIdentifier {% id %}
	| %number {% from(ast.Number) %}
	| %float {% from(ast.Float) %}
	| %string {% from(ast.String) %}
	| %char {% from(ast.Char) %}
	| bracketedValue {% id %}

# Separate rule here to allow a special case for print/return to not have a
# space between the keyword and a bracket
bracketedValue -> "(" _ expression _ ")" {% includeBrackets %}
	| functionCall {% id %}
	| "{" _ block _ "}" {% includeBrackets %}
	| "(" _ ")" {% from(ast.Unit) %}

# identifier [...parameters]
functionCall -> "<" _ value (__ value):* _ ">" {% from(ast.CallFunc) %}

ifExpression -> "if" __ expression __ value (__ "else" __ expression):? {% from(ast.If) %}

modIdentifier -> (%identifier "."):* %identifier {% from(ast.Identifier) %}

# // comment
lineComment -> %comment {% () => null %}

multilineComment -> "/*" multilineCommentBody:* "*/" {% () => null %}

multilineCommentBody -> %any {% () => null %}
	| multilineComment {% () => null %}

blockSeparator -> (_spaces (newline | ";")):+ _spaces {% () => null %}

newline -> lineComment:? %newline {% () => null %}

_spaces -> (%spaces:? multilineComment):* %spaces:? {% () => null %}

# Obligatory whitespace
__ -> (newline | %whitespace | %spaces | multilineComment):+ {% () => null %}

# Optional whitespace
_ -> __:? {% () => null %}
