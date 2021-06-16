import { Base, Declaration, Identifier } from '../ast/index'
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
import { TypeCheckerResult } from './TypeChecker'
import { NFunction, NType, TypeSpec, unknown } from './types/types'
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
  returnType?: NType | 'top-level' | 'class'
  exportsAllowed?: boolean
}

export interface ScopeNames<T> {
  variables: T
  types: T
}

export class Scope {
  checker: TypeCheckerResult
  parent?: Scope
  /** The type of Scope; undefined to inherit from parent scope */
  returnType?: NType | 'top-level' | 'class'
  variables: Map<string, NType> = new Map()
  types: Map<string, TypeSpec | 'error'> = new Map()
  unused: ScopeNames<Map<string, Base>> = {
    variables: new Map(),
    types: new Map(),
  }
  exports: ScopeNames<Set<string>> | null = null
  deferred: (() => void)[] = []

  constructor (
    checker: TypeCheckerResult,
    parent?: Scope,
    { returnType, exportsAllowed }: ScopeOptions = {},
  ) {
    this.checker = checker
    this.parent = parent
    this.returnType = returnType
    if (exportsAllowed) {
      this.exports = { variables: new Set(), types: new Set() }
    }
  }

  inner (options?: ScopeOptions) {
    return new Scope(this.checker, this, options)
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

  getTypeFrom (base: Type): GetTypeResult {
    try {
      return base.getType(new GetTypeContext(this, base))
    } catch (err) {
      this.checker.errors.push({
        message: {
          type: ErrorType.INTERNAL_ERROR,
          error:
            err instanceof Error
              ? err
              : new TypeError(
                  `A non-Error of type ${displayType(err)} was thrown.`,
                ),
        },
        base,
      })
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
      this.checker.errors.push({
        message: {
          type: ErrorType.INTERNAL_ERROR,
          error:
            err instanceof Error
              ? err
              : new TypeError(
                  `A non-Error of type ${displayType(err)} was thrown.`,
                ),
        },
        base,
      })
      return {}
    }
  }

  checkStatement (base: Statement): CheckStatementResult {
    try {
      return base.checkStatement(new CheckStatementContext(this, base))
    } catch (err) {
      this.checker.errors.push({
        message: {
          type: ErrorType.INTERNAL_ERROR,
          error:
            err instanceof Error
              ? err
              : new TypeError(
                  `A non-Error of type ${displayType(err)} was thrown.`,
                ),
        },
        base,
      })
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
      this.checker.errors.push({
        message: {
          type: ErrorType.INTERNAL_ERROR,
          error:
            err instanceof Error
              ? err
              : new TypeError(
                  `A non-Error of type ${displayType(err)} was thrown.`,
                ),
        },
        base,
      })
      return unknown
    }
  }

  typeCheck (base: Expression): TypeCheckResult {
    try {
      const result = base.typeCheck(new TypeCheckContext(this, base))
      if (result.type) {
        this.checker.types.set(base, result.type)
      }
      return result
    } catch (err) {
      this.checker.errors.push({
        message: {
          type: ErrorType.INTERNAL_ERROR,
          error:
            err instanceof Error
              ? err
              : new TypeError(
                  `A non-Error of type ${displayType(err)} was thrown.`,
                ),
        },
        base,
      })
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
    for (const base of this.unused.variables.values()) {
      this.checker.warnings.push({
        message: {
          type: WarningType.UNUSED_VARIABLE,
        },
        base,
      })
    }
    for (const base of this.unused.types.values()) {
      this.checker.warnings.push({
        message: {
          type: WarningType.UNUSED_TYPE,
        },
        base,
      })
    }
  }
}
