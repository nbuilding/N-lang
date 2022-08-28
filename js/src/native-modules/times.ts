import { CompiledModule } from '.'
import { CompilationContext } from '../compiler/CompilationContext'
import { cmd, int, unit } from '../type-checker/types/builtins'
import { makeFunction } from '../type-checker/types/types'

export default {
  variables: {
    sleep: makeFunction(() => [int, cmd.instance([unit])]),
    getTime: makeFunction(() => [unit, cmd.instance([int])]),
  },

  compile(context: CompilationContext): CompiledModule {
    const sleep = context.require('sleep')
    const getTime = context.require('getTime')
    return {
      statements: [],
      exports: { sleep, getTime },
    }
  },
}
