export function displayType (value: any): string {
  if (value === null) {
    return 'null'
  } else if (typeof value === 'object') {
    return value.constructor.name + (Array.isArray(value) ? ` (length ${value.length})` : '')
  } else {
    return typeof value
  }
}
