import { CompiledModule } from '.'
import { CompilationContext } from '../compiler/CompilationContext'
import { cmd, str, unit } from '../type-checker/types/builtins'
import { makeFunction } from '../type-checker/types/types'

export default {
  variables: {
    paer: makeFunction(() => [str, cmd.instance([unit])]),
  },

  compile (context: CompilationContext): CompiledModule {
    const paer = context.genVarName('paer')
    return {
      statements: [
        `function ${paer}(value) {`,
        '  console.log(value);',
        `  return ${context.helpers.cmdWrap}();`,
        '}',
      ],
      exports: { paer },
    }
  },
}
