(function () {
  var undefined; // This helps minifiers to use a shorter variable name than `void 0`.
  var valueAssertionResults_n = {};
  for (var i = 0; i < 2; i++) {
    valueAssertionResults_n[i] = false;
  }
  function assertValue_8(valueAssertionId, pass) {
    valueAssertionResults_n[valueAssertionId] = pass;
  }
  function print_16(value) {
    console.log(value);
    return value;
  }
  var unit_23 = {};
  var null_28;
  function string_29(str) {
    return [1, str];
  }
  function number_30(float) {
    return [2, float];
  }
  function boolean_31(bool) {
    return [3, bool];
  }
  function array_32(list) {
    return [4, list];
  }
  function object_33(map) {
    return [5, map];
  }
  function jsValueToJson_35(value) {
    if (!value) return [0, null]
    if (Array.isArray(value)) return [4, value.map(v => jsValueToJson_35(v))]
    switch (typeof value) {
      case "string":
        return [1, value]
      case "number":
        return [2, value]
      case "boolean":
        return [3, value]
      default:
        return [5, Object.fromEntries(Object.entries(value[1]).map(v => [v[0], jsValueToJson_35(v[1])]))]
    }
  }
  function parse_34(json) {
    try {
      return jsValueToJson_35(JSON.parse(json));
    } catch (_) {
      return;
    }
  }
  function parseSafe_36(json) {
    try {
      return jsValueToJson_35(JSON.parse(json));
    } catch (_) {
      return;
    }
  }
  function jsonValueToJs_38(value) {
    switch (value[0]) {
      case 0:
        return null
      case 1:
      case 2:
      case 3:
        return value[1]
      case 4:
        return value[1].map(v => jsonValueToJs_38(v))
      default:
        return Object.fromEntries(Object.entries(value[1]).map(v => [v[0], jsonValueToJs_38(v[1])]))
    }
  }
  function stringify_37(value) {
    // JSON.stringify_37: IE8+
    return JSON.stringify_37(jsonValueToJs_38(value));
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
  var testImport_5;
  testImport_5 = undefined;
  var compA_6 = { a: "pi", b: 3.14 }, compB_7 = { b: 3.14, a: "pi" };
  assertValue_8(0, compA_6.b === compB_7.b && compA_6.a === compB_7.a);
  var listvalue_9;
  listvalue_9 = ["a", "b", "c"];
  var compA_10 = listvalue_9, compB_11 = ["a", "b", "c"];
  assertValue_8(1, compA_10.length === compB_11.length && compA_10.every(function (item, i) { return item === compB_11[i] }));
  var _ok_12 = function (enumConstructorArg_13) {
    return [0, enumConstructorArg_13];
  };
  var _err_14 = function (enumConstructorArg_15) {
    return [1, enumConstructorArg_15];
  };
  (print_16)({ c: true, b: "OK", a: 200 });
  (print_16)(({ c: "true", b: "OK", a: 200 }).c);
  var funcExpr_17 = function () {
    return;
  };
  var funcExpr_18 = function () {
    return;
  };
  (print_16)({ b: funcExpr_17, a: funcExpr_18 });
  (print_16)((hello_1)());
  var funcExpr_21 = (print_16);
  var transform_20 = function (arg_19) {
    var return_22 = funcExpr_21(unit_23);
    return unit_23;
  };
  transform_20();
  var funcExpr_26 = (print_16);
  var transform_25 = function (arg_24) {
    var return_27 = funcExpr_26(arg_24);
    return return_27;
  };
  transform_25((parse_34)("[1, 2, 3, 4, 5]"));
  function main_39(callback) {
    if (callback) callback();
    if (typeof Promise !== "undefined") {
      return Promise.resolve()
    }
  }
  return {
    valueAssertions: valueAssertionResults_n,
    main: main_39,
  };
})();
