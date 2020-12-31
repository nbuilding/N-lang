export function displayType (value: any): string {
  if (value === null) {
    return 'null'
  } else if (typeof value === 'object') {
    return value.constructor.name
  } else {
    return typeof value
  }
}
