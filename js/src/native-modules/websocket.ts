import { CompiledModule } from '.'
import { CompilationContext } from '../compiler/CompilationContext'
import { bool, cmd, maybe, str, unit } from '../type-checker/types/builtins'
import { makeFunction, makeRecord } from '../type-checker/types/types'
import { AliasSpec } from '../type-checker/types/TypeSpec'

const send = new AliasSpec(
  'send',
  makeFunction(() => [str, cmd.instance([unit])]),
)
const connectOptions = new AliasSpec(
  'connectOptions',
  makeRecord({
    onOpen: makeFunction(() => [send.instance(), cmd.instance([bool])]),
    onMessage: makeFunction(() => [send.instance(), str, cmd.instance([bool])]),
  }),
)

export default {
  variables: {
    connect: makeFunction(() => [
      connectOptions.instance(),
      str,
      cmd.instance([maybe.instance([str])]),
    ]),
  },
  types: {
    send,
    connectOptions,
  },

  compile (context: CompilationContext): CompiledModule {
    const connect = context.genVarName('connect')
    return {
      statements: ['// TODO: websocket'],
      exports: { connect },
    }
  },
}
