export function findLastIndex<T>(
  arr: ArrayLike<T>,
  condition: (value: T, index: number) => boolean,
): number {
  for (let i = arr.length; i--; ) {
    if (condition(arr[i], i)) {
      return i;
    }
  }
  return -1;
}
