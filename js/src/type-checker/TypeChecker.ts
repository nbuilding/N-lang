import {
  AssertValue,
  Base,
  BasePosition,
  Block,
  ImportFile,
} from '../ast/index';
import { CompilationContext } from '../compiler/CompilationContext';
import {
  parse,
  ParseAmbiguityError,
  ParseError,
  ParseUnexpectedInputError,
  ParseUnexpectedEOFError,
} from '../grammar/parse';
import { Error as NError } from './errors/Error';
import { ErrorDisplayer, FilePathSpec } from './errors/ErrorDisplayer';
import { Warning as NWarning } from './errors/Warning';
import { GlobalScope } from '../global-scope/GlobalScope';
import { cmd } from './types/builtins';
import { NModule, NType, unknown, Unknown } from './types/types';

/** Yields relative paths from `imp` expressions */
function* getImportPaths(base: Base): Generator<string> {
  if (base instanceof ImportFile) {
    yield base.getImportPath();
  }
  for (const child of base.children) {
    yield* getImportPaths(child);
  }
}

type Compiled = { compiled: string[]; exportNames: Map<string, string> };
type Compilable = Block | Compiled;
type ModuleState =
  | { state: 'loading' }
  | { state: 'loaded'; module: NModule | Unknown; compilable: Compilable }
  | { state: 'error'; error: typeof NOT_FOUND | typeof BAD_PATH };

export class TypeCheckerResults {
  checker: TypeChecker;

  startPath: string;

  types: Map<Base, NType> = new Map();

  files: Map<string, BaseResultsForFile> = new Map();

  /**
   * All `assert value` assertions; the length of this array also represents the
   * next ID of an `assert value` assertion.
   */
  valueAssertions: {
    assertion: AssertValue;
    file: TypeCheckerResultsForFile;
  }[] = [];

  lastExportedCmd?: { moduleId: string; name: string };

  constructor(checker: TypeChecker, startPath: string) {
    this.checker = checker;
    this.startPath = startPath;
  }

  newFile(
    absolutePath: string,
    source: string,
    modules: Map<string, ModuleState> = new Map(),
  ): TypeCheckerResultsForFile {
    const file = new TypeCheckerResultsForFile(
      this,
      absolutePath,
      source.split(/\r?\n/),
      modules,
    );
    this.files.set(absolutePath, file);
    return file;
  }

  syntaxError(
    absolutePath: string,
    source: string,
    error: ParseError,
  ): SyntaxErrorForFile {
    const result = new SyntaxErrorForFile(
      this,
      absolutePath,
      source.split(/\r?\n/),
      error,
    );
    this.files.set(absolutePath, result);
    return result;
  }

  /**
   * Joins all the errors and warnings together into a single string, separated
   * by double newlines.
   */
  displayAll(displayer: ErrorDisplayer): {
    display: string;
    errors: number;
    warnings: number;
  } {
    const allWarnings = [];
    const allErrors = [];
    for (const file of this.files.values()) {
      const { errors, warnings = [] } = file.display(displayer);
      allWarnings.push(...warnings);
      allErrors.push(...errors);
    }
    return {
      display: [...allWarnings, ...allErrors].join('\n\n'),
      errors: allErrors.length,
      warnings: allWarnings.length,
    };
  }

  displayValueAssertions(
    displayer: ErrorDisplayer,
    results: { [id: number]: boolean },
  ): { display: string; failures: number } {
    const failures = [];
    for (const [id, passed] of Object.entries(results)) {
      if (!passed) {
        const {
          assertion,
          file: { path, lines },
        } = this.valueAssertions[+id];
        failures.push(
          displayer.displayValueAssertionFailure(path, lines, assertion),
        );
      }
    }
    return {
      display: failures.join('\n\n'),
      failures: failures.length,
    };
  }
}

export abstract class BaseResultsForFile {
  parent: TypeCheckerResults;
  absolutePath: string;
  lines: string[];
  modules: Map<string, ModuleState>;

