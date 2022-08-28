import { CompiledModule } from '.'
import { CompilationContext } from '../compiler/CompilationContext'
import { cmd, str, unit } from '../type-checker/types/builtins'
import { makeFunction } from '../type-checker/types/types'

export default {
  variables: {
    inp: makeFunction(() => [str, cmd.instance([str])]),
    sendSTDOUT: makeFunction(() => [str, cmd.instance([unit])]),
  },

  compile(context: CompilationContext): CompiledModule {
    const inp = context.require('inp')
    const sendSTDOUT = context.require('sendSTDOUT')
    return {
      statements: [],
      exports: { inp, sendSTDOUT },
    }
  },
}
