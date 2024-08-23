import { CompilationScope } from '../../compiler/CompilationScope';
import { ErrorType } from '../../type-checker/errors/Error';
import {
  functionFromTypes,
  NRecord,
  NType,
  substitute,
  unknown,
} from '../../type-checker/types/types';
import {
  AliasSpec,
  FuncTypeVarSpec,
  TypeSpec as NamedTypeSpec,
} from '../../type-checker/types/TypeSpec';
import schema, * as schem from '../../utils/schema';
import { Base, BasePosition } from '../base';
import { TypeSpec } from '../declaration/TypeSpec';
import { RecordType } from '../types/RecordType';
import { isType, Type } from '../types/Type';
import {
  CheckStatementContext,
  CheckStatementResult,
  Statement,
  StatementCompilationResult,
} from './Statement';

export class AliasDeclaration extends Base implements Statement {
  public: boolean;
  typeSpec: TypeSpec;
  type: Type;
  private _type?: { type: NRecord; keys: string[] };

  constructor(
    pos: BasePosition,
    [, pub, typeSpec, , type]: schem.infer<typeof AliasDeclaration.schema>,
  ) {
    super(pos, [typeSpec, type]);
    this.public = pub !== null;
    this.typeSpec = typeSpec;
    this.type = type;
  }

  checkStatement(context: CheckStatementContext): CheckStatementResult {
    const scope = context.scope.inner();
    const typeVars = [];
    if (this.typeSpec.typeVars) {
      for (const { value: name } of this.typeSpec.typeVars.vars) {
        const typeVar = new NamedTypeSpec(name);
        typeVars.push(typeVar);
        if (scope.types.has(name)) {
          scope.types.set(name, 'error');
          context.err({
            type: ErrorType.DUPLICATE_TYPE_VAR,
            in: 'alias',
          });
        } else {
          scope.types.set(name, typeVar);
        }
      }
    }
    const evaluatedType = scope.getTypeFrom(this.type).type;
    const alias = new AliasSpec(
      this.typeSpec.name.value,
      evaluatedType,
      typeVars,
    );
    context.defineType(this.typeSpec.name, alias, this.public);
    if (this.type instanceof RecordType && evaluatedType.type === 'record') {
      this._type = {
        type: evaluatedType,
        keys: this.type.entries.map(entry => entry.key.value),
      };
      const types = this.type.entries.map(
        entry => evaluatedType.types.get(entry.key.value) || unknown,
      );
      // TODO: Warn if a variable with the name already exists
      if (types.length === 0) {
        context.defineVariable(
          this.typeSpec.name,
          alias.instance(typeVars.map(() => unknown)),
          this.public,
        );
      } else {
        const funcTypeVars = [];
        const substitutions: Map<NamedTypeSpec, NType> = new Map();
        for (const typeVar of typeVars) {
          const funcTypeVar = new FuncTypeVarSpec(typeVar.name);
          funcTypeVars.push(funcTypeVar);
          substitutions.set(typeVar, funcTypeVar.instance());
        }
        context.defineVariable(
          this.typeSpec.name,
          functionFromTypes(
            [
              ...types.map(type => substitute(type, substitutions)),
              alias.instance(funcTypeVars.map(typeVar => typeVar.instance())),
            ],
            funcTypeVars,
          ),
          this.public,
        );
      }
    }
    scope.end();
    return {};
  }

  compileStatement(scope: CompilationScope): StatementCompilationResult {
    if (this._type) {
      const { type, keys } = this._type;
      const constructorName = scope.context.genVarName(
        this.typeSpec.name.value,
      );
      scope.names.set(this.typeSpec.name.value, constructorName);
      const mangledKeys = scope.context.normaliseRecord(type);
      const aliasScope = scope.inner();
      const statements =
        keys.length > 0
          ? aliasScope.functionExpression(
              keys.map(key => {
                const argName = scope.context.genVarName(key);
                aliasScope.names.set(key, argName);
                return {
                  argName,
                  statements: [],
                };
              }),
              funcScope => [
                `return { ${keys
                  .map(key => `${mangledKeys[key]}: ${funcScope.getName(key)}`)
                  .join(', ')} };`,
              ],
              `var ${constructorName} = `,
              ';',
            )
          : [`var ${constructorName};`];
      return {
        statements,
      };
    } else {
      return { statements: [] };
    }
  }

  toString(): string {
    return `alias${this.public ? ' pub' : ''} ${this.typeSpec} = ${this.type}`;
  }

  static schema = schema.tuple([
    schema.any,
    schema.nullable(schema.tuple([schema.any, schema.any])),
    schema.instance(TypeSpec),
    schema.any,
    schema.guard(isType),
  ]);
}
