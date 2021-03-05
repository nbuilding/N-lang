@lexer lexer

expression -> tupleExpression {% id %}
	| returnExpression {% id %}
	| "imp" _ identifier {% from(ast.ImportFile) %}
	| "imp" _ string {% from(ast.ImportFile) %}

returnExpression -> "return" _ expression {% from(ast.Return) %}

funcExpr -> arguments (_ "->" _) type (_ "{" _) block (_ "}") {% from(ast.Function) %}

arguments -> ("[" _) (typeVarsDeclaration _):? deifniteDeclaration (__ deifniteDeclaration):* (_ "]") {% from(ast.Arguments) %}

tupleExpression -> noCommaExpression {% id %}
	| (noCommaExpression _ "," _):+ noCommaExpression (_ ","):? {% from(ast.Tuple) %}

noCommaExpression -> pipeExpression {% id %}

pipeExpression -> pipeRhs {% id %}
	| pipeExpression _ "|>" _ booleanExpression {% operation(ast.Operator.PIPE) %}

# RHS = right hand side
pipeRhs -> booleanExpression {% id %}
	| ifExpression {% id %}
	| funcExpr {% id %}

booleanExpression -> notExpression {% id %}
	| notExpression _ ("&&" | "&") _ booleanExpression {% operation(ast.Operator.AND) %}
	| notExpression _ ("||" | "|") _ booleanExpression {% operation(ast.Operator.OR) %}

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
	| string {% id %}
	| %char {% from(ast.Char) %}
	| "(" _ ")" {% from(ast.Unit) %}
	| "(" _ expression _ ")" {% includeBrackets %}
	| ("[" _) ((noCommaExpression (_ "," _)):* noCommaExpression ((_ ","):? _)):? "]" {% from(ast.List) %}
	| ("{" _) ((recordEntry blockSeparator):* recordEntry (blockSeparator:? _)):? "}" {% from(ast.Record) %}

recordEntry -> identifier ((_ ":" _) expression):? {% from(ast.RecordEntry) %}

string -> %string {% from(ast.String) %}

ifExpression -> ("if" _) condition (_ "{" _) expression (_ "}" _ "else" _) elseExprBranch {% from(ast.IfExpression) %}

elseExprBranch -> "{" _ expression _ "}" {% includeBrackets %}
	| ifExpression {% id %}
