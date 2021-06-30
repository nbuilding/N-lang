import { cmd, str, unit } from '../type-checker/types/builtins'
import { makeFunction } from '../type-checker/types/types'

export default {
  variables: {
    write: makeFunction(() => [str, str, cmd.instance([unit])]),
    append: makeFunction(() => [str, str, cmd.instance([unit])]),
    read: makeFunction(() => [str, cmd.instance([str])]),
  },
}
