# npm install
# mkdir dist
# npx nearleyc n-lang.ne -o dist/n-lang.js
# node n-lang.js

@{%
const operator = operatorName => ([expr, , , , val]) => ({ type: operatorName, a: expr, b: val })
%}

main -> _ block _ {% ([, block]) => block %}

# statement
# ...
block -> statement {% ([statement]) => statement ? [statement] : [] %}
	| block newlines commentedStatement {% ([block, , , , statement]) => statement ? [...block, statement] : block %}

commentedStatement -> lineComment {% () => null %}
	| statement _ lineComment:? {% id %}

# command [; comment] | ; comment
statement -> expression {% id %}
	| "import" __ identifier {% ([, , id]) => ({ type: 'import', name: id }) %}
	| "print" __ expression
	| "return" __ expression
	| "var" __ declaration _ "<" _ expression
	| functionDefinition {% id %}
	| loop {% id %}
	| ifStatement {% id %}

functionDefinition -> ">" _ functionDefinitionHeader _ "|" _ block newlines "<" (_ expression):?

functionDefinitionHeader -> identifier (_ functionDefinitionReturn:?) {% id %}
	| identifier __ functionDefinitionParams (_ functionDefinitionReturn:?)

functionDefinitionParams -> declaration
	| functionDefinitionParams __ declaration

functionDefinitionReturn -> "->" _ type

loop -> ">" _ "loop" _ value _ declaration _ "|" _ block newlines "<"

declaration -> identifier _ ":" _ type

type -> identifier

expression -> booleanExpression {% id %}

booleanExpression -> compareExpression {% id %}
	| booleanExpression _ "&" _ compareExpression {% operator('and') %}
	| booleanExpression _ "|" _ compareExpression {% operator('or') %}

compareExpression -> equalExpression {% operator('equal') %}
	| sumExpression _ ">" _ sumExpression {% operator('greater-than') %}
	| sumExpression _ "<" _ sumExpression {% operator('less-than') %}

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
functionCall -> "{" _ value _ "}" {% ([, id]) => ({ type: 'call', func: id }) %}
	| "{" _ value __ parameters _ "}" {% ([, id, , params]) => ({ type: 'call', func: id, params }) %}

# expression ...
parameters -> value {% ([expr]) => [expr] %}
	| parameters __ value {% ([params, , expr]) => [...params, expr] %}

ifStatement -> "if" __ expression _ "->" _ statement (__ "else" __ statement):?

ifExpression -> "if" __ expression __ "then" __ value (__ "else" __ value):?

modIdentifier -> identifier {% id %}
	| modIdentifier "." identifier

identifier -> [_a-zA-Z] [\w]:* {% ([head, tail]) => ({ type: 'ident', name: head + tail.join('') }) %}

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
