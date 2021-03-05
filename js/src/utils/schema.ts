import { displayType } from './display-type'

// Based on Zod: https://github.com/colinhacks/zod/blob/v3/src/types/base.ts

export interface Guard<T> {
  _output: T
  name: string

  check (value: unknown): asserts value is T
}

export type infer<T extends Guard<any>> = T['_output']

export class GuardError extends Error {
  value: any

  constructor (value: any, shouldBe: string) {
    super(`${value} should be ${shouldBe}, but it's ${displayType(value)}.`)
    this.name = this.constructor.name
    this.value = value
  }
}

type TupleGuards<T extends [any, ...any[]] | []> = {
  [index in keyof T]: Guard<T[index]>
} & Array<Guard<any>>

class Tuple<T extends [any, ...any[]] | []> implements Guard<T> {
  guards: TupleGuards<T>
  name = 'array'
  readonly _output!: T

  constructor (guards: TupleGuards<T>) {
    this.guards = guards
  }

  check (value: unknown): asserts value is T {
    if (Array.isArray(value)) {
      if (value.length !== this.guards.length) {
        throw new GuardError(value, `${this.guards.length} item(s)`)
      }
      value.forEach((item, index) => {
        const guard: { check: (value: unknown) => void } = this.guards[index]
        guard.check(item)
      })
    } else {
      throw new GuardError(value, this.name)
    }
  }
}

class Union<T extends [any, any, ...any[]] | []> implements Guard<T[number]['_output']> {
  guards: TupleGuards<T>
  name: string
  readonly _output!: T[number]['_output']

  constructor (guards: TupleGuards<T>) {
    this.guards = guards
    this.name = guards.map(guard => guard.name).join(' or ')
  }

  check (value: unknown): asserts value is T[number]['_output'] {
    for (const guard of this.guards) {
      try {
        guard.check(value)
        return
      } catch {
        continue
      }
    }
    throw new GuardError(value, this.name)
  }
}

class Null implements Guard<null> {
  name = 'null'
  readonly _output!: null

  check (value: unknown): asserts value is null {
    if (value !== null) {
      throw new GuardError(value, this.name)
    }
  }
}

type Constructor<T> = { new (...args: any[]): T }

class Instance<T> implements Guard<T> {
  classConstructor: Constructor<T>
  name: string
  readonly _output!: T

  constructor (classConstructor: Constructor<T>) {
    this.classConstructor = classConstructor
    this.name = this.classConstructor.name
  }

  check (value: unknown): asserts value is T {
    if (!(value instanceof this.classConstructor)) {
      throw new GuardError(value, this.name)
    }
  }
}

class Any implements Guard<any> {
  name = 'any'
  readonly _output!: any

  check (_value: unknown): asserts _value is any {
    return
  }
}

class Guarded<T> implements Guard<T> {
  guard: (value: unknown) => value is T
  name: string
  readonly _output!: T

  constructor (guard: (value: unknown) => value is T, name?: string) {
    this.guard = guard
    this.name = name || `satisfier of ${guard.name || 'a type guard'}`
  }

  check (value: unknown): asserts value is any {
    if (!this.guard(value)) {
      throw new GuardError(value, this.name)
    }
  }
}

class ArrayOf<T> implements Guard<T[]> {
  guard: Guard<T>
  name: string
  readonly _output!: T[]

  constructor (guard: Guard<T>) {
    this.guard = guard
    this.name = `array of ${guard.name}`
  }

  check (value: unknown): asserts value is T[] {
    if (Array.isArray(value)) {
      for (const item of value) {
        this.guard.check(item)
      }
    } else {
      throw new GuardError(value, 'array')
    }
  }
}

class Nullable<T> implements Guard<T | null> {
  guard: Guard<T>
  name: string
  readonly _output!: T | null

  constructor (guard: Guard<T>) {
    this.guard = guard
    this.name = `nullable ${guard.name}`
  }

  check (value: unknown): asserts value is T | null {
    if (value !== null) {
      this.guard.check(value)
    }
  }
}

export default {
  null: new Null(),
  any: new Any(),

  nullable<T> (guard: Guard<T>): Nullable<T> {
    return new Nullable(guard)
  },

  tuple<T extends [any, ...any[]] | []> (validators: TupleGuards<T>): Guard<T> {
    return new Tuple(validators)
  },

  array<T> (guard: Guard<T>): Guard<T[]> {
    return new ArrayOf(guard)
  },

  instance<T> (classConstructor: Constructor<T>): Guard<T> {
    return new Instance(classConstructor)
  },

  guard<T> (guard: (value: unknown) => value is T, name?: string): Guard<T> {
    if (guard === undefined) {
      throw new Error('TypeScript is big dumb and didn\'t catch you passing in undefined for the type guard function, but I did!')
    }
    return new Guarded(guard, name)
  },

  union<T extends [any, any, ...any[]] | []> (validators: TupleGuards<T>): Guard<T[number]> {
    return new Union(validators)
  },
}
