@lexer lexer

type -> tupleTypeExpr {% id %}

tupleTypeExpr -> funcTypeExpr {% id %}
	| (funcTypeExpr _ "," _):+ funcTypeExpr (_ ","):? {% from(ast.TupleType) %}

funcTypeExpr -> typeValue {% id %}
	| typeValue (_ "->" _) funcTypeExpr {% from(ast.FuncType) %}

typeValue -> modIdentifier {% id %}
	| "(" _ type _ ")" {% includeBrackets %}
	| "(" _ ")" {% from(ast.UnitType) %}
	| ("{" _) (identifier (_ ":" _) type blockSeparator):* (_ "}") {% from(ast.RecordType) %}

modIdentifier -> (identifier "."):* identifier typeVars:? {% from(ast.ModuleId) %}

typeVars -> ("[" _) (funcTypeExpr (_ "," _)):* funcTypeExpr ((_ ","):? _ "]")
