(function () {
  var undefined; // This helps minifiers to use a shorter variable name than `void 0`.
  var valueAssertionResults_n = {};
  for (var i = 0; i < 2; i++) {
    valueAssertionResults_n[i] = false;
  }
  function assertValue_2(valueAssertionId, pass) {
    valueAssertionResults_n[valueAssertionId] = pass;
  }
  function main_22(callback) {
    callback();
  }
  var compA_0 = { a: "pi", b: 3.14 }, compB_1 = { b: 3.14, a: "pi" };
  assertValue_2(0, compA_0.b === compB_1.b && compA_0.a === compB_1.a);
  var listvalue_3;
  listvalue_3 = ["a", "b", "c"];
  var compA_4 = listvalue_3, compB_5 = ["a", "b", "c"];
  assertValue_2(1, compA_4.length === compB_5.length && compA_4.every(function (item, i) { return item === compB_5[i] }));
  var null_6;
  var string_7 = function (enumConstructorArg_8) {
    return [1, enumConstructorArg_8];
  };
  var number_10 = function (enumConstructorArg_11) {
    return [2, enumConstructorArg_11];
  };
  var boolean_13 = function (enumConstructorArg_14) {
    return [3, enumConstructorArg_14];
  };
  var array_16 = function (enumConstructorArg_17) {
    return [4, enumConstructorArg_17];
  };
  var object_19 = function (enumConstructorArg_20) {
    return [5, enumConstructorArg_20];
  };
  main_22(function () {});
  return {
    valueAssertions: valueAssertionResults_n,
    main: main_22,
  };
})();
