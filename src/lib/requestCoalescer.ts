/**
 * Request coalescer — if a request for the same key is already in-flight,
 * return the same promise instead of starting a new one.
 *
 * Prevents duplicate external API calls when multiple users request
 * the same translation/audio at the same time.
 */

const inFlightRequests = new Map<string, Promise<unknown>>();

export async function coalesce<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key) as Promise<T>;
  }

  const promise = fn().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, promise);
  return promise;
}