  constructor(
    parent: TypeCheckerResults,
    absolutePath: string,
    lines: string[],
    modules: Map<string, ModuleState>,
  ) {
    this.parent = parent;
    this.absolutePath = absolutePath;
    this.lines = lines;
    this.modules = modules;
  }

  get path(): FilePathSpec {
    return {
      file: this.absolutePath,
      base: this.parent.startPath,
    };
  }

  display(_displayer: ErrorDisplayer): {
    errors: string[];
    warnings?: string[];
  } {
    throw new Error('Not implemented');
  }
}

export class TypeCheckerResultsForFile extends BaseResultsForFile {
  errors: NError[] = [];
  warnings: NWarning[] = [];

  display(displayer: ErrorDisplayer): { errors: string[]; warnings: string[] } {
    return {
      errors: this.errors.map(error =>
        displayer.displayError(this.path, this.lines, error),
      ),
      warnings: this.warnings.map(warning =>
        displayer.displayWarning(this.path, this.lines, warning),
      ),
    };
  }

  /**
   * Adds the `assert value` statement to the array of value assertions and
   * returns its ID.
   */
  addValueAssertion(assertion: AssertValue): number {
    return this.parent.valueAssertions.push({ assertion, file: this }) - 1;
  }
}

export class SyntaxErrorForFile extends BaseResultsForFile {
  error: ParseError;

  constructor(
    parent: TypeCheckerResults,
    absolutePath: string,
    lines: string[],
    error: ParseError,
  ) {
    super(parent, absolutePath, lines, new Map());
    this.error = error;
  }

  get position(): BasePosition {
    if (
      this.error instanceof ParseUnexpectedEOFError ||
      this.error instanceof ParseAmbiguityError
    ) {
      const lastLine = this.lines[this.lines.length - 1];
      if (lastLine.length === 0) {
        const penultimateLine = this.lines[this.lines.length - 2];
        return {
          line: this.lines.length - 1,
          col: penultimateLine.length,
          endLine: this.lines.length - 1,
          endCol: penultimateLine.length + 1,
        };
      } else {
        return {
          line: this.lines.length,
          col: lastLine.length,
          endLine: this.lines.length,
          endCol: lastLine.length + 1,
        };
      }
    } else if (this.error instanceof ParseUnexpectedInputError) {
      return {
        line: this.error.line,
        col: this.error.col,
        endLine: this.error.line,
        endCol: this.error.col + 1,
      };
    } else {
      const { line, col } = this.error.end;
      return {
        line: this.error.line,
        col: this.error.col,
        endLine: line,
        endCol: col,
      };
    }
  }

  display(displayer: ErrorDisplayer): { errors: string[] } {
    return {
      errors: [
        displayer.displaySyntaxError(
          this.path,
          this.lines,
          this.error,
          this.position,
        ),
      ],
    };
  }
}

export const NOT_FOUND = Symbol('not found');
export const BAD_PATH = Symbol('bad path');

type ParsedBlockWithSource = { source: string; block: Block };
type CompiledModule = { module: NModule; compiled: Compiled };
type CompilableModule = { module: NModule; compilable: Compilable };
type ParseErrorWithSource = { source: string; error: ParseError };
export type ProvidedFile =
  | string
  | ParsedBlockWithSource
  | CompiledModule
  | ParseErrorWithSource
  | typeof NOT_FOUND
  | typeof BAD_PATH;

export interface CheckerOptions {
  /**
   * Resolve a unique path name per file given a base path. If two files import
   * the same file, the path to that file should be the same.
   */
  absolutePath(basePath: string, importPath: string): string;

  /**
   * Asynchronously gets an imported file and returns the parsed file.
   */
  provideFile(path: string): ProvidedFile | PromiseLike<ProvidedFile>;
}

