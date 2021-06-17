import { cmd, int, unit } from '../type-checker/types/builtins'
import { makeFunction } from '../type-checker/types/types'

export default {
  variables: {
    sleep: makeFunction(() => [int, cmd.instance([unit])]),
  },
}
