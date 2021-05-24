import { Declaration } from '../ast/index'
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
import { NType, TypeSpec, unknown } from './types/types'
import {
  CheckPatternContext,
  CheckPatternResult,
  Pattern,
} from '../ast/patterns/Pattern'
import { GetTypeContext, GetTypeResult, Type } from '../ast/types/Type'
import { displayType } from '../utils/display-type'
import { DeclarationOptions } from '../ast/declaration/Declaration'
import { ScopeBaseContext } from './ScopeBaseContext'

export interface ScopeOptions {
  returnType?: NType
  exportsAllowed?: boolean
}

export interface ScopeNames {
  variables: Set<string>
  types: Set<string>
}

export class Scope {
  checker: TypeCheckerResult
  parent?: Scope
  returnType?: NType
  variables: Map<string, NType> = new Map()
  types: Map<string, TypeSpec | null> = new Map()
  unused: ScopeNames = { variables: new Set(), types: new Set() }
  exports: ScopeNames | null = null

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

  getReturnType (): NType | undefined {
    if (this.returnType) {
      return this.returnType
    } else if (this.parent) {
      return this.parent.getReturnType()
    } else {
      return undefined
    }
  }

  getVariable (name: string, markAsUsed: boolean): NType | undefined {
    const type = this.variables.get(name)
    if (type === undefined) {
      if (this.parent) {
        return this.parent.getVariable(name, markAsUsed)
      } else {
        return undefined
      }
    } else {
      if (markAsUsed) this.unused.variables.delete(name)
      return type
    }
  }

  /**
   * null is the error type spec while undefined means it's not in scope
   */
  getType (name: string, markAsUsed: boolean): TypeSpec | null | undefined {
    const type = this.types.get(name)
    if (type === undefined) {
      if (this.parent) {
        return this.parent.getType(name, markAsUsed)
      } else {
        return undefined
      }
    } else {
      if (markAsUsed) this.unused.types.delete(name)
      return type
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
    // TODO: unused variables, types
  }
}
