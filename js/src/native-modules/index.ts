import { NType, TypeSpec } from '../type-checker/types/types'
import fek from './fek'
import FileIO from './file-io'
import json from './json'
import request from './request'
import SystemIO from './system-io'
import times from './times'
import websocket from './websocket'

export interface NativeModule {
  variables?: Record<string, NType>
  types?: Record<string, TypeSpec>
}

export const modules: Record<string, NativeModule> = {
  fek,
  FileIO,
  json,
  request,
  SystemIO,
  times,
  websocket,
}
