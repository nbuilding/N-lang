(function () {
  var undefined; // This helps minifiers to use a shorter variable name than `void 0`.
  for (var i = 0; i < 0; i++) {
    valueAssertionResults_n[i] = false;
  }
  function sleep_5(delay) {
    return function (callback) {
      setTimeout(callback, delay);
    };
  }
  function modulo_n(a, b) {
    return (a % b + b) % b;
  }
  var valueAssertionResults_n = {};
  function assertValue_n(valueAssertionId, pass) {
    valueAssertionResults_n[valueAssertionId] = pass;
  }
  var funcExpr_0 = function () {
    return function (callback_1) {
      (console.log)("wow");
      return callback_1(1);
    }
  };
  var wow_2;
  wow_2 = funcExpr_0;
  var funcExpr_3 = function () {
    return function (callback_4) {
      (console.log)("wow2.1");
      ((sleep_5)(1000))(function (cmdResult_6) {
        (console.log)("wow2.2");
        return ((wow_2)())(callback_4);
      });
    }
  };
  var wow2_7;
  wow2_7 = funcExpr_3;
  var funcExpr_8 = function () {
    return function (callback_9) {
      var cmd_10;
      cmd_10 = (wow2_7)();
      (cmd_10)(function (cmdResult_11) {
        (console.log)(cmdResult_11);
        ((sleep_5)(2000))(function (cmdResult_12) {
          (cmd_10)(function (cmdResult_13) {
            (console.log)(cmdResult_13);
          });
        });
      });
    }
  };
  var main_14;
  main_14 = (funcExpr_8)(undefined);
  return {
    valueAssertions: valueAssertionResults_n,
  };
})();
