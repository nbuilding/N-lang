import { generateNames } from '../../test/unit/utils/generate-names'
import { Block } from '../ast'
import { modules } from '../native-modules'
import {
  FuncTypeVar,
  NRecord,
  NType,
  NTypeKnown,
  substitute,
} from '../type-checker/types/types'
import { CompilationGlobalScope } from '../global-scope/CompilationGlobalScope'
import { functions } from './functions'
import { list, cmd, map, str } from '../type-checker/types/builtins'
import { isUnitLike } from '../type-checker/types/isUnitLike'
import { EnumSpec, FuncTypeVarSpec } from '../type-checker/types/TypeSpec'
import { normaliseEnum } from './EnumRepresentation'
import { fromEntries } from '../utils/from-entries'

function surround (
  lines: string[],
  { prefix = '', suffix = '' } = {},
): string[] {
  if (lines.length === 0) {
    return prefix + suffix ? [prefix + suffix] : []
  } else if (lines.length === 1) {
    return [prefix + lines[0] + suffix]
  } else {
    return [
      prefix + lines[0],
      ...lines.slice(1, -1),
      lines[lines.length - 1] + suffix,
    ]
  }
}

export interface HasExports {
  names: Map<string, string>
}

export class CompilationContext {
  /** Maps module IDs to their exported variable names */
  private _modules: Map<string, HasExports> = new Map()

  globalScope = new CompilationGlobalScope(this)

  /** ID used to ensure unique variable names */
  private _id = 0

  /** Cache of normalised record key names */
  private _recordCache: Map<string, Record<string, string>> = new Map()

  /**
   * Functions that have been required and added to `dependencies` already. A
   * mapping between the normal name and the mangled name. (e.g. deepEqual ->
   * deepEqual_0)
   */
  required: Map<string, string> = new Map()

  /**
   * Statements for defining the native module dependencies used in the project.
   */
  dependencies: string[] = []

  genVarName (name: string = '') {
    return `${name}_${this._id++}`
  }

  indent (lines: string[]): string[] {
    return lines.map(line => '  ' + line)
  }

  /** Returns an object map between record field names and mangled names */
  normaliseRecord (recordType: NRecord): Record<string, string> {
    // Normalise keys by alphabetising them to get a unique record ID
    const sortedKeys = [...recordType.types.keys()].sort()
    const recordId = sortedKeys.join(' ')
    const cached = this._recordCache.get(recordId)
    if (cached) {
      return cached
    }
    const mangled: Record<string, string> = {}
    const names = generateNames()
    for (const key of sortedKeys) {
      mangled[key] = names.next().value
    }
    this._recordCache.set(recordId, mangled)
    return mangled
  }

  getModule (moduleId: string): HasExports {
    let module = this._modules.get(moduleId)
    if (!module) {
      if (!modules.hasOwnProperty(moduleId)) {
        throw new Error(`Unknown module ${moduleId}`)
      }
      const { statements, exports } = modules[moduleId].compile(this)
      module = { names: new Map(Object.entries(exports)) }
      this.dependencies.push(...statements)
      this._modules.set(moduleId, module)
    }
    return module
  }

  compile (block: Block, moduleId?: string): string[] {
    const scope = this.globalScope.inner()
    if (moduleId) {
      this._modules.set(moduleId, scope)
    }
    return block.compileStatement(scope).statements
  }

  defineModuleNames (moduleId: string, names: Map<string, string>) {
    this._modules.set(moduleId, { names })
  }

  require (name: string): string {
    const cached = this.required.get(name)
    if (cached) {
      return cached
    } else {
      const mangled = this.genVarName(name)
      if (!functions[name]) {
        throw new ReferenceError(`'${name}' is not in functions.`)
      }
      const lines = functions[name](mangled, required => this.require(required))
      this.dependencies.push(...lines)
      this.required.set(name, mangled)
      return mangled
    }
  }

