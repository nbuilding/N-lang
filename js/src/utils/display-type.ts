import { isObjectLike } from './type-guards';

export function displayType(value: unknown): string {
  if (value === null) {
    return 'null';
  } else if (isObjectLike(value)) {
    return (
      value.constructor.name +
      (Array.isArray(value) ? ` (length ${value.length})` : '')
    );
  } else {
    return typeof value;
  }
}
