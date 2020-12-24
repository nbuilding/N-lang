import NType, * as types from "./n-type"

export class Module {
  // null means that a module has been loaded, but it failed to load. This helps
  // suppress subsequent errors (like "null" for the error type).
  modules: Map<string, Module | null>
  values: Map<string, NType>
  types: Map<string, NType>

  constructor (modules: Map<string, Module>, values: Map<string, NType>, types: Map<string, NType>) {
    this.modules = modules
    this.values = values
    this.types = types
  }

  getModule (moduleName: string): Module | null | undefined {
    return this.modules.get(moduleName)
  }

  static from ({ modules, values, types }: {
    modules?: { [name: string]: Module },
    values?: { [name: string]: NType },
    types?: { [name: string]: NType },
  }): Module {
    return new Module(
      modules ? new Map(Object.entries(modules)) : new Map(),
      values ? new Map(Object.entries(values)) : new Map(),
      types ? new Map(Object.entries(types)) : new Map(),
    )
  }
}

export const nativeModules: { [name: string]: Module } = {}

nativeModules.fek = Module.from({
  values: {
    // TEMP: No generics yet :(
    paer: types.func(types.string(), types.string()),
  },
})

const futureArray = types.custom([])
nativeModules.future = Module.from({
  values: {
    split: types.func(types.string(), types.func(types.string(), futureArray)),
    join: types.func(types.string(), types.func(futureArray, types.string())),
    // TEMP: No generics yet :(
    map: types.func(types.func(types.string(), types.int()), types.func(futureArray, futureArray)),
    length: types.func(futureArray, types.int()),
    get: types.func(types.int(), types.func(futureArray, types.int())),
    strToIntOrZero: types.func(types.string(), types.int()),
  },
  types: {
    array: futureArray,
  },
})
