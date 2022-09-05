import schema, * as schem from '../../utils/schema';
import { Base, BasePosition } from '../base';
import { Identifier } from '../literals/Identifier';

export class TypeVars extends Base {
  vars: Identifier[];

  constructor(
    pos: BasePosition,
    [, rawTypeVars, typeVar]: schem.infer<typeof TypeVars.schema>,
  ) {
    const typeVars = [...rawTypeVars.map(([name]) => name), typeVar];
    super(pos, typeVars);
    this.vars = typeVars;
  }

  toString(): string {
    return `[${this.vars.join(', ')}]`;
  }

  static schema = schema.tuple([
    schema.any,
    schema.array(schema.tuple([schema.instance(Identifier), schema.any])),
    schema.instance(Identifier),
    schema.any,
  ]);
}
