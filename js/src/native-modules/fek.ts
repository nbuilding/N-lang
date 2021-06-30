import { cmd, str, unit } from '../type-checker/types/builtins'
import { makeFunction } from '../type-checker/types/types'

export default {
  variables: {
    paer: makeFunction(() => [str, cmd.instance([unit])]),
  },
}
