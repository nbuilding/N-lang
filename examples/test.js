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
  var unit_21 = {};
  function null_22() {
    return [0, null];
  }
  function string_23(str) {
    return [1, str];
  }
  function number_24(float) {
    return [2, float];
  }
  function boolean_25(bool) {
    return [3, bool];
  }
  function array_26(list) {
    return [4, list];
  }
  function object_27(map) {
    return [5, map];
  }
  function parse_28(json) {
    try {
      return jsValueToJson(JSON.parse(json));
    } catch (_) {
      return;
    }
  }
  function parseSafe_29(json) {
    try {
      return [jsValueToJson(JSON.parse(json))];
    } catch (_) {
      return;
    }
  }
  function stringify_30(value) {
    // JSON.stringify: IE8+
    return JSON.stringify(jsonValueToJs(value));
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
    var return_20 = funcExpr_19(unit_21);
    return unit_21;
  };
  transform_18((parse_28)("[1, 2, 3]"));
  function main_31(callback) {
    if (callback) callback();
    if (typeof Promise !== "undefined") {
      return Promise.resolve()
    }
  }
  return {
    valueAssertions: valueAssertionResults_n,
    main: main_31,
  };
})();
