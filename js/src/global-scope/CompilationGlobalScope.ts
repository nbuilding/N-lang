import { CompilationContext } from '../compiler/CompilationContext';
import { CompilationScope } from '../compiler/CompilationScope';

export class CompilationGlobalScope extends CompilationScope {
  names = new Map([
    ['none', 'undefined'],
    ['false', 'false'],
    ['true', 'true'],
  ]);

  constructor(context: CompilationContext) {
    super(context);
  }

  getName(name: string): string {
    const jsName = this.names.get(name);
    return jsName ?? this.context.require(name);
  }
}
