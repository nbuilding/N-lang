@lexer lexer

block -> (statement blockSeparator):* statement {% from(ast.Block) %}

statement -> expression {% id %}
	| "import" __ %identifier {% from(ast.ImportStmt) %}
	| "let" __ declaration _ "=" _ expression {% from(ast.VarStmt) %}

forLoop -> "for" _ declaration _ value _ value {% from(ast.For) %}
