import { ErrorType } from '../../type-checker/errors/Error'
import { Module } from '../../type-checker/types/types'
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
      if (firstModuleType instanceof Module) {
        let moduleType: Module = firstModuleType
        for (const module of modules) {
          const type = moduleType.types.get(module.value)
          if (type === undefined) {
            context.err({
              type: ErrorType.NOT_EXPORTED,
              name: module.value,
              exported: 'module',
            })
            return { type: null }
          } else if (type instanceof Module) {
            moduleType = type
          } else {
            context.err({ type: ErrorType.NOT_MODULE, name: module.value })
            return { type: null }
          }
        }
        const typeSpec = moduleType.typeSpecs.get(this.name.value)
        if (typeSpec !== undefined) {
          return { type: typeSpec.instance() }
        } else {
          context.err({
            type: ErrorType.NOT_EXPORTED,
            name: this.name.value,
            exported: 'type',
          })
          return { type: null }
        }
      } else {
        context.err({ type: ErrorType.NOT_MODULE, name: module.value })
        return { type: null }
      }
    } else {
      const typeSpec = context.scope.getType(this.name.value, true)
      if (typeSpec !== undefined) {
        return { type: typeSpec.instance() }
      } else {
        context.err({ type: ErrorType.UNDEFINED_TYPE, name: this.name.value })
        return { type: null }
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
