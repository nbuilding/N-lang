(function () {
  var undefined; // This helps minifiers to use a shorter variable name than `void 0`.
  var valueAssertionResults_n = {};
  for (var i = 0; i < 1; i++) {
    valueAssertionResults_n[i] = false;
  }
  function assertValue_11(valueAssertionId, pass) {
    valueAssertionResults_n[valueAssertionId] = pass;
  }
  var Test_0 = function (argument_1) {
    var a_2;
    a_2 = argument_1;
    return function (argument_3) {
      var b_4;
      b_4 = argument_3;
      var funcExpr_5 = function () {
        return (a_2) + (b_4);
      };
      var sum_6;
      sum_6 = funcExpr_5;
      var internalSum_7;
      internalSum_7 = (a_2) + (b_4);
      return { a: sum_6 };
    };
  };
  var test_8;
  test_8 = (Test_0)(1)(2);
  var compA_9 = ((test_8).a)(), compB_10 = (1) + (2);
  assertValue_11(0, compA_9 === compB_10);
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
