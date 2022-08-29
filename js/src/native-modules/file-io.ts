import { CompiledModule } from '.'
import { CompilationContext } from '../compiler/CompilationContext'
import { cmd, int, list, str, unit } from '../type-checker/types/builtins'
import { makeFunction } from '../type-checker/types/types'

export default {
  variables: {
    write: makeFunction(() => [str, str, cmd.instance([unit])]),
    append: makeFunction(() => [str, str, cmd.instance([unit])]),
    read: makeFunction(() => [str, cmd.instance([str])]),
    
    writeBytes: makeFunction(() => [str, list.instance([int]), cmd.instance([unit])]),
    appendBytes: makeFunction(() => [str, list.instance([int]), cmd.instance([unit])]),
    readBytes: makeFunction(() => [str, cmd.instance([list.instance([int])])]),
  },

  compile(context: CompilationContext): CompiledModule {
    const write = context.require('write')
    const append = context.require('append')
    const read = context.require('read')
    
    const writeBytes = context.require('writeBytes')
    const appendBytes = context.require('appendBytes')
    const readBytes = context.require('readBytes')
    return {
      statements: [],
      exports: {
        write,
        append,
        read,
        writeBytes,
        appendBytes,
        readBytes,
      },
    }
  },
}
