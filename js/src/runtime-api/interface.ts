export type NResponse = {
  status: number;
  statusText: string;
  body: string;
};

/**
 * To deal with differences in JavaScript APIs in Node and the web/Deno, an
 * object implementing this interface may be required for certain native
 * modules, such as FileIO, to work.
 *
 * None of these methods should throw runtime errors.
 */
export interface RuntimeApi {
  /**
   * Writes `content` to the file at `path` in UTF-8, and calls `callback` when
   * done. If the file does not exist, create it. If the file exists and already
   * has content, overwrite it.
   *
   * In environments that cannot write to the file system, saving the files in
   * memory should suffice.
   */
  writeFile(path: string, content: string, callback: () => void): void;

  /**
   * Appends `content` to the file at `path` in UTF-8, and calls `callback` when
   * done. If the file does not exist, create it.
   */
  appendFile(path: string, content: string, callback: () => void): void;

  /**
   * Reads the file at `path` in UTF-8, and calls `callback` with the file
   * content when done. If the file does not exist, call `callback` with `null`.
   */
  readFile(path: string, callback: () => string | null): void;

  /**
   * Outputs `question` (with no trailing newline), then reads bytes from stdin
   * until it receives an EOL (the newline character, \n), then calls `callback`
   * with the bytes as UTF-8 without the final newline character.
   */
  readline(question: string, callback: () => string): void;
}