export interface CompilationOptions {
  /**
   * The type of module to compile to.
   *
   * The module will export:
   * - `valueAssertions`, an object mapping from number keys to a boolean
   *   determining whether the assertion passed.
   * - `main`, a function that, given a callback, will execute the last exported
   *   cmd and call the callback when finished.
   *
   * If you want to compile to a CommonJS or AMD module, then use `umd`.
   *
   * Default: `iife`.
   */
  module?:
    | {
        type: 'esm';
      }
    | {
        type: 'iife';

        /**
         * Whether to immediately execute the main cmd. This is because the IIFE
         * will return the exports as an object (for use with the `eval`
         * function), but minifiers might discard this if the IIFE is on its
         * own.
         *
         * Default: `false`
         */
        executeMain?: boolean;
      }
    | {
        type: 'umd';

        /**
         * Outside of a CommonJS or AMD module, the exports will be made global
         * under this name.
         *
         * Default: `n`
         */
        name?: string;
      };
}

export class TypeChecker {
  options: CheckerOptions;

  /** Maps an absolute path to the module state */
  moduleCache: Map<string, ModuleState> = new Map();

  constructor(options: CheckerOptions) {
    this.options = options;
  }

  /**
   * @param startPath - The absolute path (unique file ID) of the start file.
   */
  async start(startPath: string): Promise<TypeCheckerResults> {
    const results = new TypeCheckerResults(this, startPath);
    await this._ensureModuleLoaded(results, startPath);

    const state = this.moduleCache.get(startPath);
    if (state && state.state === 'loaded' && state.module.type === 'module') {
      const lastExportedCmd = [...state.module.types]
        .reverse()
        .find(([, type]) => type.type === 'named' && type.typeSpec === cmd);
      if (lastExportedCmd) {
        results.lastExportedCmd = {
          moduleId: startPath,
          name: lastExportedCmd[0],
        };
      }
    }
    return results;
  }

  /** Try to parse and type check a module given by `provideFile` */
  private async _getResultFromProvided(
    results: TypeCheckerResults,
    modulePath: string,
    provided: ProvidedFile,
  ): Promise<CompilableModule | ParseErrorWithSource | null> {
    if (typeof provided === 'symbol') {
      this.moduleCache.set(modulePath, { state: 'error', error: provided });
      return null;
    } else if (typeof provided === 'string' || 'block' in provided) {
      let blockWithSource: ParsedBlockWithSource;
      if (typeof provided === 'string') {
        const parsed = parse(provided);
        if (parsed instanceof Block) {
          blockWithSource = { source: provided, block: parsed };
        } else {
          return { source: provided, error: parsed };
        }
      } else {
        blockWithSource = provided;
      }
      const { source, block } = blockWithSource;

      const relToAbsPaths: Map<string, string> = new Map();
      for (const importPath of getImportPaths(block)) {
        const path = this.options.absolutePath(modulePath, importPath);
        relToAbsPaths.set(importPath, path);
      }
      await Promise.all(
        Array.from(relToAbsPaths.values(), path =>
          this._ensureModuleLoaded(results, path),
        ),
      );

      const globalScope = new GlobalScope(
        results.newFile(
          modulePath,
          source,
          new Map(
            Array.from(relToAbsPaths, ([path, absPath]) => {
              const state = this.moduleCache.get(absPath);
              if (!state) {
                throw new Error('module cache does not have absolute path.');
              }
              return [path, state];
            }),
          ),
        ),
      );
      const scope = globalScope.inner({ exportsAllowed: true });
      scope.checkStatement(block);
      scope.end();
      return { module: scope.toModule(modulePath), compilable: block };
    } else if ('module' in provided) {
      return { module: provided.module, compilable: provided.compiled };
    } else {
      return provided;
    }
  }

  /**
   * @param modulePath - Unique ID for the file (with a file system, the
   * absolute path).
   */
  private async _ensureModuleLoaded(
    results: TypeCheckerResults,
    modulePath: string,
  ) {
    if (this.moduleCache.has(modulePath)) return;
    this.moduleCache.set(modulePath, { state: 'loading' });

    const result = await this._getResultFromProvided(
      results,
      modulePath,
      await this.options.provideFile(modulePath),
    );
    if (result) {
      if ('error' in result) {
        results.syntaxError(modulePath, result.source, result.error);
        this.moduleCache.set(modulePath, {
          state: 'loaded',
          module: unknown,
          compilable: Block.empty(),
        });
      } else {
        this.moduleCache.set(modulePath, { state: 'loaded', ...result });
      }
    }
  }

