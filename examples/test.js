(function () {
  var undefined; // This helps minifiers to use a shorter variable name than `void 0`.
  var valueAssertionResults_n = {};
  for (var i = 0; i < 2; i++) {
    valueAssertionResults_n[i] = false;
  }
  function assertValue_6(valueAssertionId, pass) {
    valueAssertionResults_n[valueAssertionId] = pass;
  }
  function print_14(value) {
    console.log(value);
    return value;
  }
  function null_21() {
    return [0, null];
  }
  function string_22(str) {
    return [1, str];
  }
  function number_23(float) {
    return [2, float];
  }
  function boolean_24(bool) {
    return [3, bool];
  }
  function array_25(list) {
    return [4, list];
  }
  function object_26(map) {
    return [5, map];
  }
  function parse_27(json) {
    try {
      console.log(JSON.parse(json))
      return jsValueToJson_30(JSON.parse(json));
    } catch (_) {
      return;
    }
  }
  function parseSafe_28(json) {
    try {
      return [jsValueToJson_30(JSON.parse(json))];
    } catch (_) {
      return;
    }
  }
  function stringify_29(value) {
    // JSON.stringify: IE8+
    return JSON.stringify(jsonValueToJs_31(value));
  }
  function jsonValueToJs_31(value) {
    switch (value[0]) {
      case 0:
        return null
      case 1:
      case 2:
      case 3:
        return value[1]
      case 4:
        return value[1].map(v => jsonValueToJs_31(v))
      default:
        return Object.fromEntries(Object.entries(value[1]).map(v => [v[0], jsonValueToJs_31(v[1])]))
    }
  }
  function jsValueToJson_30(value) {
    if (!value) return [0, null]
    if (Array.isArray(value)) return [4, value.map(v => jsValueToJson_30(v))]
    switch (typeof value) {
      case "string":
        return [1, value]
      case "number":
        return [2, value]
      case "boolean":
        return [3, value]
      default:
        return [5, Object.fromEntries(Object.entries(value[1]).map(v => [v[0], jsValueToJson_30(v[1])]))]
    }
  }
  var funcExpr_0 = function () {
    return "hello";
  };
  var hello_1;
  hello_1 = funcExpr_0;
  var testImport_3;
  testImport_3 = undefined;
  var compA_4 = { a: "pi", b: 3.14 }, compB_5 = { b: 3.14, a: "pi" };
  assertValue_6(0, compA_4.b === compB_5.b && compA_4.a === compB_5.a);
  var listvalue_7;
  listvalue_7 = ["a", "b", "c"];
  var compA_8 = listvalue_7, compB_9 = ["a", "b", "c"];
  assertValue_6(1, compA_8.length === compB_9.length && compA_8.every(function (item, i) { return item === compB_9[i] }));
  var _ok_10 = function (enumConstructorArg_11) {
    return [0, enumConstructorArg_11];
  };
  var _err_12 = function (enumConstructorArg_13) {
    return [1, enumConstructorArg_13];
  };
  (print_14)({ c: true, b: "OK", a: 200 });
  (print_14)(({ c: "true", b: "OK", a: 200 }).c);
  var funcExpr_15 = function () {
    return;
  };
  var funcExpr_16 = function () {
    return;
  };
  (print_14)({ b: funcExpr_15, a: funcExpr_16 });
  (print_14)((hello_1)());
  var funcExpr_19 = (print_14);
  var transform_18 = function (arg_17) {
    var return_20 = funcExpr_19(arg_17);
    return return_20;
  };
  transform_18((array_25)([(number_23)(1.0)]));
  var funcExpr_34 = (print_14);
  var transform_33 = function (arg_32) {
    var return_35 = funcExpr_34(arg_32);
    return return_35;
  };
  transform_33((parse_27)("[1, 2, 3]"));
  function main_36(callback) {
    if (callback) callback();
    if (typeof Promise !== "undefined") {
      return Promise.resolve()
    }
  }
  return {
    valueAssertions: valueAssertionResults_n,
    main: main_36,
  };
})();
