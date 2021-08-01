import { CompiledModule } from '.'
import { CompilationContext } from '../compiler/CompilationContext'
import { cmd, int, unit } from '../type-checker/types/builtins'
import { makeFunction } from '../type-checker/types/types'

export default {
  variables: {
    sleep: makeFunction(() => [int, cmd.instance([unit])]),
  },

  compile (context: CompilationContext): CompiledModule {
    const sleep = context.genVarName('sleep')
    return {
      statements: [
        `function ${sleep}(delay) {`,
        `  return function (callback) {`,
        '    setTimeout(callback, delay);',
        '  };',
        '}',
      ],
      exports: { sleep },
    }
  },
}