  /**
   * Call this after calling `start()`. Throws an error if this was called with
   * type errors.
   */
  compile(
    results: TypeCheckerResults,
    { module = { type: 'iife', executeMain: true } }: CompilationOptions = {},
  ): string {
    const context = new CompilationContext();
    const compiled: string[] = [];
    // Reverse the module cache because insertion order probably happens from
    // dependents -> dependencies
    for (const [modulePath, state] of [...this.moduleCache].reverse()) {
      if (state.state !== 'loaded') {
        throw new Error(`${modulePath} is of state ${state.state}`);
      }
      if (state.compilable instanceof Block) {
        compiled.push(...context.compile(state.compilable, modulePath));
      } else {
        compiled.push(...state.compilable.compiled);
        context.defineModuleNames(modulePath, state.compilable.exportNames);
      }
    }
    const prelude = [
      'var undefined; // This helps minifiers to use a shorter variable name than `void 0`.',
      'var valueAssertionResults_n = {};',
      `for (var i = 0; i < ${results.valueAssertions.length}; i++) {`,
      '  valueAssertionResults_n[i] = false;',
      '}',
      ...context.dependencies,
    ];
    const main = context.genVarName('main');
    if (results.lastExportedCmd) {
      const mainVar = context
        .getModule(results.lastExportedCmd.moduleId)
        .names.get(results.lastExportedCmd.name);
      if (!mainVar) {
        throw new ReferenceError(
          `Cannot find name for ${results.lastExportedCmd.name}`,
        );
      }
      compiled.push(
        `function ${main}(callback) {`,
        '  if (typeof Promise !== "undefined") {',
        '    return new Promise(function (resolve) {',
        `      ${mainVar}(function (result) {`,
        '        resolve(result);',
        '        if (callback) callback(result);',
        '      });',
        '    });',
        '  } else {',
        `    ${mainVar}(function (result) {`,
        '      if (callback) callback(result);',
        '    });',
        '  }',
        '}',
      );
    } else {
      compiled.push(
        `function ${main}(callback) {`,
        '  if (callback) callback();',
        '  if (typeof Promise !== "undefined") {',
        '    return Promise.resolve()',
        '  }',
        '}',
      );
    }
    let lines;
    if (module.type === 'umd') {
      // https://github.com/umdjs/umd/blob/master/templates/returnExports.js
      lines = [
        '(function (root, factory) {',
        "  if (typeof define === 'function' && define.amd) {",
        '    define([], factory);',
        "  } else if (typeof module === 'object' && module.exports) {",
        '    module.exports = factory();',
        '  } else {',
        `    root.${module.name ?? 'n'} = factory();`,
        '  }',
        "}(typeof self !== 'undefined' ? self : this, function () {",
        ...context.indent([
          ...prelude,
          ...compiled,
          'return {',
          '  valueAssertions: valueAssertionResults_n,',
          `  main: ${main},`,
          '};',
        ]),
        '}));',
      ];
    } else if (module.type === 'iife') {
      if (module.executeMain) {
        compiled.push(`${main}();`);
      }
      lines = [
        '(function () {',
        ...context.indent([
          ...prelude,
          ...compiled,
          'return {',
          '  valueAssertions: valueAssertionResults_n,',
          `  main: ${main},`,
          '};',
        ]),
        '})();',
      ];
    } else {
      lines = [
        ...prelude,
        ...compiled,
        'export {',
        '  valueAssertionResults_n as valueAssertions,',
        `  ${main} as main,`,
        '};',
      ];
    }
    return lines.map(line => line + '\n').join('');
  }
}

export type CompiledExports = {
  valueAssertions: { [id: number]: boolean };
  main<T>(callback?: (result: T) => void): Promise<T>;
};
