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
}
