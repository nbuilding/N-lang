@lexer lexer

expression -> tupleExpression {% id %}
	| returnExpression {% id %}
	| "imp" _ identifier
	| "imp" _ %string

returnExpression -> "return" _ expression {% from(ast.Return) %}

funcExpr -> "[" (_ typeVarsDeclaration):? _ declaration (__ declaration):* (_ "]" _ "->" _) type (_ "{" _) block (_ "}") {% from(ast.Function) %}

tupleExpression -> noCommaExpression {% id %}
	| (noCommaExpression _ "," _):+ noCommaExpression (_ ","):? {% from(ast.Tuple) %}

noCommaExpression -> booleanExpression {% id %}
	| ifExpression {% id %}
	| funcExpr {% id %}

booleanExpression -> notExpression {% id %}
	| booleanExpression _ ("&&" | "&") _ notExpression {% operation(ast.Operator.AND) %}
	| booleanExpression _ ("||" | "|") _ notExpression {% operation(ast.Operator.OR) %}

notExpression -> compareExpression {% id %}
	| "not" _ notExpression {% prefix(ast.UnaryOperator.NOT) %}

compareExpression -> sumExpression {% id %}
	| (sumExpression _ compareOperator _):+ sumExpression {% from(ast.Comparisons) %}

compareOperator -> ("==" | "=") {% ([token]) => ({ ...token[0], value: ast.Compare.EQUAL }) %}
	| ">" {% ([token]) => ({ ...token, value: ast.Compare.GREATER }) %}
	| "<" {% ([token]) => ({ ...token, value: ast.Compare.LESS }) %}
	| ">=" {% ([token]) => ({ ...token, value: ast.Compare.GEQ }) %}
	| "<=" {% ([token]) => ({ ...token, value: ast.Compare.LEQ }) %}
	| ("!=" | "/=") {% ([token]) => ({ ...token[0], value: ast.Compare.NEQ }) %}

sumExpression -> productExpression {% id %}
	| sumExpression _ "+" _ productExpression {% operation(ast.Operator.ADD) %}
	| sumExpression _ "-" _ productExpression {% operation(ast.Operator.MINUS) %}

productExpression -> exponentExpression {% id %}
	| productExpression _ "*" _ exponentExpression {% operation(ast.Operator.MULTIPLY) %}
	| productExpression _ "/" _ exponentExpression {% operation(ast.Operator.DIVIDE) %}
	| productExpression _ "%" _ exponentExpression {% operation(ast.Operator.MODULO) %}

exponentExpression -> prefixExpression {% id %}
	| exponentExpression _ "^" _ prefixExpression {% operation(ast.Operator.EXPONENT) %}

prefixExpression -> postfixExpression {% id %}
	| "-" _ prefixExpression {% prefix(ast.UnaryOperator.NEGATE) %}
	| "~" _ prefixExpression {% prefix(ast.UnaryOperator.NOT) %}

postfixExpression -> value {% id %}
	| postfixExpressionImpure {% id %}
	| postfixExpression (_ "." _) identifier {% from(ast.RecordAccess) %}

postfixExpressionImpure -> postfixExpression _ "!" {% suffix(ast.UnaryOperator.AWAIT) %}
	| postfixExpression (_ "(" _) ((noCommaExpression (_ "," _)):* noCommaExpression ((_ ","):? _)):? ")" {% from(ast.FuncCall) %}

# Generally, values are the same as expressions except they require some form of
# enclosing brackets for more complex expressions, which can help avoid syntax
# ambiguities.
value -> identifier {% id %}
	| %number {% from(ast.Number) %}
	| %float {% from(ast.Float) %}
	| %string {% from(ast.String) %}
	| %char {% from(ast.Char) %}
	| "(" _ ")" {% from(ast.Unit) %}
	| "(" _ expression _ ")" {% includeBrackets %}
	| "[" _ ((noCommaExpression _ "," _):* noCommaExpression (_ ","):? _):? "]"
	| "{" _ (identifier (_ ":" _ expression):? blockSeparator):* _ "}"

ifExpression -> ("if" _) expression (_ "{" _) expression (_ "}" _ "else" _) elseExprBranch

elseExprBranch -> "{" _ expression _ "}" {% includeBrackets %}
	| ifExpression {% id %}
