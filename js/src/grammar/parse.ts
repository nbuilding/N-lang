import util from 'util';
import assert from 'assert';
import { Parser, Grammar } from 'nearley';
import grammar from './n-lang.grammar';
import { Block, Base, DiffError } from '../ast/index';
import { Token } from 'moo';
import { isToken } from '../utils/type-guards';

export class ParseBaseError extends SyntaxError {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ParseUnexpectedEOFError extends ParseBaseError {
  results: unknown[];

  constructor(results: unknown[]) {
    super('Unexpected end of input.');
    this.results = results;
  }
}

export class ParseAmbiguityError extends ParseBaseError {
  results: unknown[];

  constructor(results: unknown[]) {
    super(`Ambiguous grammar detected: ${results.length} possibilities.`);
    this.results = results;
  }
}

export class ParseNearleyError extends ParseBaseError {
  line: number;
  col: number;
  expected: string[];

  constructor(message: string, line: number, col: number, expected: string[]) {
    super(message);
    this.line = line;
    this.col = col;
    this.expected = expected;
  }
}

export class ParseUnexpectedInputError extends ParseNearleyError {
  constructor(line: number, col: number, expected: string[]) {
    super('The lexer did not expect this input.', line, col, expected);
  }
}

export class ParseTokenError extends ParseNearleyError {
  token: Token;

  constructor(token: Token, line: number, col: number, expected: string[]) {
    super(`Unexpected ${token.type} token`, line, col, expected);
    this.token = token;
  }

  get end(): { line: number; col: number } {
    const { line, col, lineBreaks, text } = this.token;
    const lastLine = text.includes('\n')
      ? text.slice(text.lastIndexOf('\n') + 1)
      : text;
    return {
      line: line + lineBreaks,
      col: col + lastLine.length,
    };
  }
}

export type ParseError =
  | ParseUnexpectedEOFError
  | ParseAmbiguityError
  | ParseUnexpectedInputError
  | ParseTokenError;

function isNearleyError(
  error: unknown,
): error is Error & { offset: number; token?: Token } {
  return (
    error instanceof Error &&
    'offset' in error &&
    typeof error['offset'] === 'number' &&
    (error['token'] === undefined || isToken(error['token']))
  );
}

// tfw you have to parse errors from a parser
const lineColRegex =
  /^(?:invalid syntax|Syntax error) at line (\d+) col (\d+):\n\n {2}[^\n]+\n {2,}\^/;
const unexpectedRegex =
  /Unexpected (?:input(?: ("(?:[^"]|\\")+"))? \(lexer error\)|(.+) token: "(?:[^"]|\\")+")\./;
const basedOnRegex = /A ("(?:[^"]|\\")+"|.+ token) based on:/g;
/*
Unexpected input (lexer error).
Unexpected input "wiggle" (lexer error). // Does this happen?
Unexpected lbracket token: "(".
Unexpected string token: "w\"".
Unexpected let keyword token: "let".
Unexpected symbol token: ".".
*/
// https://github.com/kach/nearley/blob/master/lib/nearley.js#L367-L422
// https://github.com/no-context/moo/blob/master/moo.js#L574-L580
function parseNearleyError(
  error: Error & { offset: number; token?: Token },
): ParseTokenError | ParseUnexpectedInputError | null {
  const lineColMatch = error.message.match(lineColRegex);
  if (lineColMatch) {
    const [, line, col] = lineColMatch;
    const nearleyMsg = error.message.replace(lineColRegex, '');
    const expectedInstead = [];
    let match;
    while ((match = basedOnRegex.exec(nearleyMsg))) {
      const [, expected] = match;
      expectedInstead.push(expected);
    }
    const unexpectedMatch = nearleyMsg.match(unexpectedRegex);
    if (unexpectedMatch) {
      const [, lexerInput, tokenType] = unexpectedMatch;
      if (lexerInput === undefined) {
        if (tokenType !== undefined) {
          if (!error.token) {
            console.log("tokenType isn't undefined but error.token is??");
          } else {
            if (error.token.type !== tokenType) {
              console.log(
                `error.token.type=${error.token.type} but tokenType=${tokenType}`,
              );
            }
            return new ParseTokenError(
              error.token,
              +line,
              +col,
              expectedInstead,
            );
          }
        } else {
          return new ParseUnexpectedInputError(+line, +col, expectedInstead);
        }
      } else {
        console.log("lexerInput isn't undefined! :o");
      }
    }
  }
  console.log(error.message.slice(0, 500));
  return null;
}

export interface ParseOptions {
  ambiguityOutput?: 'omit' | 'object' | 'string';
  loud?: boolean;
}

export function parse(
  script: string,
  { ambiguityOutput = 'omit', loud = false }: ParseOptions = {},
): Block | ParseError {
  const parser = new Parser(Grammar.fromCompiled(grammar));
  try {
    parser.feed(script);
  } catch (err) {
    if (isNearleyError(err)) {
      const error = parseNearleyError(err);
      if (error) {
        return error;
      }
    }
    throw err;
  }
  const [result, ...ambiguities] = parser.results;
  if (!result) {
    return new ParseUnexpectedEOFError(parser.results);
  }
  if (ambiguities.length) {
    let results: string;
    switch (ambiguityOutput) {
      case 'omit': {
        results = '[results omitted]';
        break;
      }
      case 'object': {
        results = util.inspect(parser.results, {
          depth: null,
          colors: true,
        });
        break;
      }
      case 'string': {
        results = parser.results.map(a => a.toString(true)).join('\n\n');
        break;
      }
    }
    if (loud) {
      console.error(results);
      let i = parser.results.length - 1;
      try {
        for (; i >= 1; i--) {
          const one = parser.results[0];
          const other = parser.results[i];
          if (one instanceof Base && other instanceof Base) {
            const differences = one.diff(other);
            if (differences.length > 0) {
              throw new DiffError(differences);
            }
          } else {
            assert.deepStrictEqual(one, other);
          }
        }
        console.error('All the results are exactly the same! D:');
      } catch (err) {
        console.error(err.message);
        console.error(`^ Differences between results 0 and ${i}`);
      }
    }
    return new ParseAmbiguityError(parser.results);
  }
  return result;
}
