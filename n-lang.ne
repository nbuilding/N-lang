main -> script {% id %}

script -> line {% ([line]) => line ? [line] : [] %}
	| script newline:+ line {% ([script, , line]) => line ? [...script, line] : script %}
	
line -> command {% id %}
	| lineComment {% () => null %}

command -> label _ functionCall {% ([label, , fnCall]) => ({ label, ...fnCall }) %}
	| functionCall {% id %}
	
label -> identifier _ ":" {% id %}
	
functionCall -> identifier {% ([id]) => ({ type: 'call', func: id }) %}
	| identifier __ parameters {% ([id, , params]) => ({ type: 'call', func: id, params }) %}

parameters -> expression {% ([expr]) => [expr] %}
	| parameters __ expression {% ([params, , expr]) => [...params, expr] %}

# specialForm -> "if" __ expression __ command

expression -> booleanExpression {% id %}
	
booleanExpression -> equalityExpression {% id %}
	| booleanExpression _ "&" _ equalityExpression {% ([expr, , , , val]) => ({ type: '&', a: expr, b: val }) %}
	| booleanExpression _ "|" _ equalityExpression {% ([expr, , , , val]) => ({ type: '&', a: expr, b: val }) %}
	
equalityExpression -> sumExpression {% id %}
	| sumExpression _ "=" _ sumExpression {% ([expr, , , , val]) => ({ type: '=', a: expr, b: val }) %}
	| sumExpression _ ">" _ sumExpression {% ([expr, , , , val]) => ({ type: '>', a: expr, b: val }) %}
	| sumExpression _ "<" _ sumExpression {% ([expr, , , , val]) => ({ type: '<', a: expr, b: val }) %}

sumExpression -> productExpression {% id %}
	| sumExpression _ "+" _ productExpression {% ([expr, , , , val]) => ({ type: '+', a: expr, b: val }) %}
	| sumExpression _ "-" _ productExpression {% ([expr, , , , val]) => ({ type: '-', a: expr, b: val }) %}

productExpression -> value {% id %}
	| productExpression _ "*" _ value {% ([expr, , , , val]) => ({ type: '*', a: expr, b: val }) %}
	| productExpression _ "/" _ value {% ([expr, , , , val]) => ({ type: '/', a: expr, b: val }) %}

value -> identifier {% id %}
	| number {% id %}
	| string {% id %}
	| "(" _ expression _ ")" {% ([, , expr]) => expr %}

identifier -> [_a-zA-Z] [\w]:* {% ([head, tail]) => ({ type: 'ident', name: head + tail.join('') }) %}

number -> [\d]:+ {% ([num]) => ({ type: 'num', value: num.join('') }) %}

string -> "\"" char:+ "\"" {% ([, str]) => ({ type: 'str', value: str.join('') }) %}

char -> [^"\\] {% id %}
	| "\\" . {% ([, char]) => char %}
	
lineComment -> ";" [^\r\n]:+ {% () => null %}

newline -> "\r":? "\n" {% () => null %}

# Obligatory whitespace
__ -> [\s]:+ {% () => null %}
	
# Optional whitespace
_ -> [\s]:* {% () => null %}
