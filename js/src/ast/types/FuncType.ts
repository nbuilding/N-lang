import { ErrorType } from '../../type-checker/errors/Error';
import { NFunction } from '../../type-checker/types/types';
import { FuncTypeVarSpec } from '../../type-checker/types/TypeSpec';
import schema, * as schem from '../../utils/schema';
import { Base, BasePosition } from '../base';
import { TypeVars } from '../declaration/TypeVars';
import { GetTypeContext, GetTypeResult, isType, Type } from './Type';

export class FuncType extends Base implements Type {
  takes: Type;
  returns: Type;
  typeVars: TypeVars | null;

  constructor(
    pos: BasePosition,
    [maybeTypeVars, takes, , returns]: schem.infer<typeof FuncType.schema>,
  ) {
    super(pos, [takes, returns, maybeTypeVars && maybeTypeVars[0]]);
    this.takes = takes;
    this.returns = returns;
    this.typeVars = maybeTypeVars && maybeTypeVars[0];
  }

  getType(context: GetTypeContext): GetTypeResult {
    const scope = context.scope.inner();
    const typeVars = [];
    if (this.typeVars) {
      for (const { value: name } of this.typeVars.vars) {
        const typeVar = new FuncTypeVarSpec(name);
        typeVars.push(typeVar);
        if (scope.types.has(name)) {
          scope.types.set(name, 'error');
          context.err({
            type: ErrorType.DUPLICATE_TYPE_VAR,
            in: 'func-type',
          });
        } else {
          scope.types.set(name, typeVar);
        }
      }
    }
    const type: NFunction = {
      type: 'function',
      argument: scope.getTypeFrom(this.takes).type,
      return: scope.getTypeFrom(this.returns).type,
      typeVars,
      trait: false,
    };
    scope.end();
    return {
      type,
    };
  }

  toString(): string {
    return `(${this.typeVars ? this.typeVars + ' ' : ''}${this.takes} -> ${
      this.returns
    })`;
  }

  static schema = schema.tuple([
    schema.nullable(schema.tuple([schema.instance(TypeVars), schema.any])),
    schema.guard(isType),
    schema.any,
    schema.guard(isType),
  ]);
}
