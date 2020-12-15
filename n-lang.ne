# npm install
# mkdir dist
# npx nearleyc n-lang.ne -o dist/n-lang.js
# node n-lang.js

@{%
const operator = operatorName => ([expr, , , , val]) => ({ type: operatorName, a: expr, b: val })
%}

main -> script [\s]:* {% ([script]) => script %}

# line
# ...
script -> line {% ([line]) => line ? [line] : [] %}
	| script _ newline:+ _ line {% ([script, , , , line]) => line ? [...script, line] : script %}

# command [; comment] | ; comment
line -> lineComment {% () => null %}
	| command _ lineComment:? {% id %}

# [label:]functionCall
command -> label _ newline _ functionCall {% ([label, , , , fnCall]) => ({ label, ...fnCall }) %}
	| functionCall {% id %}

# label:
label -> ">" _ identifier {% ([, , label]) => label %}

# identifier [...parameters]
functionCall -> expression {% id %}
	| expression __ parameters {% ([id, , params]) => ({ type: 'call', func: id, params }) %}

# expression ...
parameters -> expression {% ([expr]) => [expr] %}
	| parameters __ expression {% ([params, , expr]) => [...params, expr] %}

expression -> booleanExpression {% id %}

booleanExpression -> equalityExpression {% id %}
	| booleanExpression _ "&" _ equalityExpression {% operator('&') %}
	| booleanExpression _ "|" _ equalityExpression {% operator('|') %}

equalityExpression -> sumExpression {% id %}
	| sumExpression _ "=" _ sumExpression {% operator('=') %}
	| sumExpression _ ">" _ sumExpression {% operator('>') %}
	| sumExpression _ "<" _ sumExpression {% operator('<') %}

sumExpression -> productExpression {% id %}
	| sumExpression _ "+" _ productExpression {% operator('+') %}
	| sumExpression _ "-" _ productExpression {% operator('-') %}

productExpression -> value {% id %}
	| productExpression _ "*" _ value {% operator('*') %}
	| productExpression _ "/" _ value {% operator('/') %}

value -> identifier {% id %}
	| number {% id %}
	| string {% id %}
	| "(" _ functionCall _ ")" {% ([, , expr]) => expr %}

identifier -> [_a-zA-Z] [\w]:* {% ([head, tail]) => ({ type: 'ident', name: head + tail.join('') }) %}

number -> [\d]:+ {% ([num]) => ({ type: 'num', value: num.join('') }) %}

string -> "\"" char:+ "\"" {% ([, str]) => ({ type: 'str', value: str.join('') }) %}

char -> [^"\\] {% id %}
	| "\\" . {% ([, char]) => char %}

# ; comment
lineComment -> ";" [^\r\n]:+ {% () => null %}

newline -> "\r":? "\n" {% () => null %}

# Obligatory whitespace
__ -> [ \t]:+ {% () => null %}

# Optional whitespace
_ -> [ \t]:* {% () => null %}
