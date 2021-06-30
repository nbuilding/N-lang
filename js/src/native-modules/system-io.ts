import { cmd, str } from '../type-checker/types/builtins'
import { makeFunction } from '../type-checker/types/types'

export default {
  variables: {
    inp: makeFunction(() => [str, cmd.instance([str])]),
  },
}
