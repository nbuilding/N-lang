(function () {
  var undefined; // This helps minifiers to use a shorter variable name than `void 0`.
  var valueAssertionResults_n = {};
  for (var i = 0; i < 40; i++) {
    valueAssertionResults_n[i] = false;
  }
  function print_3(value) {
    // TODO: Prettify
    console.log(value);
    return value;
  }
  function assertValue_7(valueAssertionId, pass) {
    valueAssertionResults_n[valueAssertionId] = pass;
  }
  function yes_154(value) {
    return value;
  }
  var unit_159 = {};
  function deepEqual_190(a, b) {
    if (typeof a === "object") {
      // Array.isArray: IE9+
      if (Array.isArray(a)) {
        if (a.length !== b.length) {
          return false;
        }
        for (var i = 0; i < a.length; i++) {
          if (!deepEqual_190(a[i], b[i])) {
            return false;
          }
        }
      } else {
        // Object.keys: IE9+
        var keys = Object.keys(a);
        if (keys.length !== Object.keys(b).length) {
          return false;
        }
        for (var i = 0; i < keys.length; i++) {
          if (keys[i] in b) {
            if (!deepEqual_190(a[keys[i]], b[keys[i]])) {
              return false;
            }
          } else {
            return false;
          }
        }
      }
      return true;
    } else {
      return a === b;
    }
  }
  function len_193(value) {
    if (typeof value === "string") {
      var highSurrogates = 0;
      for (var i = 0; i < string.length; i++) {
        var codePoint = string.charCodeAt(i);
        if (codePoint >= 0xd800 && codePoint <= 0xdbff) {
          ++highSurrogates;
        }
      }
      // Subtract a surrogate from each pair
      return string.length - highSurrogates;
    } else if (Array.isArray(value)) {
      // Array.isArray: IE9+
      return value.length;
    } else {
      return 0;
    }
  }
  var a_0 = 0;
  var b_1 = 1;
  var c_2 = function () {
    return 2;
  };
  (print_3)([a_0, 0]);
  (print_3)([b_1, 1]);
  (print_3)([(c_2)(), 2]);
  var ifLetValue_5 = a_0;
  var ifLetResult_6 = false;
  do {
    if (ifLetValue_5 === 0) {
    } else break;
    ifLetResult_6 = true;
  } while (false);
  if (ifLetResult_6) {
    assertValue_7(0, true);
  }
  var ifLetValue_9 = b_1;
  var ifLetResult_10 = false;
  do {
    if (ifLetValue_9 === 1) {
    } else break;
    ifLetResult_10 = true;
  } while (false);
  if (ifLetResult_10) {
    assertValue_7(1, true);
  }
  var ifLetValue_12 = (c_2)();
  var ifLetResult_13 = false, value_14;
  do {
    if (ifLetValue_12 === 2) {
      value_14 = undefined;
    } else break;
    ifLetResult_13 = true;
  } while (false);
  if (ifLetResult_13) {
    var compA_15 = value_14, compB_16 = undefined;
    assertValue_7(2, true);
  }
  var non_17 = function () {
    return false;
  };
  var oui_18 = true;
  (print_3)([(non_17)(), false]);
  (print_3)([oui_18, true]);
  var ifLetValue_20 = (non_17)();
  var ifLetResult_21 = false, value_22;
  do {
    if (ifLetValue_20) break;
    ifLetResult_21 = true;
  } while (false);
  if (ifLetResult_21) {
    var compA_23 = value_22, compB_24 = undefined;
    assertValue_7(3, true);
  }
  var ifLetValue_26 = oui_18;
  var ifLetResult_27 = false;
  do {
    if (!ifLetValue_26) break;
    ifLetResult_27 = true;
  } while (false);
  if (ifLetResult_27) {
    assertValue_7(4, true);
  }
  var justMe_28 = function () {
    return function () {
    };
  };
  (print_3)([((justMe_28)())(), undefined]);
  var value1_29, value2_30;
  value1_29 = undefined;
  value2_30 = undefined;
  var compA_31 = value1_29, compB_32 = undefined;
  assertValue_7(5, true);
  var compA_33 = value2_30, compB_34 = undefined;
  assertValue_7(6, true);
  var tuple1_35 = function (enumConstructorArg_36) {
    return function () {
      return function (enumConstructorArg_37) {
        return [enumConstructorArg_36, enumConstructorArg_37];
      };
    };
  };
  var tuple2_38 = function (enumConstructorArg_39) {
    return function (enumConstructorArg_40) {
      return [enumConstructorArg_39, enumConstructorArg_40];
    };
  };
  var null_41 = function () {
  };
  (print_3)([(tuple1_35)(1)()("one"), [1, "one"]]);
  (print_3)([(tuple2_38)(2)("two"), [2, "two"]]);
  (print_3)([(null_41)(), undefined]);
  var valueA_42, valueB_43, valueC_44;
  valueA_42 = (tuple1_35)(1)()("one")[0];
  valueB_43 = undefined;
  valueC_44 = (tuple1_35)(1)()("one")[1];
  var compA_45 = valueA_42, compB_46 = 1;
  assertValue_7(7, compA_45 === compB_46);
  var compA_47 = valueB_43, compB_48 = undefined;
  assertValue_7(8, true);
  var compA_49 = valueC_44, compB_50 = "one";
  assertValue_7(9, compA_49 === compB_50);
  var ifLetValue_52 = (tuple2_38)(2)("two");
  var ifLetResult_53 = false, a_54, b_55;
  do {
    if (!ifLetValue_52) break;
    a_54 = ifLetValue_52[0];
    b_55 = ifLetValue_52[1];
    ifLetResult_53 = true;
  } while (false);
  if (ifLetResult_53) {
    var compA_56 = a_54, compB_57 = 2;
    assertValue_7(10, compA_56 === compB_57);
    var compA_58 = b_55, compB_59 = "two";
    assertValue_7(11, compA_58 === compB_59);
  }
  var ifLetValue_61 = (null_41)();
  var ifLetResult_62 = false, value_63;
  do {
    if (ifLetValue_61) break;
    value_63 = undefined;
    ifLetResult_62 = true;
  } while (false);
  if (ifLetResult_62) {
    var compA_64 = value_63, compB_65 = undefined;
    assertValue_7(12, true);
  }
  var certainly_66 = function () {
    return function (enumConstructorArg_67) {
      return enumConstructorArg_67;
    };
  };
  var nope_68 = function () {
  };
  (print_3)([(certainly_66)()(false), false]);
  (print_3)([(nope_68)(), undefined]);
  var ifLetValue_70 = (certainly_66)()(false);
  var ifLetResult_71 = false, a_72, b_73;
  do {
    if (ifLetValue_70 === undefined) break;
    a_72 = undefined;
    b_73 = ifLetValue_70;
    ifLetResult_71 = true;
  } while (false);
  if (ifLetResult_71) {
    var compA_74 = a_72, compB_75 = undefined;
    assertValue_7(13, true);
    assertValue_7(14, !(b_73));
  }
  var ifLetValue_77 = (nope_68)();
  var ifLetResult_78 = false, value_79;
  do {
    if (ifLetValue_77 !== undefined) break;
    value_79 = undefined;
    ifLetResult_78 = true;
  } while (false);
  if (ifLetResult_78) {
    var compA_80 = value_79, compB_81 = ((justMe_28)())();
    assertValue_7(15, true);
  }
  var hello_82 = function (enumConstructorArg_83) {
    return function () {
      return function (enumConstructorArg_84) {
        return [0, enumConstructorArg_83, enumConstructorArg_84];
      };
    };
  };
  var hi_85 = function (enumConstructorArg_86) {
    return function () {
      return function (enumConstructorArg_87) {
        return [1, enumConstructorArg_86, enumConstructorArg_87];
      };
    };
  };
  var empty_88 = [2];
  var alsoEmpty_89 = [3];
  var alsoAlsoEmpty_90 = function () {
    return [4];
  };
  (print_3)([(hello_82)(1)()("one"), [0, 1, "one"]]);
  (print_3)([(hi_85)("two")()(2), [1, "two", 2]]);
  (print_3)([empty_88, [2]]);
  (print_3)([alsoEmpty_89, [3]]);
  (print_3)([(alsoAlsoEmpty_90)(), [4]]);
  var ifLetValue_92 = (hello_82)(1)()("one");
  var ifLetResult_93 = false, a_94, b_95, c_96;
  do {
    if (ifLetValue_92[0] === 0) {
      a_94 = ifLetValue_92[1];
      b_95 = undefined;
      c_96 = ifLetValue_92[2];
    } else break;
    ifLetResult_93 = true;
  } while (false);
  if (ifLetResult_93) {
    var compA_97 = a_94, compB_98 = 1;
    assertValue_7(16, compA_97 === compB_98);
    var compA_99 = b_95, compB_100 = undefined;
    assertValue_7(17, true);
    var compA_101 = c_96, compB_102 = "one";
    assertValue_7(18, compA_101 === compB_102);
  }
  var ifLetValue_104 = (hi_85)("two")()(2);
  var ifLetResult_105 = false, a_106, b_107, c_108;
  do {
    if (ifLetValue_104[0] === 1) {
      a_106 = ifLetValue_104[1];
      b_107 = undefined;
      c_108 = ifLetValue_104[2];
    } else break;
    ifLetResult_105 = true;
  } while (false);
  if (ifLetResult_105) {
    var compA_109 = a_106, compB_110 = "two";
    assertValue_7(19, compA_109 === compB_110);
    var compA_111 = b_107, compB_112 = undefined;
    assertValue_7(20, true);
    var compA_113 = c_108, compB_114 = 2;
    assertValue_7(21, compA_113 === compB_114);
  }
  var ifLetValue_116 = empty_88;
  var ifLetResult_117 = false;
  do {
    if (ifLetValue_116[0] === 2) {
    } else break;
    ifLetResult_117 = true;
  } while (false);
  if (ifLetResult_117) {
    assertValue_7(22, true);
  }
  var ifLetValue_119 = alsoEmpty_89;
  var ifLetResult_120 = false;
  do {
    if (ifLetValue_119[0] === 3) {
    } else break;
    ifLetResult_120 = true;
  } while (false);
  if (ifLetResult_120) {
    assertValue_7(23, true);
  }
  var ifLetValue_122 = (alsoAlsoEmpty_90)();
  var ifLetResult_123 = false, value_124;
  do {
    if (ifLetValue_122[0] === 4) {
      value_124 = undefined;
    } else break;
    ifLetResult_123 = true;
  } while (false);
  if (ifLetResult_123) {
    var compA_125 = value_124, compB_126 = undefined;
    assertValue_7(24, true);
  }
  var wee_127 = function (enumConstructorArg_128) {
    return function (enumConstructorArg_129) {
      return [0, enumConstructorArg_128, enumConstructorArg_129];
    };
  };
  var thisIsNull_130 = function () {
  };
  var wow_131 = function (enumConstructorArg_132) {
    return [2, enumConstructorArg_132];
  };
  (print_3)([(wee_127)(1)(2), [0, 1, 2]]);
  (print_3)([(thisIsNull_130)(), undefined]);
  (print_3)([(wow_131)(3), [2, 3]]);
  var ifLetValue_134 = (wee_127)(1)(2);
  var ifLetResult_135 = false, a_136, b_137;
  do {
    if (ifLetValue_134 && ifLetValue_134[0] === 0) {
      a_136 = ifLetValue_134[1];
      b_137 = ifLetValue_134[2];
    } else break;
    ifLetResult_135 = true;
  } while (false);
  if (ifLetResult_135) {
    var compA_138 = a_136, compB_139 = 1;
    assertValue_7(25, compA_138 === compB_139);
    var compA_140 = b_137, compB_141 = 2;
    assertValue_7(26, compA_140 === compB_141);
  }
  var ifLetValue_143 = (thisIsNull_130)();
  var ifLetResult_144 = false, value_145;
  do {
    if (!ifLetValue_143) {
      value_145 = undefined;
    } else break;
    ifLetResult_144 = true;
  } while (false);
  if (ifLetResult_144) {
    var compA_146 = value_145, compB_147 = ((justMe_28)())();
    assertValue_7(27, true);
  }
  var ifLetValue_149 = (wow_131)(3);
  var ifLetResult_150 = false, value_151;
  do {
    if (ifLetValue_149 && ifLetValue_149[0] === 2) {
      value_151 = ifLetValue_149[1];
    } else break;
    ifLetResult_150 = true;
  } while (false);
  if (ifLetResult_150) {
    var compA_152 = value_151, compB_153 = 3;
    assertValue_7(28, compA_152 === compB_153);
  }
  var funcExpr_157 = (yes_154);
  var transform_156 = function () {
    var return_158 = funcExpr_157(unit_159);
    return "TODO";
  };
  var funcExpr_162 = (yes_154);
  var transform_161 = function () {
    var return_163 = funcExpr_162(unit_159);
    return "TODO";
  };
  var compA_164 = transform_156(), compB_165 = transform_161();
  assertValue_7(29, compA_164 === compB_165);
  var funcExpr_168 = (yes_154);
  var transform_167 = function () {
    var return_169 = funcExpr_168(unit_159);
    return "TODO";
  };
  var compA_170 = transform_167(), compB_171 = undefined;
  assertValue_7(30, compA_170 !== compB_171);
  var compA_172 = (yes_154)((null_41)()), compB_173 = (yes_154)((null_41)());
  assertValue_7(31, (compA_172 && compB_173 ? compA_172[0] === compB_173[0] : compA_172 === compB_173));
  var compA_174 = (yes_154)((null_41)()), compB_175 = undefined;
  assertValue_7(32, compA_174 !== compB_175);
  var compA_176 = (yes_154)((thisIsNull_130)()), compB_177 = (yes_154)((thisIsNull_130)());
  assertValue_7(33, (compA_176 && compB_177 ? compA_176[0] === compB_177[0] : compA_176 === compB_177));
  var compA_178 = (yes_154)((thisIsNull_130)()), compB_179 = undefined;
  assertValue_7(34, compA_178 !== compB_179);
  var compA_180 = (yes_154)(false), compB_181 = (yes_154)(false);
  assertValue_7(35, compA_180 === compB_181);
  var compA_182 = (yes_154)(false), compB_183 = undefined;
  assertValue_7(36, compA_182 !== compB_183);
  var nullableEnum_184 = function (enumConstructorArg_185) {
    return [enumConstructorArg_185];
  };
  var alsoNull_186;
  var mayBeConfusedWithAlsoNull_187;
  mayBeConfusedWithAlsoNull_187 = (nullableEnum_184)((thisIsNull_130)());
  (print_3)(["AHHH 1", alsoNull_186, mayBeConfusedWithAlsoNull_187]);
  var compA_188 = alsoNull_186, compB_189 = mayBeConfusedWithAlsoNull_187;
  assertValue_7(37, (compA_188 && compB_189 ? (compA_188[0] && compB_189[0] ? !deepEqual_190(compA_188[0], compB_189[0]) : compA_188[0] !== compB_189[0]) : compA_188 !== compB_189));
  var ifLetValue_191 = mayBeConfusedWithAlsoNull_187;
  var ifLetResult_192 = false;
  do {
    if (ifLetValue_191) break;
    ifLetResult_192 = true;
  } while (false);
  assertValue_7(38, ifLetResult_192 ? false : true);
  var compA_194 = (len_193)((wee_127)(1)(2)), compB_195 = 0;
  assertValue_7(39, compA_194 === compB_195);
  function main_196(callback) {
    if (callback) callback();
    if (typeof Promise !== "undefined") {
      return Promise.resolve()
    }
  }
  return {
    valueAssertions: valueAssertionResults_n,
    main: main_196,
  };
})();
