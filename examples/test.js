var sum = function(a) {
  return function(b) {
    if (a === 1) {
      var _temp0;
      if (b === 2) {
        return 3;
      } else {
        _temp0 = b;
      }
      return a + _temp0 / 2;
    }
    return 2;
  };
};
var _temp1 = [];
for (var i_1 = 0; i_1 < 10; i_1++) {
  console.log("test");
  console.log("test2");
  var _temp3;
  var scopedVariable_1 = "wow";
  _temp3 = scopedVariable_1 + scopedVariable_1;
  console.log(_temp3);
}
var addOne = sum(1);
var _temp6;
var test_1;
var _temp8 = 2;
console.log(_temp8)
var _temp7 = _temp8;
var _temp9 = false;
if (1 < _temp7) {
  var _temp10 = 0;
  console.log(_temp10);
  var _temp11 = _temp10;
  if (_temp7 > _temp11) {
    _temp9 = true;
  }
}
if (_temp9) {
  test_1 = addOne(3);
} else {
  test_1 = addOne(5);
}
_temp6 = test_1 === 4;
if (_temp6) {
  console.log("wowwow")
}
var wow = [];
for (var i_2 = 0; i_2 < 5; i_2++) {
  if (__modulo(i_2, 2) === 0) {
    wow.push(Math.pow(i + 1, 2));
  }
}
