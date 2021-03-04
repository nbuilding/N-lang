@lexer lexer

block -> (statement blockSeparator):* statement {% from(ast.Block) %}

statement -> "import" _ identifier {% from(ast.ImportStmt) %}
	| letStatement
	| varStatement
	| enumDeclaration
	| aliasDefinition
	| classDeclaration
	| oldForLoop
	| forLoop
	| postfixExpressionImpure {% id %}
	| returnExpression {% id %}

letStatement -> "let" _ modifiers _ declaration _ "=" _ expression

varStatement -> ("var" _) identifier (_ "=" _) expression

enumDeclaration -> "type" _ modifiers _ typeSpec _ "=" _ enumDefinition

enumDefinition -> enumVariant (_ "|" _ enumVariant):*

enumVariant -> "<" _ identifier (_ typeValue):* _ ">"
	| identifier

aliasDefinition -> "alias" _ modifiers _ typeSpec _ "=" _ type

classDeclaration -> "class" _ modifiers _ identifier _ "[" (_ typeVarsDeclaration):? _ declaration (__ declaration):* _ "]" _ "{" _ block _ "}"

oldForLoop -> ("for" _) declaration _ value (_ "{" _) block (_ "}")

forLoop -> "for" _ "(" _ declaration _ "in" _ expression _ ")" _ "{" _ block _ "}" {% from(ast.For) %}

ifStatement -> "if" _ expression _ "{" _ block _ "}" (_ "else" _ elseStatement):?

elseStatement -> "{" _ block _ "}"
	| ifStatement

typeSpec -> identifier typeVarsDeclaration:?

typeVarsDeclaration -> "[" _ (identifier _ "," _):* identifier (_ ","):? _ "]"

modifiers -> empty
	| "pub"
