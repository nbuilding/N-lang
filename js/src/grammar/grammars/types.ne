@lexer lexer

type -> tupleTypeExpr {% id %}

tupleTypeExpr -> funcTypeExpr {% id %}
	| (funcTypeExpr (_ "," _)):+ funcTypeExpr (_ ","):? {% from(ast.TupleType) %}

funcTypeExpr -> typeValue {% id %}
	| (typeVarsDeclaration _):? typeValue (_ "->" _) funcTypeExpr {% from(ast.FuncType) %}

typeValue -> modIdentifier {% id %}
	| "(" _ type _ ")" {% includeBrackets %}
	| "(" _ ")" {% from(ast.UnitType) %}
	| ("{" _) ((recordTypeEntry blockSeparator):* recordTypeEntry (blockSeparator | _spaces)):? "}" {% from(ast.RecordType) %}

recordTypeEntry -> identifier (_ ":" _) type {% from(ast.RecordTypeEntry) %}

modIdentifier -> (identifier "."):* identifier (_ typeVars):? {% from(ast.ModuleId) %}

typeVars -> ("[" _) (funcTypeExpr (_ "," _)):* funcTypeExpr ((_ ","):? _ "]")
