import { generateNames } from '../../test/unit/utils/generate-names';
import { Block } from '../ast';
import { modules } from '../native-modules';
import {
  FuncTypeVar,
  NRecord,
  NType,
  NTypeKnown,
  substitute,
} from '../type-checker/types/types';
import { CompilationGlobalScope } from '../global-scope/CompilationGlobalScope';
import { functions } from './functions';
import { list, cmd, map, str } from '../type-checker/types/builtins';
import { isUnitLike } from '../type-checker/types/isUnitLike';
import { EnumSpec, FuncTypeVarSpec } from '../type-checker/types/TypeSpec';
import { isNullableMaybe, normaliseEnum } from './EnumRepresentation';
import { fromEntries } from '../utils/from-entries';

function surround(
  lines: string[],
  { prefix = '', suffix = '' } = {},
): string[] {
  if (lines.length === 0) {
    return prefix + suffix ? [prefix + suffix] : [];
  } else if (lines.length === 1) {
    return [prefix + lines[0] + suffix];
  } else {
    return [
      prefix + lines[0],
      ...lines.slice(1, -1),
      lines[lines.length - 1] + suffix,
    ];
  }
}

export interface HasExports {
  names: Map<string, string>;
}

export class CompilationContext {
  /** Maps module IDs to their exported variable names */
  private _modules: Map<string, HasExports> = new Map();

  globalScope = new CompilationGlobalScope(this);

  /** ID used to ensure unique variable names */
  private _id = 0;

  /** Cache of normalised record key names */
  private _recordCache: Map<string, Record<string, string>> = new Map();

  /**
   * Functions that have been required and added to `dependencies` already. A
   * mapping between the normal name and the mangled name. (e.g. deepEqual ->
   * deepEqual_0)
   */
  required: Map<string, string> = new Map();

  /**
   * Statements for defining the native module dependencies used in the project.
   */
  dependencies: string[] = [];

  genVarName(name: string = '') {
    return `${name.replace('.', '_').replace('-', '_')}_${this._id++}`;
  }

  indent(lines: string[]): string[] {
    return lines.map(line => '  ' + line);
  }

  /** Returns an object map between record field names and mangled names */
  normaliseRecord(recordType: NRecord): Record<string, string> {
    // Normalise keys by alphabetising them to get a unique record ID
    const sortedKeys = [...recordType.types.keys()].sort();
    const recordId = sortedKeys.join(' ');
    const cached = this._recordCache.get(recordId);
    if (cached) {
      return cached;
    }
    const mangled: Record<string, string> = {};
    const names = generateNames();
    for (const key of sortedKeys) {
      mangled[key] = names.next().value;
    }
    this._recordCache.set(recordId, mangled);
    return mangled;
  }

  getModule(moduleId: string): HasExports {
    let module = this._modules.get(moduleId);
    if (!module) {
      if (!modules.hasOwnProperty(moduleId)) {
        throw new Error(`Unknown module ${moduleId}`);
      }
      const { statements, exports } = modules[moduleId].compile(this);
      module = { names: new Map(Object.entries(exports)) };
      this.dependencies.push(...statements);
      this._modules.set(moduleId, module);
    }
    return module;
  }

  compile(block: Block, moduleId?: string): string[] {
    const scope = this.globalScope.inner();
    if (moduleId) {
      this._modules.set(moduleId, scope);
    }
    return block.compileStatement(scope).statements;
  }

  defineModuleNames(moduleId: string, names: Map<string, string>) {
    this._modules.set(moduleId, { names });
  }

  require(name: string): string {
    const cached = this.required.get(name);
    if (cached) {
      return cached;
    } else {
      const mangled = this.genVarName(name);
      if (!functions[name]) {
        throw new ReferenceError(`'${name}' is not in functions.`);
      }
      const lines = functions[name](mangled, required =>
        this.require(required),
      );
      this.dependencies.push(...lines);
      this.required.set(name, mangled);
      return mangled;
    }
  }

  /**
   * Create an expression that transforms `name` to replace all unit-like types
   * with something truthy like `unit` (an empty object) if `toTypevar` is true
   * or with `undefined` if `toTypevar` is false.
   *
   * Returns `null` if nothing needs changing. Prevents unnecessary `.map`s.
   */
  makeUnitConverter(
    name: string,
    type: NType,
    substitutions: Map<FuncTypeVarSpec, NTypeKnown>,
    toTypeVar: boolean,
  ): { statements: string[]; expression: string } | null {
    if (type.type === 'named') {
      if (type.typeSpec === list) {
        const item = this.genVarName('item');
        const typeVar = this.makeUnitConverter(
          item,
          type.typeVars[0],
          substitutions,
          toTypeVar,
        );
        if (typeVar) {
          const result = this.genVarName('result');
          return {
            statements: [
              // Array#map: IE9+
              `var ${result} = ${name}.map(function (${item}) {`,
              ...this.indent([
                ...typeVar.statements,
                `return ${typeVar.expression};`,
              ]),
              `});`,
            ],
            expression: result,
          };
        }
      } else if (type.typeSpec === cmd) {
        const result = this.genVarName('result');
        const typeVar = this.makeUnitConverter(
          result,
          type.typeVars[0],
          substitutions,
          toTypeVar,
        );
        if (typeVar) {
          const callback = this.genVarName('callback');
          return {
            statements: [
              `function (${callback}) {`,
              `  return ${name}(function (${result}) {`,
              ...this.indent(
                this.indent([
                  ...typeVar.statements,
                  `${callback}(${typeVar.expression});`,
                ]),
              ),
              '  });',
              '}',
            ],
            expression: '',
          };
        }
      } else if (type.typeSpec === map) {
        throw new Error('TODO: Maps');
      } else if (EnumSpec.isEnum(type)) {
        const typeVarRepr = normaliseEnum(type);
        const substituted = substitute(type, substitutions);
        if (!EnumSpec.isEnum(substituted)) {
          throw new Error('Substituted enum is not enum anymore??');
        }
        const typeSpec = type.typeSpec;
        if (typeSpec !== substituted.typeSpec) {
          throw new Error('Odd, type spec changed??');
        }
        const from = normaliseEnum(toTypeVar ? type : substituted);
        const to = normaliseEnum(toTypeVar ? substituted : type);
        if (JSON.stringify(from) !== JSON.stringify(to)) {
          //
        }
      } else if (type.typeSpec instanceof FuncTypeVarSpec) {
        const substitution = substitutions.get(type.typeSpec);
        if (substitution && isUnitLike(substitution)) {
          return { statements: [], expression: this.require('unit') };
        }
      }
    }
    return null;
  }
}
