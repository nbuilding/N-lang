@{%
const operator = operatorName => ([expr, , , , val]) => ({ type: operatorName, a: expr, b: val })
%}

main -> script {% id %}

# line
# ...
script -> line {% ([line]) => line ? [line] : [] %}
	| script newline:+ line {% ([script, , line]) => line ? [...script, line] : script %}
	
# command | ; comment
line -> command {% id %}
	| lineComment {% () => null %}

# [label:]functionCall
command -> label _ functionCall {% ([label, , fnCall]) => ({ label, ...fnCall }) %}
	| functionCall {% id %}
	
# label:
label -> identifier _ ":" {% id %}
	
# identifier [...parameters]
functionCall -> identifier {% ([id]) => ({ type: 'call', func: id }) %}
	| identifier __ parameters {% ([id, , params]) => ({ type: 'call', func: id, params }) %}

# expression ...
parameters -> expression {% ([expr]) => [expr] %}
	| parameters __ expression {% ([params, , expr]) => [...params, expr] %}

expression -> booleanExpression {% id %}
	
booleanExpression -> equalityExpression {% id %}
	| booleanExpression _ "&" _ equalityExpression {% operator('&') %}
	| booleanExpression _ "|" _ equalityExpression {% operator('&') %}
	
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
	| "(" _ expression _ ")" {% ([, , expr]) => expr %}

identifier -> [_a-zA-Z] [\w]:* {% ([head, tail]) => ({ type: 'ident', name: head + tail.join('') }) %}

number -> [\d]:+ {% ([num]) => ({ type: 'num', value: num.join('') }) %}

string -> "\"" char:+ "\"" {% ([, str]) => ({ type: 'str', value: str.join('') }) %}

char -> [^"\\] {% id %}
	| "\\" . {% ([, char]) => char %}
	
# ; comment
lineComment -> ";" [^\r\n]:+ {% () => null %}

newline -> "\r":? "\n" {% () => null %}

# Obligatory whitespace
__ -> [\s]:+ {% () => null %}
	
# Optional whitespace
_ -> [\s]:* {% () => null %}
