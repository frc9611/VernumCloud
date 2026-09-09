import { computed, ref, watch } from 'vue';

/*
 * The layout of the dashboard home, per person and per team.
 *
 * What is saved is small on purpose: the tab that was open, the order of the sections and of the
 * shortcut cards, and which of them the person hid. It lives in the preferences of the person under
 * `dashboard.<tenantId>` — one key per team, because the same person conducts one team and only
 * attends another, and wants a different first screen in each.
 *
 * Rendering never trusts the saved order alone. It starts from it, drops the keys that no longer exist
 * or that the person may not open today, and appends whatever is new in the default order. So a new
 * shortcut never disappears, a stale key never breaks anything, and a permission taken away removes
 * the card without leaving a hole.
 */

/** The sections of the home tab in their default order. `welcome` is fixed first and never moves. */
export const SECTIONS = [
  { key: 'welcome', title: 'Boas-vindas', fixed: true },
  { key: 'shortcuts', title: 'Atalhos da equipe' },
  { key: 'myTasks', title: 'Suas demandas' },
  { key: 'processes', title: 'Processos seletivos abertos' },
  { key: 'trips', title: 'Suas viagens' },
  { key: 'board', title: 'Mural de avisos' },
  { key: 'accessRequests', title: 'Pedidos de acesso' },
];

export const DEFAULT_TAB = 'home';

/**
 * The rendering rule. `saved` is what the person arranged (may be anything), `available` the keys
 * they may see today, `defaults` every known key in default order.
 */
export function resolveOrder(saved, available, defaults) {
  const allowed = new Set(available);
  const order = [];
  for (const key of Array.isArray(saved) ? saved : []) {
    if (typeof key === 'string' && allowed.has(key) && !order.includes(key)) order.push(key);
  }
  for (const key of defaults) {
    if (allowed.has(key) && !order.includes(key)) order.push(key);
  }
  return order;
}

/** Hidden keys that still make sense today. */
export function resolveHidden(saved, available) {
  const allowed = new Set(available);
  return (Array.isArray(saved) ? saved : []).filter((key) => typeof key === 'string' && allowed.has(key));
}

/** Moves `key` by `delta` places inside a copy of `list`; out of range means "stay where it is". */
export function moveBy(list, key, delta) {
  const from = list.indexOf(key);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= list.length) return list.slice();
  return moveTo(list, key, to);
}

/** Moves `key` to `index` inside a copy of `list`. */
export function moveTo(list, key, index) {
  const from = list.indexOf(key);
  if (from < 0) return list.slice();
  const next = list.slice();
  next.splice(from, 1);
  next.splice(Math.max(0, Math.min(index, next.length)), 0, key);
  return next;
}

function toggled(list, key) {
  return list.includes(key) ? list.filter((item) => item !== key) : [...list, key];
}

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * The composable the home view drives.
 *
 * `availableSections` and `availableShortcuts` are computeds of the keys the person may see now,
 * `shortcutDefaults` the default order of every shortcut key, and `organizing` (optional) the ref that
 * says whether the organiser is open. Everything read back is already resolved
 * by the rule above; every write persists the resolved arrays, so the setting always describes what is
 * on the screen.
 */
export function useDashboardLayout({ auth, prefs, organizing, availableSections, availableShortcuts, shortcutDefaults }) {
  //The caller may own the flag, since "what exists today" can depend on it (an empty panel shows while organising)
  const organizingRef = organizing || ref(false);

  const settingKey = computed(() => 'dashboard.' + auth.activeTenantId);
  const saved = computed(() => {
    const value = prefs.getSetting(settingKey.value, null);
    return isObject(value) ? value : {};
  });

  const sectionDefaults = SECTIONS.map((section) => section.key);
  const sectionOrder = computed(() => resolveOrder(saved.value.sections, availableSections.value, sectionDefaults));
  const hiddenSections = computed(() => resolveHidden(saved.value.hiddenSections, availableSections.value));
  const shortcutOrder = computed(() => resolveOrder(saved.value.shortcuts, availableShortcuts.value, shortcutDefaults));
  const hiddenShortcuts = computed(() => resolveHidden(saved.value.hiddenShortcuts, availableShortcuts.value));
  const savedTab = computed(() => (typeof saved.value.tab === 'string' ? saved.value.tab : DEFAULT_TAB));
  const customized = computed(() => Object.keys(saved.value).some((key) => key !== 'tab'));

  //Leaving a team closes the organiser; the next team has its own arrangement
  watch(() => auth.activeTenantId, () => { organizingRef.value = false; });

  function write(patch) {
    if (!auth.activeTenantId) return;
    prefs.setSetting(settingKey.value, {
      tab: savedTab.value,
      sections: sectionOrder.value,
      hiddenSections: hiddenSections.value,
      shortcuts: shortcutOrder.value,
      hiddenShortcuts: hiddenShortcuts.value,
      ...patch,
    });
  }

  /** Only the tab: the arrangement is left as it was, defaults included, until the person touches it. */
  function setTab(tab) {
    if (!auth.activeTenantId || tab === savedTab.value) return;
    prefs.setSetting(settingKey.value, { ...saved.value, tab });
  }

  function moveSection(key, delta) {
    write({ sections: moveBy(sectionOrder.value, key, delta) });
  }

  function moveSectionTo(key, targetKey) {
    if (key === targetKey) return;
    write({ sections: moveTo(sectionOrder.value, key, sectionOrder.value.indexOf(targetKey)) });
  }

  function toggleSection(key) {
    write({ hiddenSections: toggled(hiddenSections.value, key) });
  }

  function moveShortcut(key, delta) {
    write({ shortcuts: moveBy(shortcutOrder.value, key, delta) });
  }

  function moveShortcutTo(key, targetKey) {
    if (key === targetKey) return;
    write({ shortcuts: moveTo(shortcutOrder.value, key, shortcutOrder.value.indexOf(targetKey)) });
  }

  function toggleShortcut(key) {
    write({ hiddenShortcuts: toggled(hiddenShortcuts.value, key) });
  }

  /** Forgets the whole arrangement of this team, the remembered tab included. */
  function restoreDefaults() {
    if (!auth.activeTenantId) return;
    prefs.removeSetting(settingKey.value);
  }

  function startOrganizing() {
    organizingRef.value = true;
  }

  /** Sends what is queued right away: the person just said they are done. */
  function finishOrganizing() {
    organizingRef.value = false;
    prefs.flush();
  }

  return {
    organizing: organizingRef,
    customized,
    savedTab,
    sectionOrder,
    hiddenSections,
    shortcutOrder,
    hiddenShortcuts,

    setTab,
    moveSection,
    moveSectionTo,
    toggleSection,
    moveShortcut,
    moveShortcutTo,
    toggleShortcut,
    restoreDefaults,
    startOrganizing,
    finishOrganizing,
  };
}
