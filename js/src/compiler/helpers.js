function modulo (a, b) {
  return ((a % b) + b) % b
}

function assertValue (valueAssertionId, pass) {
  valueAssertionResults_n[valueAssertionId] = pass
}

// Assumptions:
// - a and b are of similar structure thanks to type checking.
// - Neither a nor b contain a function
function deepEqual (a, b) {
  if (typeof a === 'object') {
    // Array.isArray: IE9+
    if (Array.isArray(a)) {
      if (a.length !== b.length) {
        return false
      }
      for (var i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) {
          return false
        }
      }
    } else {
      // Object.keys: IE9+
      var keys = Object.keys(a)
      if (keys.length !== Object.keys(b).length) {
        return false
      }
      for (var i = 0; i < keys.length; i++) {
        if (keys[i] in b) {
          if (!deepEqual(a[keys[i]], b[keys[i]])) {
            return false
          }
        } else {
          return false
        }
      }
    }
    return true
  } else {
    return a === b
  }
}

function jsonValueToJs (value) {
  if (!value) {
    return null
  } else if (value[0] === 4) {
    // Array#map: IE9+
    return value[1].map(jsonValueToJs)
  } else if (value[0] === 5) {
    throw new Error('Not implemented')
  } else {
    return value[1]
  }
}

function jsValueToJson (value) {
  if (typeof value === 'object') {
    if (value === null) {
      return
    } else if (Array.isArray(value)) {
      // Array#map: IE9+
      return [4, value.map(jsValueToJson)]
    } else {
      throw new Error('Not implemented')
    }
  } else if (typeof value === 'string') {
    return [1, value]
  } else if (typeof value === 'number') {
    return [2, value]
  } else if (typeof value === 'boolean') {
    return [3, value]
  } else {
    throw new TypeError('This is not a JSON value.')
  }
}
