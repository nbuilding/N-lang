(function () {
  function modulo_n(a, b) {
    return (a % b + b) % b;
  }
  var valueAssertionResults_n = {};
  function assertValue_n(valueAssertionId, pass) {
    valueAssertionResults_n[valueAssertionId] = pass;
  }
  var funcExpr_0 = function () {
    return "hello";
  };
  var hello_1;
  hello_1 = funcExpr_0;
  var test_2;
  test_2 = undefined;
  var funcExpr_3 = function (argument_4) {
    var hi_5;
    hi_5 = argument_4;
    var ifCond_6;
    if (hi_5 === "hmm") {
      return false;
      ifCond_6 = undefined;
    } else {
      ifCond_6 = test_2;
    }
    (console.log)((hello_1)());
    return true;
  };
  var test2_7;
  test2_7 = funcExpr_3;
  (console.log)((test2_7)("hi"));
  (console.log)((test2_7)("hmm"));
  return {
    valueAssertions: valueAssertionResults_n,
  };
})();
