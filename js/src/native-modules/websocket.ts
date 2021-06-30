import { bool, cmd, maybe, str, unit } from '../type-checker/types/builtins'
import {
  AliasSpec,
  makeFunction,
  makeRecord,
} from '../type-checker/types/types'

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
}
