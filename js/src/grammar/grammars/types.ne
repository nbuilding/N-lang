@lexer lexer

type -> tupleTypeExpr {% id %}

tupleTypeExpr -> funcTypeExpr {% id %}
	| (funcTypeExpr _ "," _):+ funcTypeExpr (_ ","):? {% from(ast.TupleType) %}

funcTypeExpr -> typeValue {% id %}
	| typeValue (_ "->" _) funcTypeExpr {% from(ast.FuncType) %}

typeValue -> modIdentifier {% id %}
	| "(" _ type _ ")" {% includeBrackets %}
	| "(" _ ")" {% from(ast.UnitType) %}
	| "{" _ (identifier _ ":" _ type blockSeparator):* _ "}"

modIdentifier -> (identifier "."):* identifier typeVars:?

typeVars -> "[" _ (funcTypeExpr _ "," _):* funcTypeExpr (_ ","):? _ "]"