  /**
   * Create an expression that transforms `name` to replace all unit-like types
   * with something truthy like `unit` (an empty object) if `toTypevar` is true
   * or with `undefined` if `toTypevar` is false.
   *
   * Returns `null` if nothing needs changing. Prevents unnecessary `.map`s.
   */
  makeUnitConverter (
    name: string,
    type: NType,
    substitutions: Map<FuncTypeVarSpec, NTypeKnown>,
    toTypeVar: boolean,
    inTypeVar = false,
  ): { statements: string[]; expression: string } | null {
    if (inTypeVar && isUnitLike(type)) {
      return {
        statements: [],
        expression: toTypeVar ? this.require('unit') : 'undefined',
      }
    } else if (type.type === 'named') {
      if (type.typeSpec === list) {
        const item = this.genVarName('item')
        const typeVar = this.makeUnitConverter(
          item,
          type.typeVars[0],
          substitutions,
          toTypeVar,
          inTypeVar,
        )
        if (typeVar) {
          const result = this.genVarName('result')
          return {
            statements: [
              // Array#map: IE9+
              `var ${result} = ${name}.map(function (${item}) {`,
              ...this.indent([
                ...typeVar.statements,
                `return ${typeVar.expression};`,
              ]),
              `});`,
            ],
            expression: result,
          }
        }
      } else if (type.typeSpec === cmd) {
        const result = this.genVarName('result')
        const typeVar = this.makeUnitConverter(
          result,
          type.typeVars[0],
          substitutions,
          toTypeVar,
          inTypeVar,
        )
        if (typeVar) {
          const callback = this.genVarName('callback')
          return {
            statements: [
              `function (${callback}) {`,
              `  return ${name}(function (${result}) {`,
              ...this.indent(
                this.indent([
                  ...typeVar.statements,
                  `${callback}(${typeVar.expression});`,
                ]),
              ),
              '  });',
              '}',
            ],
            expression: '',
          }
        }
      } else if (type.typeSpec === map) {
        throw new Error('TODO: Maps')
      } else if (EnumSpec.isEnum(type)) {
        const substituted = substitute(type, substitutions)
        if (!EnumSpec.isEnum(substituted)) {
          throw new Error('Substituted enum is not enum anymore??')
        }
        const typeSpec = type.typeSpec
        if (typeSpec !== substituted.typeSpec) {
          throw new Error('Odd, type spec changed??')
        }
        const from = normaliseEnum(toTypeVar ? type : substituted)
        const to = normaliseEnum(toTypeVar ? substituted : type)
        if (JSON.stringify(from) !== JSON.stringify(to)) {
          const rawEnum = this.genVarName('enum')
          const variants = fromEntries(typeSpec.variants, (name, variant) => [
            name,
            variant.types ?? [],
          ])
          const variantNames = [...typeSpec.variants.keys()]
          const toFields = (variantId: string | number) => {
            let fieldIndex = 0
            return `[${
              typeof variantId === 'number'
                ? variantId
                : variantNames.indexOf(variantId)
            }${variants[
              typeof variantId === 'number'
                ? variantNames[variantId]
                : variantId
            ].map(
              type =>
                `, ${
                  isUnitLike(type)
                    ? this.require('unit')
                    : this.makeUnitConverter(
                        `${name}[${fieldIndex++}]`,
                        type,
                        substitutions,
                        toTypeVar,
                        inTypeVar,
                      )
                }`,
            )}]`
          }
          // 1. Convert the enum to the common form (basically, the `enum`
          //    representation but with unit-like types filled in)
          const statements = [`var ${rawEnum};`]
          switch (from.type) {
            case 'unit': {
              statements.push(`${rawEnum} = ${toFields(0)};`)
              break
            }
            case 'bool': {
              statements.push(
                `if (${name}) {`,
                `  ${rawEnum} = ${toFields(1)};`,
                '} else {',
                `  ${rawEnum} = ${toFields(0)};`,
                '}',
              )
              break
            }
            case 'union': {
              for (let i = 0; i < variantNames.length; i++) {
                statements.push(
                  i === 0
                    ? `if (${name} === 0) {`
                    : i === variantNames.length - 1
                    ? '} else {'
                    : `} else if (${name} === ${i}) {`,
                  `  ${rawEnum} = ${toFields(i)}`,
                )
              }
              statements.push('}')
              break
            }
            case 'maybe': {
              if (from.null) {
                statements.push(
                  `if (${name} === undefined) {`,
                  `  ${rawEnum} = ${toFields(from.null)};`,
                  '} else {',
                  `  ${rawEnum} = ${toFields(from.nonNull)};`,
                  '}',
                )
              } else {
                statements.push(`${rawEnum} = ${toFields(from.nonNull)};`)
              }
              break
            }
            case 'tuple': {
              if (from.null) {
                //
              }
              break
            }
            case 'enum': {
              //
              break
            }
          }
        }
      } else if (!inTypeVar && type.typeSpec instanceof FuncTypeVarSpec) {
        const substitution = substitutions.get(type.typeSpec)
        if (substitution) {
          return this.makeUnitConverter(
            name,
            substitution,
            substitutions,
            toTypeVar,
            true,
          )
        }
      }
    }
    return null
  }
}
