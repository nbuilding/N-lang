import { CompiledModule } from '.';
import { CompilationContext } from '../compiler/CompilationContext';
import { cmd, int, map, maybe, str } from '../type-checker/types/builtins';
import { makeFunction, makeRecord } from '../type-checker/types/types';

export default {
  variables: {
    request: makeFunction(() => [
      str,
      str,
      maybe.instance([map.instance([str, str])]),
      maybe.instance([map.instance([str, str])]),
      cmd.instance([makeRecord({ code: int, response: str, text: str })]),
    ]),
  },

  compile(context: CompilationContext): CompiledModule {
    const request = context.require('request');
    return {
      statements: [],
      exports: { request },
    };
  },
};
