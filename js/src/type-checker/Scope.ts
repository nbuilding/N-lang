import { Base, Declaration } from '../ast/index'
import {
  Expression,
  TypeCheckContext,
  TypeCheckResult,
} from '../ast/expressions/Expression'
import {
  CheckStatementContext,
  CheckStatementResult,
  Statement,
} from '../ast/statements/Statement'
import { ErrorType } from './errors/Error'
import { TypeCheckerResultsForFile } from './TypeChecker'
import { NModule, NType, TypeSpec, unknown } from './types/types'
import {
  CheckPatternContext,
  CheckPatternResult,
  Pattern,
} from '../ast/patterns/Pattern'
import { GetTypeContext, GetTypeResult, Type } from '../ast/types/Type'
import { displayType } from '../utils/display-type'
import { DeclarationOptions } from '../ast/declaration/Declaration'
import { ScopeBaseContext } from './ScopeBaseContext'
import { WarningType } from './errors/Warning'

export interface ScopeOptions {
  returnType?: NType | 'class'
  exportsAllowed?: boolean
}

export interface ScopeNames<T> {
  variables: T
  types: T
}

export class Scope {
  results: TypeCheckerResultsForFile
  parent?: Scope
  /** The type of Scope; undefined to inherit from parent scope */
  returnType?: NType | 'class'
  variables: Map<string, NType> = new Map()
  types: Map<string, TypeSpec | 'error'> = new Map()
  unused: ScopeNames<Map<string, Base>> = {
    variables: new Map(),
    types: new Map(),
  }
  exports: ScopeNames<Set<string>> | null = null
  deferred: (() => void)[] = []

  constructor (
    results: TypeCheckerResultsForFile,
    parent?: Scope,
    { returnType, exportsAllowed }: ScopeOptions = {},
  ) {
    this.results = results
    this.parent = parent
    this.returnType = returnType
    if (exportsAllowed) {
      this.exports = { variables: new Set(), types: new Set() }
    }
  }

  inner (options?: ScopeOptions) {
    return new Scope(this.results, this, options)
  }

  getReturnType (): NType | null {
    if (typeof this.returnType !== 'string') {
      if (this.returnType) {
        return this.returnType
      } else if (this.parent) {
        return this.parent.getReturnType()
      }
    }
    return null
  }

  /**
   * Functions inside classes will return false; this is for warning about
   * exporting types.
   */
  inClass (): boolean {
    if (this.returnType) {
      return this.returnType === 'class'
    } else if (this.parent) {
      return this.parent.inClass()
    } else {
      return false
    }
  }

  getVariable (name: string, markAsUsed: boolean): NType | null {
    const type = this.variables.get(name)
    if (type) {
      if (markAsUsed) this.unused.variables.delete(name)
      return type
    } else if (this.parent) {
      return this.parent.getVariable(name, markAsUsed)
    } else {
      return null
    }
  }

  /**
   * null is the error type spec while undefined means it's not in scope
   */
  getType (name: string, markAsUsed: boolean): TypeSpec | 'error' | null {
    const type = this.types.get(name)
    if (type) {
      if (markAsUsed) this.unused.types.delete(name)
      return type
    } else if (this.parent) {
      return this.parent.getType(name, markAsUsed)
    } else {
      return null
    }
  }

  reportInternalError (error: unknown, base: Base) {
    this.results.errors.push({
      message: {
        type: ErrorType.INTERNAL_ERROR,
        error:
          error instanceof Error
            ? error
            : new TypeError(
                `A non-Error of type ${displayType(error)} was thrown.`,
              ),
      },
      base,
    })
  }

  getTypeFrom (base: Type): GetTypeResult {
    try {
      return base.getType(new GetTypeContext(this, base))
    } catch (err) {
      this.reportInternalError(err, base)
      return {
        type: unknown,
      }
    }
  }

  checkPattern (
    base: Pattern,
    idealType: NType,
    definite: boolean,
    isPublic: boolean,
  ): CheckPatternResult {
    try {
      return base.checkPattern(
        new CheckPatternContext(this, base, idealType, definite, isPublic),
      )
    } catch (err) {
      this.reportInternalError(err, base)
      return {}
    }
  }

  checkStatement (base: Statement): CheckStatementResult {
    try {
      return base.checkStatement(new CheckStatementContext(this, base))
    } catch (err) {
      this.reportInternalError(err, base)
      return {}
    }
  }

  checkDeclaration (
    base: Declaration,
    valueType?: NType,
    options?: DeclarationOptions,
  ): NType {
    try {
      return base.checkDeclaration(
        new ScopeBaseContext(this, base),
        valueType,
        options,
      )
    } catch (err) {
      this.reportInternalError(err, base)
      return unknown
    }
  }

  typeCheck (base: Expression): TypeCheckResult {
    try {
      const result = base.typeCheck(new TypeCheckContext(this, base))
      if (result.type) {
        this.results.parent.types.set(base, result.type)
      }
      return result
    } catch (err) {
      this.reportInternalError(err, base)
      return {
        type: unknown,
      }
    }
  }

  end () {
    for (const deferred of this.deferred) {
      deferred()
    }
    if (this.exports) {
      for (const name of this.exports.variables) {
        this.unused.variables.delete(name)
      }
      for (const name of this.exports.types) {
        this.unused.types.delete(name)
      }
    }
    for (const [name, declaration] of this.unused.variables) {
      this.results.warnings.push({
        message: {
          type: WarningType.UNUSED,
          name,
          value: 'variable',
        },
        base: declaration,
      })
    }
    for (const [name, declaration] of this.unused.types) {
      this.results.warnings.push({
        message: {
          type: WarningType.UNUSED,
          name,
          value: 'type',
        },
        base: declaration,
      })
    }
  }

  /**
   * Captures current exports into a module type
   */
  toModule (path: string): NModule {
    if (!this.exports) {
      throw new Error('This scope does not have exports')
    }
    return {
      type: 'module',
      path,
      types: new Map(
        Array.from(this.exports.variables, name => {
          const type = this.variables.get(name)
          if (!type) throw new Error(`Where did the export go for ${name}?`)
          return [name, type]
        }),
      ),
      exportedTypes: new Map(
        Array.from(this.exports.variables, name => {
          const type = this.types.get(name)
          if (!type) throw new Error(`Where did the export go for ${name}?`)
          return [name, type]
        }),
      ),
    }
  }
}
