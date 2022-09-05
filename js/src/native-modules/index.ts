import { CompilationContext, HasExports } from '../compiler/CompilationContext';
import { NType } from '../type-checker/types/types';
import { TypeSpec } from '../type-checker/types/TypeSpec';
import fek from './fek';
import FileIO from './file-io';
import json from './json';
import request from './request';
import SystemIO from './system-io';
import times from './times';
import websocket from './websocket';

export type CompiledModule = {
  statements: string[];
  exports: Record<string, string>;
};

export interface NativeModule {
  variables?: Record<string, NType>;
  types?: Record<string, TypeSpec>;

  compile(context: CompilationContext): CompiledModule;
}

export const modules: Record<string, NativeModule> = {
  fek,
  FileIO,
  json,
  request,
  SystemIO,
  times,
  websocket,
};
