(function () {
  var undefined; // This helps minifiers to use a shorter variable name than `void 0`.
  var valueAssertionResults_n = {};
  for (var i = 0; i < 2; i++) {
    valueAssertionResults_n[i] = false;
  }
  function main_21(callback) {
    callback();
  }
  function modulo_n(a, b) {
    return (a % b + b) % b;
  }
  function assertValue_n(valueAssertionId, pass) {
    valueAssertionResults_n[valueAssertionId] = pass;
  }
  function deepEqual_n(a, b) {
    return false;
  }
  var compA_0 = { a: "pi", b: 3.14 }, compB_1 = { b: 3.14, a: "pi" };
  assertValue_n(0, compA_0.b === compB_1.b && compA_0.a === compB_1.a);
  var listvalue_2;
  listvalue_2 = ["a", "b", "c"];
  var compA_3 = listvalue_2, compB_4 = ["a", "b", "c"];
  assertValue_n(1, compA_3.length === compB_4.length && compA_3.every(function (item, i) { return item === compB_4[i] }));
  var null_5;
  var string_6 = function (enumConstructorArg_7) {
    return [1, enumConstructorArg_7];
  };
  var number_9 = function (enumConstructorArg_10) {
    return [2, enumConstructorArg_10];
  };
  var boolean_12 = function (enumConstructorArg_13) {
    return [3, enumConstructorArg_13];
  };
  var array_15 = function (enumConstructorArg_16) {
    return [4, enumConstructorArg_16];
  };
  var object_18 = function (enumConstructorArg_19) {
    return [5, enumConstructorArg_19];
  };
  main_21(function () {});
  return {
    valueAssertions: valueAssertionResults_n,
    main: main_21,
  };
})();
