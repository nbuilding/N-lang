@lexer lexer

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
