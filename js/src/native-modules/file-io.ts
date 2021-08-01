import { CompiledModule } from '.'
import { CompilationContext } from '../compiler/CompilationContext'
import { cmd, str, unit } from '../type-checker/types/builtins'
import { makeFunction } from '../type-checker/types/types'

export default {
  variables: {
    write: makeFunction(() => [str, str, cmd.instance([unit])]),
    append: makeFunction(() => [str, str, cmd.instance([unit])]),
    read: makeFunction(() => [str, cmd.instance([str])]),
  },

  compile (context: CompilationContext): CompiledModule {
    const write = context.genVarName('write')
    const append = context.genVarName('append')
    const read = context.genVarName('read')
    return {
      statements: ['// TODO: FileIO'],
      exports: { write, append, read },
    }
  },
}
