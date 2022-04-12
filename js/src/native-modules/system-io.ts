import { CompiledModule } from '.'
import { CompilationContext } from '../compiler/CompilationContext'
import { cmd, str } from '../type-checker/types/builtins'
import { makeFunction } from '../type-checker/types/types'

export default {
  variables: {
    inp: makeFunction(() => [str, cmd.instance([str])]),
  },

  compile(context: CompilationContext): CompiledModule {
    const inp = context.require('inp')
    return {
      statements: [],
      exports: { inp },
    }
  },
}
