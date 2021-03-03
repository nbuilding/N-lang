@lexer lexer

expression -> tupleExpression {% id %}
	| "return" __ expression {% from(ast.Return) %}
	| "return" bracketedExpression {% from(ast.Return) %}
	| ifExpression {% id %}
	| funcExpr {% id %}
	| forLoop {% id %}

bracketedExpression -> bracketedValue {% id %}
	| funcExpr {% id %}

funcExpr -> "[" _ declaration (__ declaration):* _ "]" _ "->" _ type _ ("{" _ block _ "}" | ":" _ expression) {% from(ast.Function) %}

funcDefParams -> declaration {% ([decl]) => [decl] %}
	| funcDefParams __ declaration {% ([params, , decl]) => [...params, decl] %}

tupleExpression -> booleanExpression {% id %}
	| (booleanExpression _ "," _):+ booleanExpression {% from(ast.Tuple) %}

booleanExpression -> notExpression {% id %}
	| booleanExpression _ ("&&" | "&") _ notExpression {% operation(ast.Operator.AND) %}
	| booleanExpression _ ("||" | "|") _ notExpression {% operation(ast.Operator.OR) %}

notExpression -> compareExpression {% id %}
	| "not" _ notExpression {% unaryOperation(ast.UnaryOperator.NOT) %}

compareExpression -> sumExpression {% id %}
	| (sumExpression _ compareOperator _):+ sumExpression {% from(ast.Comparisons) %}

compareOperator -> ("==" | "=") {% ([token]) => ({ ...token[0], value: ast.Compare.EQUAL }) %}
	| ">" {% ([token]) => ({ ...token, value: ast.Compare.GREATER }) %}
	| "<" {% ([token]) => ({ ...token, value: ast.Compare.LESS }) %}
	| ">=" {% ([token]) => ({ ...token, value: ast.Compare.GEQ }) %}
	| "<=" {% ([token]) => ({ ...token, value: ast.Compare.LEQ }) %}
	| ("!=" | "/=") {% ([token]) => ({ ...token[0], value: ast.Compare.NEQ }) %}

# Avoid syntactic ambiguity with negation:
# a - b is subtraction.
# a -b is a and then negative b.
# a- b is odd, but it can be subtraction.
# a-b is subtraction.
sumExpression -> productExpression {% id %}
	| sumExpression _ "+" _ productExpression {% operation(ast.Operator.ADD) %}
	| sumExpression _ "-" __ productExpression {% operation(ast.Operator.MINUS) %}
	| sumExpression empty "-" empty productExpression {% operation(ast.Operator.MINUS) %}

productExpression -> exponentExpression {% id %}
	| productExpression _ "*" _ exponentExpression {% operation(ast.Operator.MULTIPLY) %}
	| productExpression _ "/" _ exponentExpression {% operation(ast.Operator.DIVIDE) %}
	| productExpression _ "%" _ exponentExpression {% operation(ast.Operator.MODULO) %}

exponentExpression -> unaryExpression {% id %}
	| exponentExpression _ "^" _ unaryExpression {% operation(ast.Operator.EXPONENT) %}

unaryExpression -> value {% id %}
	| "-" empty unaryExpression {% unaryOperation(ast.UnaryOperator.NEGATE) %}
	| ("!" | "~") _ unaryExpression {% unaryOperation(ast.UnaryOperator.NOT) %}

# Generally, values are the same as expressions except they require some form of
# enclosing brackets for more complex expressions, which can help avoid syntax
# ambiguities.
value -> modIdentifier {% id %}
	| %number {% from(ast.Number) %}
	| %float {% from(ast.Float) %}
	| %string {% from(ast.String) %}
	| %char {% from(ast.Char) %}
	| bracketedValue {% id %}

# Separate rule here to allow a special case for print/return to not have a
# space between the keyword and a bracket
bracketedValue -> "(" _ expression _ ")" {% includeBrackets %}
	| functionCall {% id %}
	| "{" _ block _ "}" {% includeBrackets %}
	| "(" _ ")" {% from(ast.Unit) %}

# identifier [...parameters]
functionCall -> "<" _ value (__ value):* _ ">" {% from(ast.CallFunc) %}

ifExpression -> "if" __ expression __ value (__ "else" __ expression):? {% from(ast.If) %}

modIdentifier -> (%identifier "."):* %identifier {% from(ast.Identifier) %}
