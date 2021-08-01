(function () {
  var undefined; // This helps minifiers to use a shorter variable name than `void 0`.
  function modulo_n(a, b) {
    return (a % b + b) % b;
  }
  var valueAssertionResults_n = {};
  function assertValue_n(valueAssertionId, pass) {
    valueAssertionResults_n[valueAssertionId] = pass;
  }
  var a_0 = 0;
  var b_1 = 1;
  var c_2 = function () {
    return 2;
  };
  (console.log)([a_0, 0]);
  (console.log)([b_1, 1]);
  (console.log)([(c_2)(), 2]);
  var ifLetValue_3 = a_0;
  var ifLetResult_4 = false;
  do {
    if (ifLetValue_3 === 0) {
    } else break;
    ifLetResult_4 = true;
  } while (false);
  if (ifLetResult_4) {
    assertValue_n(0, true);
  }
  var ifLetValue_5 = b_1;
  var ifLetResult_6 = false;
  do {
    if (ifLetValue_5 === 1) {
    } else break;
    ifLetResult_6 = true;
  } while (false);
  if (ifLetResult_6) {
    assertValue_n(1, true);
  }
  var ifLetValue_7 = (c_2)();
  var ifLetResult_8 = false, value_9;
  do {
    if (ifLetValue_7 === 2) {
      value_9 = undefined;
    } else break;
    ifLetResult_8 = true;
  } while (false);
  if (ifLetResult_8) {
    assertValue_n(2, value_9 === undefined);
  }
  var non_10 = function () {
    return false;
  };
  var oui_11 = true;
  (console.log)([(non_10)(), false]);
  (console.log)([oui_11, true]);
  var ifLetValue_12 = (non_10)();
  var ifLetResult_13 = false, value_14;
  do {
    if (ifLetValue_12) break;
    ifLetResult_13 = true;
  } while (false);
  if (ifLetResult_13) {
    assertValue_n(3, value_14 === undefined);
  }
  var ifLetValue_15 = oui_11;
  var ifLetResult_16 = false;
  do {
    if (!ifLetValue_15) break;
    ifLetResult_16 = true;
  } while (false);
  if (ifLetResult_16) {
    assertValue_n(4, true);
  }
  var justMe_17 = function () {
    return function () {
    };
  };
  (console.log)([((justMe_17)())(), undefined]);
  var value1_18, value2_19;
  value1_18 = undefined;
  value2_19 = undefined;
  assertValue_n(5, value1_18 === undefined);
  assertValue_n(6, value2_19 === undefined);
  var tuple1_20 = function (enumConstructorArg_21) {
    return function () {
      return function (enumConstructorArg_22) {
        return [enumConstructorArg_21, enumConstructorArg_22];
      };
    };
  };
  var tuple2_23 = function (enumConstructorArg_24) {
    return function (enumConstructorArg_25) {
      return [enumConstructorArg_24, enumConstructorArg_25];
    };
  };
  var null_26 = function () {
  };
  (console.log)([(tuple1_20)(1)()("one"), [1, "one"]]);
  (console.log)([(tuple2_23)(2)("two"), [2, "two"]]);
  (console.log)([(null_26)(), undefined]);
  var valueA_27, valueB_28, valueC_29;
  valueA_27 = (tuple1_20)(1)()("one")[0];
  valueB_28 = undefined;
  valueC_29 = (tuple1_20)(1)()("one")[1];
  assertValue_n(7, valueA_27 === 1);
  assertValue_n(8, valueB_28 === undefined);
  assertValue_n(9, valueC_29 === "one");
  var ifLetValue_30 = (tuple2_23)(2)("two");
  var ifLetResult_31 = false, a_32, b_33;
  do {
    if (!ifLetValue_30) break;
    a_32 = ifLetValue_30[0];
    b_33 = ifLetValue_30[1];
    ifLetResult_31 = true;
  } while (false);
  if (ifLetResult_31) {
    assertValue_n(10, a_32 === 2);
    assertValue_n(11, b_33 === "two");
  }
  var ifLetValue_34 = (null_26)();
  var ifLetResult_35 = false, value_36;
  do {
    if (ifLetValue_34) break;
    value_36 = undefined;
    ifLetResult_35 = true;
  } while (false);
  if (ifLetResult_35) {
    assertValue_n(12, value_36 === undefined);
  }
  var certainly_37 = function () {
    return function (enumConstructorArg_38) {
      return enumConstructorArg_38;
    };
  };
  var nope_39 = function () {
  };
  (console.log)([(certainly_37)()(false), false]);
  (console.log)([(nope_39)(), undefined]);
  var ifLetValue_40 = (certainly_37)()(false);
  var ifLetResult_41 = false, a_42, b_43;
  do {
    if (ifLetValue_40 === undefined) break;
    a_42 = undefined;
    b_43 = ifLetValue_40;
    ifLetResult_41 = true;
  } while (false);
  if (ifLetResult_41) {
    assertValue_n(13, a_42 === undefined);
    assertValue_n(14, !(b_43));
  }
  var ifLetValue_44 = (nope_39)();
  var ifLetResult_45 = false, value_46;
  do {
    if (ifLetValue_44 !== undefined) break;
    value_46 = undefined;
    ifLetResult_45 = true;
  } while (false);
  if (ifLetResult_45) {
    assertValue_n(15, value_46 === ((justMe_17)())());
  }
  var hello_47 = function (enumConstructorArg_48) {
    return function () {
      return function (enumConstructorArg_49) {
        return [0, enumConstructorArg_48, enumConstructorArg_49];
      };
    };
  };
  var hi_50 = function (enumConstructorArg_51) {
    return function () {
      return function (enumConstructorArg_52) {
        return [1, enumConstructorArg_51, enumConstructorArg_52];
      };
    };
  };
  var empty_53 = [2];
  var alsoEmpty_54 = [3];
  var alsoAlsoEmpty_55 = function () {
    return [4];
  };
  (console.log)([(hello_47)(1)()("one"), [0, 1, "one"]]);
  (console.log)([(hi_50)("two")()(2), [1, "two", 2]]);
  (console.log)([empty_53, [2]]);
  (console.log)([alsoEmpty_54, [3]]);
  (console.log)([(alsoAlsoEmpty_55)(), [4]]);
  var ifLetValue_56 = (hello_47)(1)()("one");
  var ifLetResult_57 = false, a_58, b_59, c_60;
  do {
    if (ifLetValue_56[0] === 0) {
      a_58 = ifLetValue_56[1];
      b_59 = undefined;
      c_60 = ifLetValue_56[2];
    } else break;
    ifLetResult_57 = true;
  } while (false);
  if (ifLetResult_57) {
    assertValue_n(16, a_58 === 1);
    assertValue_n(17, b_59 === undefined);
    assertValue_n(18, c_60 === "one");
  }
  var ifLetValue_61 = (hi_50)("two")()(2);
  var ifLetResult_62 = false, a_63, b_64, c_65;
  do {
    if (ifLetValue_61[0] === 1) {
      a_63 = ifLetValue_61[1];
      b_64 = undefined;
      c_65 = ifLetValue_61[2];
    } else break;
    ifLetResult_62 = true;
  } while (false);
  if (ifLetResult_62) {
    assertValue_n(19, a_63 === "two");
    assertValue_n(20, b_64 === undefined);
    assertValue_n(21, c_65 === 2);
  }
  var ifLetValue_66 = empty_53;
  var ifLetResult_67 = false;
  do {
    if (ifLetValue_66[0] === 2) {
    } else break;
    ifLetResult_67 = true;
  } while (false);
  if (ifLetResult_67) {
    assertValue_n(22, true);
  }
  var ifLetValue_68 = alsoEmpty_54;
  var ifLetResult_69 = false;
  do {
    if (ifLetValue_68[0] === 3) {
    } else break;
    ifLetResult_69 = true;
  } while (false);
  if (ifLetResult_69) {
    assertValue_n(23, true);
  }
  var ifLetValue_70 = (alsoAlsoEmpty_55)();
  var ifLetResult_71 = false, value_72;
  do {
    if (ifLetValue_70[0] === 4) {
      value_72 = undefined;
    } else break;
    ifLetResult_71 = true;
  } while (false);
  if (ifLetResult_71) {
    assertValue_n(24, value_72 === undefined);
  }
  var wee_73 = function (enumConstructorArg_74) {
    return function (enumConstructorArg_75) {
      return [0, enumConstructorArg_74, enumConstructorArg_75];
    };
  };
  var thisIsNull_76 = function () {
  };
  var wow_77 = function (enumConstructorArg_78) {
    return [2, enumConstructorArg_78];
  };
  (console.log)([(wee_73)(1)(2), [0, 1, 2]]);
  (console.log)([(thisIsNull_76)(), undefined]);
  (console.log)([(wow_77)(3), [2, 3]]);
  var ifLetValue_79 = (wee_73)(1)(2);
  var ifLetResult_80 = false, a_81, b_82;
  do {
    if (ifLetValue_79 && ifLetValue_79[0] === 0) {
      a_81 = ifLetValue_79[1];
      b_82 = ifLetValue_79[2];
    } else break;
    ifLetResult_80 = true;
  } while (false);
  if (ifLetResult_80) {
    assertValue_n(25, a_81 === 1);
    assertValue_n(26, b_82 === 2);
  }
  var ifLetValue_83 = (thisIsNull_76)();
  var ifLetResult_84 = false, value_85;
  do {
    if (!ifLetValue_83) {
      value_85 = undefined;
    } else break;
    ifLetResult_84 = true;
  } while (false);
  if (ifLetResult_84) {
    assertValue_n(27, value_85 === ((justMe_17)())());
  }
  var ifLetValue_86 = (wow_77)(3);
  var ifLetResult_87 = false, value_88;
  do {
    if (ifLetValue_86 && ifLetValue_86[0] === 2) {
      value_88 = ifLetValue_86[1];
    } else break;
    ifLetResult_87 = true;
  } while (false);
  if (ifLetResult_87) {
    assertValue_n(28, value_88 === 3);
  }
  for (var i = 0; i < 29; i++) {
    if (!valueAssertionResults_n[i]) valueAssertionResults_n[i] = false;
  }
  return {
    valueAssertions: valueAssertionResults_n,
  };
})();
