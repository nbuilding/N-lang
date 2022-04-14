(function () {
  var undefined; // This helps minifiers to use a shorter variable name than `void 0`.
  var valueAssertionResults_n = {};
  for (var i = 0; i < 2; i++) {
    valueAssertionResults_n[i] = false;
  }
  function assertValue_9(valueAssertionId, pass) {
    valueAssertionResults_n[valueAssertionId] = pass;
  }
  function print_17(value) {
    console.log(value);
    return value;
  }
  var unit_24 = {};
  var null_29;
  function string_30(str) {
    return [1, str];
  }
  function number_31(float) {
    return [2, float];
  }
  function boolean_32(bool) {
    return [3, bool];
  }
  function array_33(list) {
    return [4, list];
  }
  function object_34(map) {
    return [5, map];
  }
  function jsValueToJson_36(value) {
    if (!value) return [0, null];
    if (Array.isArray(value)) return [4, value.map((v) => jsValueToJson_36(v))];
    switch (typeof value) {
      case "string":
        return [1, value];
      case "number":
        return [2, value];
      case "boolean":
        return [3, value];
      case "object":
        return [
          5,
          Object.fromEntries(
            Object.entries(value[1]).map((v) => [v[0], jsValueToJson_36(v[1])])
          ),
        ];
      default:
        throw new Error("Value passed in not JSON");
    }
  }
  function parse_35(json) {
    try {
      return jsValueToJson_36(JSON.parse(json));
    } catch (_) {
      return;
    }
  }
  function parseSafe_37(json) {
    try {
      return jsValueToJson_36(JSON.parse(json));
    } catch (_) {
      return;
    }
  }
  function jsonValueToJs_39(value) {
    switch (value[0]) {
      case 0:
        return null;
      case 1:
      case 2:
      case 3:
        return value[1];
      case 4:
        return value[1].map((v) => jsonValueToJs_39(v));
      case 5:
        return Object.fromEntries(
          Object.entries(value[1]).map((v) => [v[0], jsonValueToJs_39(v[1])])
        );
      default:
        throw new Error("Value passed in not JSON");
    }
  }
  function stringify_38(value) {
    // JSON.stringify_38: IE8+
    return JSON.stringify_38(jsonValueToJs_39(value));
  }
  function inp_42(question) {
    return function (callback) {
      console.log("Please help me");
      return new Promise((resolve, reject) =>
        process.stdin.once(question, callback)
      );
    };
  }
  var funcExpr_0 = function () {
    return "hello";
  };
  var hello_1;
  hello_1 = funcExpr_0;
  var funcExpr_2 = function () {
    return;
  };
  var unused_3;
  unused_3 = funcExpr_2;
  var testImport_6;
  testImport_6 = undefined;
  var compA_7 = { a: "pi", b: 3.14 },
    compB_8 = { b: 3.14, a: "pi" };
  assertValue_9(0, compA_7.b === compB_8.b && compA_7.a === compB_8.a);
  var listvalue_10;
  listvalue_10 = ["a", "b", "c"];
  var compA_11 = listvalue_10,
    compB_12 = ["a", "b", "c"];
  assertValue_9(
    1,
    compA_11.length === compB_12.length &&
      compA_11.every(function (item, i) {
        return item === compB_12[i];
      })
  );
  var _ok_13 = function (enumConstructorArg_14) {
    return [0, enumConstructorArg_14];
  };
  var _err_15 = function (enumConstructorArg_16) {
    return [1, enumConstructorArg_16];
  };
  print_17({ c: true, b: "OK", a: 200 });
  print_17({ c: "true", b: "OK", a: 200 }.c);
  var funcExpr_18 = function () {
    return;
  };
  var funcExpr_19 = function () {
    return;
  };
  print_17({ b: funcExpr_18, a: funcExpr_19 });
  print_17(hello_1());
  var funcExpr_22 = print_17;
  var transform_21 = function (arg_20) {
    var return_23 = funcExpr_22(unit_24);
    return unit_24;
  };
  transform_21();
  var funcExpr_27 = print_17;
  var transform_26 = function (arg_25) {
    var return_28 = funcExpr_27(arg_25);
    return return_28;
  };
  transform_26(parse_35("[1, 2, 3, 4, 5]"));
  var funcExpr_40 = function () {
    return function (callback_41) {
      print_17("hello!jsakldjfsaj;kldfjskald");
      inp_42("Hello: ")(function (cmdResult_43) {
        print_17(cmdResult_43);
        callback_41();
      });
    };
  };
  var thing_44;
  thing_44 = funcExpr_40;
  var out_45;
  out_45 = thing_44();
  function main_46(callback) {
    if (typeof Promise !== "undefined") {
      return new Promise(function (resolve) {
        out_45(function (result) {
          resolve(result);
          if (callback) callback(result);
        });
      });
    } else {
      out_45(function (result) {
        if (callback) callback(result);
      });
    }
  }
  return {
    valueAssertions: valueAssertionResults_n,
    main: main_46,
  };
})();
