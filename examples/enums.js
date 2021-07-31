(function () {
  function modulo_n(a, b) {
    return (a % b + b) % b;
  }
  var valueAssertionResults_n = {};
  function assertValue_n(valueAssertionId, pass) {
    valueAssertionResults_n[valueAssertionId] = pass;
  }
  var a_0 = 0;
  var b_1 = 1;
  var c_2 = function () {
    return 2;
  };
  (console.log)([a_0, 0]);
  (console.log)([b_1, 1]);
  (console.log)([(c_2)(), 2]);
  var non_3 = function () {
    return false;
  };
  var oui_4 = true;
  (console.log)([(non_3)(), false]);
  (console.log)([oui_4, true]);
  var justMe_5 = function () {
    return function () {
    };
  };
  (console.log)([((justMe_5)())(), undefined]);
  var tuple1_6 = function (enumConstructorArg_7) {
    return function () {
      return function (enumConstructorArg_8) {
        return [enumConstructorArg_7, enumConstructorArg_8];
      };
    };
  };
  var tuple2_9 = function (enumConstructorArg_10) {
    return function (enumConstructorArg_11) {
      return [enumConstructorArg_10, enumConstructorArg_11];
    };
  };
  var null_12 = function () {
  };
  (console.log)([(tuple1_6)(1)()("one"), [1, "one"]]);
  (console.log)([(tuple2_9)(2)("two"), [2, "two"]]);
  (console.log)([(null_12)(), undefined]);
  var certainly_13 = function () {
    return function (enumConstructorArg_14) {
      return enumConstructorArg_14;
    };
  };
  var nope_15 = function () {
  };
  (console.log)([(certainly_13)()(false), false]);
  (console.log)([(nope_15)(), undefined]);
  var hello_16 = function (enumConstructorArg_17) {
    return function () {
      return function (enumConstructorArg_18) {
        return [0, enumConstructorArg_17, enumConstructorArg_18];
      };
    };
  };
  var hi_19 = function (enumConstructorArg_20) {
    return function () {
      return function (enumConstructorArg_21) {
        return [1, enumConstructorArg_20, enumConstructorArg_21];
      };
    };
  };
  var empty_22 = [2];
  var alsoEmpty_23 = [3];
  var alsoAlsoEmpty_24 = function () {
    return [4];
  };
  (console.log)([(hello_16)(1)()("one"), [0, 1, "one"]]);
  (console.log)([(hi_19)("two")()(2), [1, "two", 2]]);
  (console.log)([empty_22, [2]]);
  (console.log)([alsoEmpty_23, [3]]);
  (console.log)([(alsoAlsoEmpty_24)(), [4]]);
  var wee_25 = function (enumConstructorArg_26) {
    return function (enumConstructorArg_27) {
      return [0, enumConstructorArg_26, enumConstructorArg_27];
    };
  };
  var thisIsNull_28 = function () {
  };
  var wow_29 = function (enumConstructorArg_30) {
    return [2, enumConstructorArg_30];
  };
  (console.log)([(wee_25)(1)(2), [0, 1, 2]]);
  (console.log)([(thisIsNull_28)(), undefined]);
  (console.log)([(wow_29)(3), [2, 3]]);
  return {
    valueAssertions: valueAssertionResults_n,
  };
})();
