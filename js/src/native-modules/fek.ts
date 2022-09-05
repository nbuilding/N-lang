import { CompiledModule } from '.';
import { CompilationContext } from '../compiler/CompilationContext';
import { cmd, str, unit } from '../type-checker/types/builtins';
import { makeFunction } from '../type-checker/types/types';

export default {
  variables: {
    paer: makeFunction(() => [str, cmd.instance([unit])]),
  },

  compile(context: CompilationContext): CompiledModule {
    const paer = context.require('paer');
    return {
      statements: [],
      exports: { paer },
    };
  },
};
