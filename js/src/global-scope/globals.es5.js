function yes (value) {
  return value
}

function ok (value) {
  return [0, value]
}

function err (value) {
  return [1, value]
}

function intInBase10 (int) {
  return int.toString()
}

function round (n) {
  if (isFinite(n)) {
    return Math.round(n)
  } else {
    return 0
  }
}

function floor () {
  if (isFinite(n)) {
    return Math.floor(n)
  } else {
    return 0
  }
}

function ceil () {
  if (isFinite(n)) {
    return Math.ceil(n)
  } else {
    return 0
  }
}

function charCode (char) {
  if (char.length === 1) {
    return char.charCodeAt(0)
  } else {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/charCodeAt#fixing_charcodeat_to_handle_non-basic-multilingual-plane_characters_if_their_presence_earlier_in_the_string_is_unknown
    return (
      (char.charCodeAt(0) - 0xd800) * 0x400 +
      (char.charCodeAt(1) - 0xdc00) +
      0x10000
    )
  }
}

function intCode (code) {
  if (code < 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) {
    return '\uFFFD'
  } else if (code > 0xffff) {
    code -= 0x10000
    return String.fromCharCode(
      Math.floor(code / 0x400) + 0xd800,
      (code % 0x400) + 0xdc00,
    )
  } else {
    return String.fromCharCode(code)
  }
}

function charAt (index) {
  if (index < 0) {
    // Return none
    return function () {}
  } else {
    return function (string) {
      if (index >= string.length * 2) {
        // Early exit, assuming the worst case where the string is full of
        // surrogate pairs
        return
      }
      var i = 0
        var codePoint
      for (var j = 0; j < index; j++) {
        codePoint = string.charCodeAt(i)
        if (codePoint >= 0xd800 && codePoint <= 0xdbff) {
          // Assumes the string is well-formed UTF-8
          i += 2
        } else {
          ++i
        }
        if (i >= string.length) return
      }
      codePoint = string.charCodeAt(i)
      if (codePoint >= 0xd800 && codePoint <= 0xdbff) {
        return string.slice(i, i + 2)
      } else {
        return string[i]
      }
    }
  }
}

function substring (start) {
  return function (end) {
    if (start === end || (start >= 0 && end >= 0 && start > end)) {
      return function () {
        return ''
      }
    } else {
      return function (string) {
        return string.slice(start, end)
      }
    }
  }
}

function len (value) {
  if (typeof value === 'string') {
    var highSurrogates = 0
    for (var i = 0; i < string.length; i++) {
      var codePoint = string.charCodeAt(i)
      if (codePoint >= 0xd800 && codePoint <= 0xdbff) {
        ++highSurrogates
      }
    }
    // Subtract a surrogate from each pair
    return string.length - highSurrogates
  } else if (Array.isArray(value)) {
    // Array.isArray: IE9+
    return value.length
  } else {
    return 0
  }
}

function split (char) {
  return function (string) {
    if (string === '') {
      return []
    } else {
      return string.split(char)
    }
  }
}

function strip (string) {
  // String#trim: IE10+
  return string.trim()
}

function range (start) {
  return function (end) {
    if (start === end) {
      return function () {
        return []
      }
    } else {
      return function (step) {
        if (step === 0) {
          throw new Error('Undefined behaviour. See nbuilding/N-lang#246')
        }
        var numbers = []
        if (step > 0) {
          if (end < start) {
            return []
          }
          for (var i = start; i < end; i += step) {
            numbers.push(i)
          }
        } else {
          if (end > start) {
            return []
          }
          for (var i = start; i > end; i += step) {
            numbers.push(i)
          }
        }
        return numbers
      }
    }
  }
}

function print (value) {
  // TODO: Prettify
  console.log(value, typeof value)
  return value
}

function itemAt (index) {
  if (index < 0) {
    return function () {}
  } else {
    return function (list) {
      return list[index]
    }
  }
}

function append (item) {
  return function (list) {
    return list.concat([item])
  }
}

function filterMap (transform) {
  return function (list) {
    var newList = []
    for (var i = 0; i < list.length; i++) {
      var result = transform(list[i])
      if (result !== undefined) {
        newList.push(result)
      }
    }
    return newList
  }
}

function default_ (defaultValue) {
  return function (maybe) {
    if (maybe === undefined) {
      return defaultValue
    } else {
      return maybe
    }
  }
}

function then (onCmdFinish) {
  return function (cmd) {
    return function (callback) {
      cmd(function (result) {
        onCmdFinish(result)(callback)
      })
    }
  }
}

function mapFrom (entries) {
  throw new Error('Not implemented')
}

function getValue (key) {
  throw new Error('Not implemented')
}

function entries (map) {
  throw new Error('Not implemented')
}
