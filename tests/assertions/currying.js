(function () {
  var undefined; // This helps minifiers to use a shorter variable name than `void 0`.
  var valueAssertionResults_n = {};
  for (var i = 0; i < 2; i++) {
    valueAssertionResults_n[i] = false;
  }
  function assertValue_9(valueAssertionId, pass) {
    valueAssertionResults_n[valueAssertionId] = pass;
  }
  var funcExpr_0 = function (argument_1) {
    var a_2;
    a_2 = argument_1;
    return function (argument_3) {
      var b_4;
      b_4 = argument_3;
      return (a_2) + (b_4);
    };
  };
  var sum_5;
  sum_5 = funcExpr_0;
  var addOne_6;
  addOne_6 = (sum_5)(1);
  var compA_7 = (addOne_6)(2), compB_8 = 3;
  assertValue_9(0, compA_7 === compB_8);
  var compA_10 = ((sum_5)(1))(2), compB_11 = 3;
  assertValue_9(1, compA_10 === compB_11);
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
