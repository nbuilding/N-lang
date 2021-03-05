@preprocessor typescript

@{%
import moo from 'moo'
import * as ast from './ast'

const {
	from,
	includeBrackets,
	Operation: { operation },
	UnaryOperation: { prefix, suffix },
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
		await: '!',
		funcOperator: [
			'|>',
		],
		comparisonOperator: [
			'<=', '==', '>=', '/=', '<', '=', '>',
		],
		arithmeticOperator: [
			'+', '-', '*', '%', '/', '^',
		],
		booleanOperator: [
			'&&', '||', '&', '|', '~',
		],
		lbracket: ['{', '[', '('],
		rbracket: ['}', ']', ')'],
		semicolon: ';',
		identifier: {
			match: /_?[a-zA-Z]\w*/,
			type: moo.keywords({
				'import keyword': 'import',
				'import N keyword': 'imp',
				'return keyword': 'return',
				'let keyword': 'let',
				'vary keyword': 'var',
				'public keyword': 'pub',
				'if keyword': 'if',
				'else keyword': 'else',
				'for keyword': 'for',
				'in keyword': 'in',
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

# Can't use macros because they can't be imported
# https://github.com/kach/nearley/issues/387
# and also the linter gets pissed.

@lexer lexer

@include "./grammars/statements.ne"
@include "./grammars/expressions.ne"
@include "./grammars/patterns.ne"
@include "./grammars/types.ne"

main -> _ block _ {% ([, block]) => block %}
	| _ {% () => ast.Block.empty() %}

identifier -> %identifier {% from(ast.Identifier) %}

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

# "Epsilon rule" matches nothing; an empty placeholder to align the tokens.
# I can't use `null` directly because it gets excluded from the token array.
empty -> null {% () => null %}
