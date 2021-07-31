import { CompilationScope } from '../../compiler/CompilationScope'
import { ErrorType } from '../../type-checker/errors/Error'
import { isUnitLike } from '../../type-checker/types/isUnitLike'
import {
  EnumSpec,
  TypeSpec as NamedTypeSpec,
} from '../../type-checker/types/TypeSpec'
import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { TypeSpec } from '../declaration/TypeSpec'
import { Identifier } from '../literals/Identifier'
import { isType, Type } from '../types/Type'
import {
  CheckStatementContext,
  CheckStatementResult,
  Statement,
  StatementCompilationResult,
} from './Statement'

export class EnumVariant extends Base {
  public: boolean
  variant: Identifier
  types: Type[]

  constructor (
    pos: BasePosition,
    [pub, rawVariant]: schem.infer<typeof EnumVariant.schema>,
  ) {
    const [variant, types] =
      rawVariant.length === 1
        ? [rawVariant[0], []]
        : [rawVariant[1], rawVariant[2].map(([, type]) => type)]
    super(pos, [variant, ...types])
    this.public = pub !== null
    this.variant = variant
    this.types = types
  }

  toString (): string {
    return `<${this.variant}${this.types.map(type => ' ' + type).join('')}>`
  }

  static schema = schema.tuple([
    schema.nullable(schema.tuple([schema.any, schema.any])),
    schema.union([
      schema.tuple([
        schema.any,
        schema.instance(Identifier),
        schema.array(schema.tuple([schema.any, schema.guard(isType)])),
        schema.any,
      ]),
      schema.tuple([schema.instance(Identifier)]),
    ]),
  ])
}

export class EnumDeclaration extends Base implements Statement {
  public: boolean
  typeSpec: TypeSpec
  variants: EnumVariant[]
  private _type?: EnumSpec

  constructor (
    pos: BasePosition,
    [, pub, typeSpec, , [, variant, rawVariants]]: schem.infer<
      typeof EnumDeclaration.schema
    >,
  ) {
    const variants = [variant, ...rawVariants.map(([, variant]) => variant)]
    super(pos)
    this.public = pub !== null
    this.typeSpec = typeSpec
    this.variants = variants
  }

  checkStatement (context: CheckStatementContext): CheckStatementResult {
    const scope = context.scope.inner()
    const typeVars = []
    if (this.typeSpec.typeVars) {
      for (const { value: name } of this.typeSpec.typeVars.vars) {
        const typeVar = new NamedTypeSpec(name)
        typeVars.push(typeVar)
        if (scope.types.has(name)) {
          scope.types.set(name, 'error')
          context.err({
            type: ErrorType.DUPLICATE_TYPE_VAR,
            in: 'enum',
          })
        } else {
          scope.types.set(name, typeVar)
        }
      }
    }
    const typeSpec = new EnumSpec(this.typeSpec.name.value, new Map(), typeVars)
    this._type = typeSpec
    for (const variant of this.variants) {
      const types = variant.types.map(
        type => context.scope.getTypeFrom(type).type,
      )
      const existingVariant = typeSpec.variants.get(variant.variant.value)
      if (existingVariant) {
        context.err(
          {
            type: ErrorType.DUPLICATE_VARIANT,
          },
          variant.variant,
        )
        typeSpec.variants.set(variant.variant.value, {
          types: null,
          public: variant.public || existingVariant.public,
        })
      } else {
        typeSpec.variants.set(variant.variant.value, {
          types,
          public: variant.public,
        })
      }
      context.defineVariable(
        variant.variant,
        typeSpec.getConstructorType(variant.variant.value),
        variant.public && !this.public,
      )
    }
    context.defineType(this.typeSpec.name, typeSpec, this.public)
    scope.end()
    return {}
  }

  compileStatement (scope: CompilationScope): StatementCompilationResult {
    const type = this._type!
    const representation = type.representation
    const statements: string[] = []

    for (const [name, variant] of type.variants) {
      if (!variant.types) {
        throw new Error('aiya')
      }
      const constructorName = scope.context.genVarName(name)
      scope.names.set(name, constructorName)
      const argumentNames = variant.types.map(type =>
        isUnitLike(type) ? '' : scope.context.genVarName('enumConstructorArg'),
      )
      if (argumentNames.length === 0) {
        switch (representation.type) {
          case 'unit': {
            statements.push(`var ${constructorName};`)
            break
          }
          case 'bool': {
            statements.push(
              `var ${constructorName} = ${representation.trueName === name};`,
            )
            break
          }
          case 'union': {
            statements.push(
              `var ${constructorName} = ${representation.variants.indexOf(
                name,
              )};`,
            )
            break
          }
          case 'tuple': {
            statements.push(
              representation.nonNull === name
                ? `var ${constructorName} = [${argumentNames
                    .filter(name => name)
                    .join(', ')}];`
                : `var ${constructorName};`,
            )
            break
          }
          case 'maybe': {
            statements.push(
              representation.nonNull === name
                ? `var ${constructorName} = ${argumentNames.find(
                    name => name,
                  )};`
                : `var ${constructorName};`,
            )
            break
          }
          default: {
            const variantId = representation.variants[name]
            statements.push(
              variantId === null
                ? `var ${constructorName};`
                : `var ${constructorName} = [${variantId}${argumentNames
                    .filter(name => name)
                    .map(name => ', ' + name)
                    .join('')}];`,
            )
          }
        }
      } else {
        statements.push(
          ...scope.functionExpression(
            argumentNames.map(argName => ({ argName, statements: [] })),
            () => {
              switch (representation.type) {
                case 'unit': {
                  return []
                }
                case 'bool': {
                  return [`return ${representation.trueName === name};`]
                }
                case 'union': {
                  return [`return ${representation.variants.indexOf(name)};`]
                }
                case 'tuple': {
                  return representation.nonNull === name
                    ? [
                        `return [${argumentNames
                          .filter(name => name)
                          .join(', ')}];`,
                      ]
                    : []
                }
                case 'maybe': {
                  return representation.nonNull === name
                    ? [`return ${argumentNames.find(name => name)};`]
                    : []
                }
                default: {
                  const variantId = representation.variants[name]
                  return variantId === null
                    ? []
                    : [
                        `return [${variantId}${argumentNames
                          .filter(name => name)
                          .map(name => ', ' + name)
                          .join('')}];`,
                      ]
                }
              }
            },
            `var ${constructorName} = `,
            ';',
          ),
        )
      }
    }

    return {
      statements,
    }
  }

  toString (): string {
    return `type${this.public ? ' pub' : ''} ${
      this.typeSpec
    } = ${this.variants.join(' | ')}`
  }

  static schema = schema.tuple([
    schema.any,
    schema.nullable(schema.tuple([schema.any, schema.any])),
    schema.instance(TypeSpec),
    schema.any,
    schema.tuple([
      schema.any,
      schema.instance(EnumVariant),
      schema.array(schema.tuple([schema.any, schema.instance(EnumVariant)])),
    ]),
  ])
}
