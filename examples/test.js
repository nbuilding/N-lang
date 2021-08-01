(function () {
  var undefined; // This helps minifiers to use a shorter variable name than `void 0`.
  var valueAssertionResults_n = {};
  for (var i = 0; i < 2; i++) {
    valueAssertionResults_n[i] = false;
  }
  function assertValue_2(valueAssertionId, pass) {
    valueAssertionResults_n[valueAssertionId] = pass;
  }
  var compA_0 = { a: "pi", b: 3.14 }, compB_1 = { b: 3.14, a: "pi" };
  assertValue_2(0, compA_0.b === compB_1.b && compA_0.a === compB_1.a);
  var listvalue_3;
  listvalue_3 = ["a", "b", "c"];
  var compA_4 = listvalue_3, compB_5 = ["a", "b", "c"];
  assertValue_2(1, compA_4.length === compB_5.length && compA_4.every(function (item, i) { return item === compB_5[i] }));
  var _ok_6 = function (enumConstructorArg_7) {
    return [0, enumConstructorArg_7];
  };
  var _err_9 = function (enumConstructorArg_10) {
    return [1, enumConstructorArg_10];
  };
  function main_12(callback) {
    if (callback) callback();
    if (typeof Promise !== "undefined") {
      return Promise.resolve()
    }
  }
  main_12();
  return {
    valueAssertions: valueAssertionResults_n,
    main: main_12,
  };
})();
