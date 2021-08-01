(function () {
  function modulo_n(a, b) {
    return (a % b + b) % b;
  }
  var valueAssertionResults_n = {};
  function assertValue_n(valueAssertionId, pass) {
    valueAssertionResults_n[valueAssertionId] = pass;
  }
  for (var oldForIndex_1 = 0, oldForEnd_0 = 100; oldForIndex_1 < oldForEnd_0; ++oldForIndex_1) {
    var i_2;
    i_2 = oldForIndex_1;
    var n_3;
    n_3 = (i_2) + (1);
    (console.log)((modulo_n(n_3, 3) === 0) && (modulo_n(n_3, 5) === 0) ? "FizzBuzz" : modulo_n(n_3, 3) === 0 ? "Fizz" : modulo_n(n_3, 5) === 0 ? "Buzz" : (String)(n_3));
  }
})();
