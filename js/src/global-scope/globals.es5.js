function yes(value) {
  return value;
}

function ok(value) {
  return [0, value];
}

function err(value) {
  return [1, value];
}

function int__intInBase10(int) {
  return int.toString();
}

function float__round(n) {
  if (isFinite(n)) {
    return Math.round(n);
  } else {
    return 0;
  }
}

function float__floor() {
  if (isFinite(n)) {
    return Math.floor(n);
  } else {
    return 0;
  }
}

function float__ceil() {
  if (isFinite(n)) {
    return Math.ceil(n);
  } else {
    return 0;
  }
}

function char__charCode(char) {
  if (char.length === 1) {
    return char.charCodeAt(0);
  } else {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/charCodeAt#fixing_charcodeat_to_handle_non-basic-multilingual-plane_characters_if_their_presence_earlier_in_the_string_is_unknown
    return (
      (char.charCodeAt(0) - 0xd800) * 0x400 +
      (char.charCodeAt(1) - 0xdc00) +
      0x10000
    );
  }
}

function int__intCode(code) {
  if (code < 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) {
    return '\uFFFD';
  } else if (code > 0xffff) {
    code -= 0x10000;
    return String.fromCharCode(
      Math.floor(code / 0x400) + 0xd800,
      (code % 0x400) + 0xdc00,
    );
  } else {
    return String.fromCharCode(code);
  }
}

function str__charAt(string) {
  return function (index) {
    if (index < 0) {
      // Return none
      return function () {};
    } else {
      if (index >= string.length * 2) {
        // Early exit, assuming the worst case where the string is full of
        // surrogate pairs
        return;
      }
      var i = 0;
      var codePoint;
      for (var j = 0; j < index; j++) {
        codePoint = string.charCodeAt(i);
        if (codePoint >= 0xd800 && codePoint <= 0xdbff) {
          // Assumes the string is well-formed UTF-8
          i += 2;
        } else {
          ++i;
        }
        if (i >= string.length) return;
      }
      codePoint = string.charCodeAt(i);
      if (codePoint >= 0xd800 && codePoint <= 0xdbff) {
        return string.slice(i, i + 2);
      } else {
        return string[i];
      }
    }
  };
}

function str__substring(string) {
  return function (start) {
    return function (end) {
      if (start === end || (start >= 0 && end >= 0 && start > end)) {
        return '';
      } else {
        return string.slice(start, end);
      }
    };
  };
}

function str__len(value) {
  var highSurrogates = 0;
  for (var i = 0; i < value.length; i++) {
    var codePoint = value.charCodeAt(i);
    if (codePoint >= 0xd800 && codePoint <= 0xdbff) {
      ++highSurrogates;
    }
  }
  // Subtract a surrogate from each pair
  return value.length - highSurrogates;
}

function list__len(value) {
  return value.length;
}

function str__split(string) {
  return function (char) {
    if (string === '') {
      return [];
    } else {
      return string.split(char);
    }
  };
}

function str__strip(string) {
  // String#trim: IE10+
  return string.trim();
}

function range(start) {
  return function (end) {
    if (start === end) {
      return function () {
        return [];
      };
    } else {
      return function (step) {
        if (step === 0) {
          throw new Error('Undefined behaviour. See nbuilding/N-lang#246');
        }
        var numbers = [];
        if (step > 0) {
          if (end < start) {
            return [];
          }
          for (var i = start; i < end; i += step) {
            numbers.push(i);
          }
        } else {
          if (end > start) {
            return [];
          }
          for (var i = start; i > end; i += step) {
            numbers.push(i);
          }
        }
        return numbers;
      };
    }
  };
}

function print(value) {
  // TODO: Prettify
  console.log(value);
  return value;
}

function list__itemAt(list) {
  return function (index) {
    if (index < 0) {
      return;
    } else {
      return list[index];
    }
  };
}

function list__append(list) {
  return function (item) {
    return list.concat([item]);
  };
}

function list__filterMap(list) {
  return function (transform) {
    var newList = [];
    for (var i = 0; i < list.length; i++) {
      var result = transform(list[i]);
      if (result !== undefined) {
        newList.push(result);
      }
    }
    return newList;
  };
}

function maybe__default_(maybe) {
  return function (defaultValue) {
    if (maybe === undefined) {
      return defaultValue;
    } else {
      return maybe;
    }
  };
}

function cmd__then(cmd) {
  return function (onCmdFinish) {
    return function (callback) {
      cmd(function (result) {
        onCmdFinish(result)(callback);
      });
    };
  };
}

function mapFrom(entries) {
  let out = new Map();
  for (const entry of entries) {
    out.set(entry[0], entry[1]);
  }
  return out;
}

function map__getValue(map) {
  return function (key) {
    return map.get(key);
  };
}

function map__entries(map) {
  return Array.from(map.entries());
}

function int__toFloat(int) {
  // ints and floats are the same in js lol
  return int;
}
