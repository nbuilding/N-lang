@lexer lexer

declaration -> pattern ((_ ":" _) type):? {% from(ast.Declaration) %}

# Used in function arguments to avoid a syntactic ambiguity between type
# variables and destructuring a list
definiteDeclaration -> definitePattern ((_ ":" _) type):? {% from(ast.Declaration) %}

pattern -> tuplePattern {% id %}

tuplePattern -> valuePattern {% id %}
	| (valuePattern (_ "," _)):+ valuePattern (_ ","):? {% from(ast.TuplePattern) %}

valuePattern -> definitePattern {% id %}
	| identifier (_ "(" )  ((valuePattern (_ "," _)):* valuePattern ((_ ","):? _)):? (_ ")") {% from(ast.EnumPattern) %}
	| ("[" _) ((valuePattern (_ "," _)):* valuePattern ((_ ","):? _)):? "]" {% from(ast.ListPattern) %}

definitePattern -> identifier {% id %}
	| "_" {% from(ast.DiscardPattern) %}
	| ("{" _) ((recordPatternEntry (_ "," _)):* recordPatternEntry ((_ ","):? _)):? "}" {% from(ast.RecordPattern) %}
	| "(" _ pattern _ ")" {% includeBrackets %}

recordPatternEntry -> anyIdentifier (_ ":" _) valuePattern {% from(ast.RecordPatternEntry) %}
	| identifier {% from(ast.RecordPatternEntry) %}
