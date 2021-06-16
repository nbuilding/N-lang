import { ErrorType } from '../../type-checker/errors/Error'
import { NModule, unknown } from '../../type-checker/types/types'
import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Identifier } from '../literals/Identifier'
import { GetTypeContext, GetTypeResult, isType, Type } from './Type'

export class ModuleId extends Base implements Type {
  modules: Identifier[]
  name: Identifier
  typeVars: Type[]

  constructor (
    pos: BasePosition,
    [rawModules, typeName, maybeTypeVars]: schem.infer<typeof ModuleId.schema>,
  ) {
    const modules = rawModules.map(([mod]) => mod)
    const typeVars = maybeTypeVars
      ? [...maybeTypeVars[1][1].map(([type]) => type), maybeTypeVars[1][2]]
      : []
    super(pos, [...modules, typeName, ...typeVars])
    this.modules = modules
    this.name = typeName
    this.typeVars = typeVars
  }

  getType (context: GetTypeContext): GetTypeResult {
    const [module, ...modules] = this.modules
    if (module) {
      const firstModuleType = context.scope.getVariable(module.value, true)
      if (!firstModuleType) {
        context.err({ type: ErrorType.UNDEFINED_VARIABLE, name: module.value })
        return { type: unknown }
      }
      if (firstModuleType.type === 'module') {
        let moduleType: NModule = firstModuleType
        for (const module of modules) {
          const type = moduleType.types.get(module.value)
          if (type) {
            if (type.type === 'module') {
              moduleType = type
            } else {
              if (type.type !== 'unknown') {
                context.err({ type: ErrorType.NOT_MODULE, modType: type })
              }
              return { type: unknown }
            }
          } else {
            context.err({
              type: ErrorType.NOT_EXPORTED,
              name: module.value,
              exported: 'module',
            })
            return { type: unknown }
          }
        }
        const typeSpec = moduleType.exportedTypes.get(this.name.value)
        if (typeSpec) {
          return { type: typeSpec !== 'error' ? typeSpec.instance() : unknown }
        } else {
          context.err({
            type: ErrorType.NOT_EXPORTED,
            name: this.name.value,
            exported: 'type',
          })
          return { type: unknown }
        }
      } else {
        if (firstModuleType.type !== 'unknown') {
          context.err({ type: ErrorType.NOT_MODULE, modType: firstModuleType })
        }
        return { type: unknown }
      }
    } else {
      const typeSpec = context.scope.getType(this.name.value, true)
      if (typeSpec) {
        return { type: typeSpec !== 'error' ? typeSpec.instance() : unknown }
      } else {
        context.err({ type: ErrorType.UNDEFINED_TYPE, name: this.name.value })
        return { type: unknown }
      }
    }
  }

  toString (): string {
    return (
      this.modules.map(mod => mod + '.').join('') +
      this.name +
      (this.typeVars.length > 0 ? `[${this.typeVars.join(', ')}]` : '')
    )
  }

  static schema = schema.tuple([
    schema.array(schema.tuple([schema.instance(Identifier), schema.any])),
    schema.instance(Identifier),
    schema.nullable(
      schema.tuple([
        schema.any,
        schema.tuple([
          schema.any,
          schema.array(schema.tuple([schema.guard(isType), schema.any])),
          schema.guard(isType),
          schema.any,
        ]),
      ]),
    ),
  ])
}
