import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { preferences as api } from '@/services/api.js';
import { onSystemThemeChange, resolveTheme, systemPrefersDark } from '@/services/theme.js';

/*
 * What the person chose for themselves: the theme, and a bag of settings the screens own.
 *
 * The server is the truth and the store is optimistic about it: a change is applied here first,
 * mirrored to localStorage, and then sent. The mirror is what the next boot paints from before
 * /me/preferences answers, so somebody who chose dark never sees a white flash — and it is also
 * what keeps working against an older server that does not have the route yet: a 404 is swallowed
 * and the mirror stands.
 *
 * Settings are merged by the server, one key at a time and one level deep, so a screen saves only
 * its own key and never has to know what the other screens keep. Writes are debounced because a
 * board that saves the width of a column on every drag would otherwise send one request per pixel.
 */
const MIRROR_KEY = 'vc-preferences';
const SAVE_DELAY_MS = 600;
const THEMES = ['light', 'dark', 'system'];
const DEFAULT_THEME = 'light';

export const preferencesStore = defineStore('preferences', () => {
  const mirror = readMirror();
  const theme = ref(THEMES.includes(mirror.theme) ? mirror.theme : DEFAULT_THEME);
  const settings = ref(isObject(mirror.settings) ? mirror.settings : {});
  /** True once the server answered, or refused, at least once in this session. */
  const loaded = ref(false);
  /** The palette App.vue painted last: light, dark or admin. The header reads it. */
  const activeMode = ref('light');

  const osDark = ref(systemPrefersDark());
  onSystemThemeChange((mode) => {
    osDark.value = mode === 'dark';
  });

  /** light or dark: the theme with 'system' already asked of the OS. */
  const resolvedTheme = computed(() => resolveTheme(theme.value, osDark.value));
  const isAdminMode = computed(() => activeMode.value === 'admin');

  let pending = {};
  let timer = null;
  /*
   * Saves go out one at a time. The first PUT of a person creates their row, and two of them in
   * flight — the theme toggle and a board saving a column in the same second — would both try to
   * insert it and one would be refused by the unique constraint, taking its change with it.
   */
  let chain = Promise.resolve();

  /* --------------------------------------------------------------- mirror */

  function readMirror() {
    try {
      const raw = localStorage.getItem(MIRROR_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return isObject(parsed) ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function writeMirror() {
    try {
      localStorage.setItem(MIRROR_KEY, JSON.stringify({ theme: theme.value, settings: settings.value }));
    } catch (error) {
      //A full or blocked storage only costs the flash-free boot
    }
  }

  function apply(data) {
    if (!isObject(data)) return;
    if (THEMES.includes(data.theme)) theme.value = data.theme;
    const next = isObject(data.settings) ? { ...data.settings } : {};
    //A change made while the answer was on its way is newer than the answer: keep it
    Object.entries(pending).forEach(([key, value]) => {
      if (value === null) delete next[key];
      else next[key] = value;
    });
    settings.value = next;
    writeMirror();
  }

  /** Queues one PUT behind the previous one. Never rejects: a failed save is the mirror's problem. */
  function send(body) {
    chain = chain.then(() => api.save(body)).catch(() => {
      //404 on an older server, or offline: the choice stands locally and the next load reconciles
    });
    return chain;
  }

  /* -------------------------------------------------------------- actions */

  /** Fetches the preferences. Only call it logged in; an older server without the route is fine. */
  async function load() {
    try {
      const { data } = await api.all();
      apply(data);
    } catch (error) {
      //404 on an older server, or offline: the mirror already painted the screen
    } finally {
      loaded.value = true;
    }
  }

  async function setTheme(mode) {
    if (!THEMES.includes(mode)) return;
    theme.value = mode;
    writeMirror();
    await send({ theme: mode });
  }

  function getSetting(key, fallback) {
    const value = settings.value[key];
    return value === undefined || value === null ? fallback : value;
  }

  /** Replaces one key as a whole and queues the save. Merging into the others is the server's job. */
  function setSetting(key, value) {
    settings.value = { ...settings.value, [key]: value };
    writeMirror();
    queue(key, value);
  }

  /** Removes one key. The server understands null as "take it out". */
  function removeSetting(key) {
    const next = { ...settings.value };
    delete next[key];
    settings.value = next;
    writeMirror();
    queue(key, null);
  }

  function queue(key, value) {
    pending[key] = value;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, SAVE_DELAY_MS);
  }

  /** Sends what is queued now, without waiting for the debounce. */
  async function flush() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    const batch = pending;
    pending = {};
    if (!Object.keys(batch).length) return;
    await send({ settings: batch });
  }

  //A tab closed inside the debounce window would lose the last change; hiding is the earliest warning
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
  }

  /** Written by App.vue after painting, so the header knows which palette is on. */
  function setActiveMode(mode) {
    activeMode.value = mode;
  }

  /** Back to the defaults, mirror included. Called on logout so the next person starts clean. */
  function reset() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    pending = {};
    theme.value = DEFAULT_THEME;
    settings.value = {};
    loaded.value = false;
    try {
      localStorage.removeItem(MIRROR_KEY);
    } catch (error) {
      //Nothing to clear then
    }
  }

  return {
    theme,
    settings,
    loaded,
    activeMode,
    resolvedTheme,
    isAdminMode,

    load,
    setTheme,
    getSetting,
    setSetting,
    removeSetting,
    flush,
    setActiveMode,
    reset,
  };
});

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
