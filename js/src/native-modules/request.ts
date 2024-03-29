import { CompiledModule } from '.'
import { CompilationContext } from '../compiler/CompilationContext'
import { cmd, int, map, str } from '../type-checker/types/builtins'
import { makeFunction, makeRecord } from '../type-checker/types/types'
import { value } from './json'

export default {
  variables: {
    post: makeFunction(() => [
      str,
      map.instance([str, str]),
      map.instance([str, str]),
      cmd.instance([makeRecord({ code: int, response: str, text: str })]),
    ]),
    get: makeFunction(() => [
      str,
      map.instance([str, str]),
      cmd.instance([
        makeRecord({ code: int, response: str, return: value.instance() }),
      ]),
    ]),
  },

  compile(context: CompilationContext): CompiledModule {
    const post = context.require('post')
    const get = context.require('get')
    return {
      statements: [],
      exports: { post, get },
    }
  },
}
