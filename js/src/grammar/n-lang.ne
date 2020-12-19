@preprocessor typescript

@{%
import moo from 'moo'
import * as ast from './ast'

const operator = (operatorName: ast.OperatorType) =>
	([expr, , , , val]: any[]) =>
		new ast.Operator(operatorName, expr as ast.Expression, val as ast.Value)

const unaryOperator = (operatorName: ast.UnaryOperatorType) =>
	([, , value]: any[]) =>
		new ast.UnaryOperator(operatorName, value as ast.Value)

// Order of rules matter! So most specific -> most general
const lexer = moo.compile({
	keyword: ['import', 'print', 'return', 'var'],
	symbol: [
		'->', '|', ':', '<', '=', '>', '+', '-', '*', '/', '^', '~', '!', '&', '|',
		'.'
	],
	lbracket: ['{', '[', '('],
	rbracket: ['}', ']', ')'],
	number: /\d+/,
	identifier: /[_a-zA-Z]\w*/,
	string: /"(?:[^\r\n\\"]|\\.)*"/,
	comment: /\s*;.*?$/,
	newlines: { match: /\s*(?:\r?\n)\s*/, lineBreaks: true },
	whitespace: { match: /\s+/, lineBreaks: true },
})
%}

@lexer lexer

main -> _ block _ {% ([, block]) => block %}

# statement
# ...
block -> statement {% ([statement]) => new ast.Block(statement ? [statement] : []) %}
	| block newlines commentedStatement {% ([block, , statement]) => statement ? block.withStatement(statement) : block %}

commentedStatement -> lineComment {% () => null %}
	| statement lineComment:? {% id %}

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
	| booleanExpression _ "&" _ compareExpression {% operator(ast.OperatorType.AND) %}
	| booleanExpression _ "|" _ compareExpression {% operator(ast.OperatorType.OR) %}

compareExpression -> equalExpression {% id %}
	| sumExpression _ ">" _ sumExpression {% operator(ast.OperatorType.GREATER_THAN) %}
	| sumExpression _ "<" _ sumExpression {% operator(ast.OperatorType.LESS_THAN) %}

# TODO
equalExpression -> sumExpression {% id %}
	| equalExpression _ "=" _ sumExpression

sumExpression -> productExpression {% id %}
	| sumExpression _ "+" _ productExpression {% operator(ast.OperatorType.ADD) %}
	| sumExpression _ "-" _ productExpression {% operator(ast.OperatorType.MINUS) %}

productExpression -> unaryExpression {% id %}
	| productExpression _ "*" _ unaryExpression {% operator(ast.OperatorType.MULTIPLY) %}
	| productExpression _ "/" _ unaryExpression {% operator(ast.OperatorType.DIVIDE) %}

unaryExpression -> value {% id %}
	| "-" _ unaryExpression {% unaryOperator(ast.UnaryOperatorType.NEGATE) %}
	| "~" _ unaryExpression {% unaryOperator(ast.UnaryOperatorType.NOT) %}
	| "!" _ unaryExpression {% unaryOperator(ast.UnaryOperatorType.NOT) %}

value -> modIdentifier {% id %}
	| number {% id %}
	| string {% ([str]) => new ast.String(str) %}
	| "(" _ expression _ ")" {% ([, , expr]) => expr %}
	| functionCall {% id %}
	| ifExpression

# identifier [...parameters]
functionCall -> "{" _ value _ "}" {% ([, , value]) => new ast.CallFunc(value) %}
	| "{" _ value __ parameters _ "}" {% ([, , value, , params]) => new ast.CallFunc(value, params) %}

# expression ...
parameters -> value {% ([expr]) => [expr] %}
	| parameters __ value {% ([params, , expr]) => [...params, expr] %}

ifStatement -> "if" __ expression _ "->" _ statement (__ "else" __ statement):? {% ([, , expr, , , , stmt, maybeElse]) => new ast.IfStmt(expr, stmt, maybeElse) %}

ifExpression -> "if" __ expression __ "then" __ value (__ "else" __ value):?

modIdentifier -> identifier {% id %}
	| modIdentifier "." identifier

identifier -> %identifier {% ([token]) => token.value %}

number -> %number {% ([token]) => token.value %}

string -> %string {% ([token]) => token.value %}

char -> %safeChar {% id %}
	| "\\" . {% ([, char]) => char %}

# ; comment
lineComment -> %comment {% () => null %}

newlines -> %newlines {% () => null %}

# Obligatory whitespace
__ -> (%newlines | %whitespace) {% () => null %}

# Optional whitespace
_ -> __:? {% () => null %}
