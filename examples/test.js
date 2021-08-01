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
        ((wow_2)())(function (cmdResult_7) {
          return callback_4((cmdResult_7) + (1));
        });
      });
    }
  };
  var wow2_8;
  wow2_8 = funcExpr_3;
  var funcExpr_9 = function () {
    return function (callback_10) {
      var cmd_11;
      cmd_11 = (wow2_8)();
      (cmd_11)(function (cmdResult_12) {
        (console.log)(cmdResult_12);
        ((sleep_5)(2000))(function (cmdResult_13) {
          (cmd_11)(function (cmdResult_14) {
            (console.log)(cmdResult_14);
          });
        });
      });
    }
  };
  var main_15;
  main_15 = (funcExpr_9)(undefined);
  return {
    valueAssertions: valueAssertionResults_n,
  };
})();
