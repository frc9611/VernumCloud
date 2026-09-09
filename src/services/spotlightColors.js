import { people } from '@/services/api.js';

/*
 * A small shared cache of "the color this person's name should be painted", so `PersonLink` never
 * has to fetch a whole profile just to color a name. Every subscription in the same tick is batched
 * into one request to `GET /people/spotlight-colors` — a table of forty names costs one round trip,
 * not forty.
 */
const cache = new Map(); // userId -> color string, or null when the person has none
const waiting = new Map(); // userId -> Set of callbacks
const pendingIds = new Set();
let timer = null;

function flush() {
  timer = null;
  const ids = Array.from(pendingIds);
  pendingIds.clear();
  if (!ids.length) return;
  people.spotlightColors(ids).then(({ data }) => {
    ids.forEach((id) => resolve(id, (data && data[id]) || null));
  }).catch(() => {
    ids.forEach((id) => resolve(id, null));
  });
}

function resolve(userId, color) {
  cache.set(userId, color);
  const callbacks = waiting.get(userId);
  if (callbacks) {
    callbacks.forEach((callback) => callback(color));
    waiting.delete(userId);
  }
}

/** Subscribes to a person's primary spotlight color; returns an unsubscribe function. */
export function subscribeSpotlightColor(userId, callback) {
  if (!userId) return () => undefined;
  if (cache.has(userId)) {
    callback(cache.get(userId));
    return () => undefined;
  }
  if (!waiting.has(userId)) waiting.set(userId, new Set());
  waiting.get(userId).add(callback);
  pendingIds.add(userId);
  if (!timer) timer = setTimeout(flush, 30);
  return () => waiting.get(userId)?.delete(callback);
}
