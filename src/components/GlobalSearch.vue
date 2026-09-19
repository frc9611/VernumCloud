<template>
  <div :class="['vc-search', compact ? 'is-compact' : '', compactOpen ? 'is-open' : '']" @click="onRootClick">
    <!-- On a phone the box is a round button until it is tapped, so the header keeps its logo -->
    <button
      v-if="compact && !compactOpen"
      class="vc-search__compact-btn"
      type="button"
      aria-label="Buscar"
      title="Buscar"
      @click="focus"
    >
      <AppIcon name="search" :size="18" />
    </button>

    <div v-else class="vc-search__shell">
      <div class="vc-search__field">
        <AppIcon name="search" :size="16" class="vc-search__icon" />
        <input
          ref="inputEl"
          v-model="term"
          class="vc-input vc-search__input"
          type="search"
          role="combobox"
          autocomplete="off"
          :placeholder="placeholder"
          aria-label="Buscar na equipe"
          aria-controls="vc-search-list"
          :aria-expanded="open"
          :aria-activedescendant="activeId"
          @focus="open = true"
          @click="open = true"
          @keydown.down.prevent="move(1)"
          @keydown.up.prevent="move(-1)"
          @keydown.enter.prevent="choose"
          @keydown.esc.prevent="escape"
          @keydown.tab="close"
        />
        <span v-if="!term && !compact" class="vc-kbd vc-search__hotkey">{{ hotkeyLabel }}</span>
        <button
          v-if="compact"
          class="vc-btn vc-btn--ghost vc-btn--small vc-search__close"
          type="button"
          @click="close"
        >
          Fechar
        </button>
      </div>

      <div v-if="open" id="vc-search-list" class="vc-search__panel" role="listbox">
        <p v-if="!ready" class="vc-faint vc-search__state">
          Digite ao menos 2 letras para buscar em {{ auth.activeTenantName || 'sua equipe' }}.
        </p>

        <template v-else>
          <p v-if="loading" class="vc-faint vc-search__state">Buscando...</p>
          <p v-if="error" class="vc-search__state vc-search__state--error">{{ error }}</p>

          <div :class="['vc-search__results', loading ? 'is-waiting' : '']">
            <template v-for="group in visibleGroups" :key="group.type">
              <p class="vc-search__group-title">
                {{ group.label }}
                <span v-if="badge(group)" class="vc-faint">{{ badge(group) }}</span>
              </p>

              <button
                v-for="hit in group.items"
                :id="hitId(hit.flatIndex)"
                :key="group.type + '-' + hit.id"
                type="button"
                role="option"
                :aria-selected="hit.flatIndex === active"
                :class="['vc-search__hit', hit.flatIndex === active ? 'is-active' : '']"
                @mousemove="active = hit.flatIndex"
                @click="go(hit)"
              >
                <span class="vc-search__hit-icon">
                  <img
                    v-if="hit.avatar"
                    class="vc-search__hit-avatar"
                    :src="pictureUrl(hit.id)"
                    :alt="hit.title"
                  />
                  <AppIcon v-else :name="hit.icon || group.icon" :size="15" />
                </span>
                <span class="vc-search__hit-text">
                  <span class="vc-search__hit-title">
                    <template v-for="(piece, index) in parts(hit.title)" :key="index">
                      <mark v-if="piece.hit">{{ piece.text }}</mark>
                      <template v-else>{{ piece.text }}</template>
                    </template>
                  </span>
                  <span v-if="hit.subtitle" class="vc-search__hit-sub">{{ hit.subtitle }}</span>
                </span>
                <span v-if="hit.meta" class="vc-search__hit-meta">{{ hit.meta }}</span>
              </button>

              <button
                v-if="group.total > group.items.length"
                class="vc-search__more"
                type="button"
                @click="goList(group)"
              >
                Ver todos em {{ group.label }}
              </button>
            </template>
          </div>

          <p v-if="empty" class="vc-faint vc-search__state">Nada encontrado para “{{ term.trim() }}”.</p>
        </template>

        <div v-if="!compact" class="vc-search__foot">
          <span><span class="vc-kbd">↑ ↓</span> <span class="vc-faint">navegar</span></span>
          <span><span class="vc-kbd">Enter</span> <span class="vc-faint">abrir</span></span>
          <span><span class="vc-kbd">Esc</span> <span class="vc-faint">fechar</span></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AppIcon from './AppIcon.vue';
import { search as searchApi, users as usersApi } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';
import { authStore } from '@/store/auth.js';

/*
 * The search box of the header.
 *
 * One request answers every domain at once, already grouped and already cut down by the server to
 * what this person may read. The dropdown only draws a group whose permission and feature the
 * dashboard also agrees with, so a newer server never shows a line the screens would refuse to open.
 */

const DEBOUNCE_MS = 200;
const MIN_TERM = 2;
const MARKS = /\p{M}+/gu;

const auth = authStore();
const router = useRouter();
const toast = useToast();

const term = ref('');
const result = ref(null);
const loading = ref(false);
const error = ref('');
const open = ref(false);
const active = ref(-1);
const compact = ref(false);
const compactOpen = ref(false);
const inputEl = ref(null);

let timer = null;
let seq = 0;
let media = null;
let insideClick = false;

/* --------------------------------------------------------------- what is drawn */

/*
 * Permission on both ends. The server already cut the answer, but a group only reaches the screen
 * when this dashboard agrees the person may open it — and an unknown type (a server newer than the
 * dashboard) is hidden instead of drawn without a guard.
 */
const GUARDS = {
  PESSOA: () => auth.can('MEMBER_VIEW'),
  DEMANDA: () => auth.can('TASK_VIEW') && auth.featureOn('TASKS'),
  DIVISAO: () => auth.can('DIVISION_VIEW'),
  PROCESSO: () => auth.can('RECRUITMENT_VIEW') && auth.featureOn('RECRUITMENT'),
  CANDIDATO: () => auth.can('RECRUITMENT_VIEW') && auth.featureOn('RECRUITMENT'),
  RISCO: () => auth.can('RISK_VIEW') && auth.featureOn('RISKS'),
  REUNIAO: () => auth.can('MEETING_VIEW') && auth.featureOn('MEETINGS'),
  PAGINA: () => auth.can('WIKI_VIEW') && auth.featureOn('KNOWLEDGE_BASE'),
  ARQUIVO: () => auth.canAny('FILE_VIEW', 'TENANT_MANAGE') && auth.featureOn('CLOUD'),
  VIAGEM: () => auth.can('TRIP_VIEW') && auth.featureOn('TRIPS'),
  EVENTO: () => auth.can('EVENT_VIEW') && auth.featureOn('EVENTS'),
  AVISO: () => auth.can('ANNOUNCEMENT_VIEW') && auth.featureOn('ANNOUNCEMENTS'),
};

/** The groups that survive the guards, each line already carrying its place in the flat list. */
const visibleGroups = computed(() => {
  let index = 0;
  return (result.value?.groups || [])
    .filter((group) => GUARDS[group.type]?.() === true)
    .map((group) => ({
      ...group,
      items: (group.items || []).map((hit) => ({ ...hit, flatIndex: index++ })),
    }));
});

/** The lines as the arrows walk them: the group headers are not stops. */
const flatHits = computed(() => visibleGroups.value.flatMap((group) => group.items));

const ready = computed(() => term.value.trim().length >= MIN_TERM);
const empty = computed(() => ready.value && !loading.value && !error.value && !flatHits.value.length);
const activeId = computed(() => (active.value >= 0 ? hitId(active.value) : null));
const placeholder = computed(() =>
  auth.activeTenantName ? `Buscar em ${auth.activeTenantName}...` : 'Buscar...',
);
/* Ctrl on everything that is not an Apple keyboard, where the same shortcut is the command key. */
const hotkeyLabel = computed(() => (/Mac|iPhone|iPad|iPod/i.test(navigator.platform || '') ? '⌘K' : 'Ctrl K'));

function hitId(index) {
  return `vc-search-hit-${index}`;
}

function pictureUrl(userId) {
  return usersApi.pictureUrl(userId);
}

/*
 * How many the group has. The server counts what the person may read, so the number is the truth
 * it handed over; the "+" is there only when its probe stopped at its own ceiling and the rest was
 * never counted — each domain has a ceiling of its own, so no fixed number may be printed here.
 */
function badge(group) {
  if (group.total <= group.items.length && !group.capped) return '';
  return group.capped ? `${group.total}+` : String(group.total);
}

/* ------------------------------------------------------------------ highlight */

function fold(value) {
  return String(value || '').normalize('NFD').replace(MARKS, '').toLowerCase();
}

/*
 * The match is made by the database, whose collation ignores accent and case, so the client has to
 * fold the same way to know where to paint — otherwise "João" comes back for "joao" and nothing
 * lights up. Folding one character at a time keeps an index into the original text, which is what
 * gets sliced: the pieces are rendered as text nodes, never as html.
 */
function parts(title) {
  const text = String(title || '');
  const needle = fold(term.value.trim());
  if (!needle) return [{ text, hit: false }];

  let folded = '';
  const origin = [];
  for (let i = 0; i < text.length; i += 1) {
    const piece = fold(text[i]);
    for (let j = 0; j < piece.length; j += 1) origin.push(i);
    folded += piece;
  }
  origin.push(text.length);

  const pieces = [];
  let from = 0;
  let at = folded.indexOf(needle);
  while (at !== -1) {
    const start = origin[at];
    const end = origin[at + needle.length];
    if (start > from) pieces.push({ text: text.slice(from, start), hit: false });
    pieces.push({ text: text.slice(start, end), hit: true });
    from = end;
    at = folded.indexOf(needle, at + needle.length);
  }
  if (from < text.length) pieces.push({ text: text.slice(from), hit: false });
  return pieces.length ? pieces : [{ text, hit: false }];
}

/* -------------------------------------------------------------------- loading */

watch(term, () => {
  if (timer) clearTimeout(timer);
  active.value = -1;
  //A new letter supersedes the answer already in flight: it may neither paint nor stop the waiting
  seq += 1;
  const value = term.value.trim();
  if (value.length < MIN_TERM) {
    result.value = null;
    loading.value = false;
    error.value = '';
    return;
  }
  //Typing after an Escape is asking again, so the panel comes back instead of answering off screen
  open.value = true;
  loading.value = true;
  timer = setTimeout(run, DEBOUNCE_MS);
});

/*
 * Nothing in this dashboard aborts a request, so an answer that comes back late is dropped by a
 * sequence guard — and by the team it was asked about, since switching team mid flight would
 * otherwise paint the other team's results.
 */
async function run() {
  const mine = ++seq;
  const tenantId = auth.activeTenantId;
  try {
    const { data } = await searchApi.global(tenantId, term.value.trim());
    if (mine !== seq || tenantId !== auth.activeTenantId) return;
    result.value = data;
    error.value = '';
  } catch (requestError) {
    if (mine !== seq) return;
    //Inline, never a toast: a box that shouts at every keystroke is noise
    error.value = apiMessage(requestError, 'Não foi possível buscar agora.');
  } finally {
    if (mine === seq) loading.value = false;
  }
}

/* -------------------------------------------------------------------- keyboard */

function move(step) {
  const total = flatHits.value.length;
  if (!total) return;
  //From nothing selected the first arrow lands on the end the person is walking towards
  active.value = active.value < 0 ? (step > 0 ? 0 : total - 1) : (active.value + step + total) % total;
  scrollActiveIntoView();
}

async function scrollActiveIntoView() {
  await nextTick();
  document.getElementById(hitId(active.value))?.scrollIntoView({ block: 'nearest' });
}

function choose() {
  const hit = active.value >= 0 ? flatHits.value[active.value] : flatHits.value[0];
  if (hit) go(hit);
}

/* First Escape closes the panel, a second one empties the box and hands the keyboard back. */
function escape() {
  if (open.value) {
    close();
    return;
  }
  term.value = '';
  inputEl.value?.blur();
}

/*
 * Ctrl/Cmd+K and a lone slash reach the box from anywhere, with the same guard the file manager
 * uses: while somebody is typing in a field, the keyboard belongs to that field.
 */
function onHotkey(event) {
  const target = event.target;
  const tag = (target?.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return;
  //Caps Lock and Shift reach the key as "K", and the shortcut on the hint is the same one
  const hotkey = (event.key || '').toLowerCase() === 'k' && (event.ctrlKey || event.metaKey);
  const slash = event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey;
  if (!hotkey && !slash) return;
  event.preventDefault();
  focus();
}

/* ------------------------------------------------------------------- navigation */

function go(hit) {
  close();
  term.value = '';
  //The link may point at something this person cannot open any more
  router.push(hit.link).catch(() => toast.warning('Não foi possível abrir esse item.'));
}

function goList(group) {
  close();
  term.value = '';
  router.push(group.listPath).catch(() => toast.warning('Não foi possível abrir essa tela.'));
}

/* ---------------------------------------------------------------- open and close */

function close() {
  open.value = false;
  compactOpen.value = false;
  active.value = -1;
}

/*
 * The header closes the team switcher and the notifications from a click on the document, so a
 * click in here may not be stopped — they would stay open behind the panel. That same listener
 * also closes this box, which is right for a click outside and wrong for one of ours, so a click
 * born inside marks itself until the whole dispatch is over and the header's close passes by.
 */
function onRootClick() {
  insideClick = true;
  setTimeout(() => {
    insideClick = false;
  }, 0);
}

function closeFromOutside() {
  if (insideClick) return;
  close();
}

async function focus() {
  if (compact.value) compactOpen.value = true;
  open.value = true;
  await nextTick();
  inputEl.value?.focus();
}

defineExpose({ close: closeFromOutside, focus });

/* -------------------------------------------------------------------- lifecycle */

function onMedia(event) {
  compact.value = event.matches;
  if (!compact.value) compactOpen.value = false;
}

onMounted(() => {
  media = window.matchMedia('(max-width: 560px)');
  compact.value = media.matches;
  media.addEventListener('change', onMedia);
  window.addEventListener('keydown', onHotkey);
});

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
  timer = null;
  media?.removeEventListener('change', onMedia);
  window.removeEventListener('keydown', onHotkey);
});

/* Another team is another set of results: nothing of the old one survives the switch. */
watch(
  () => auth.activeTenantId,
  () => {
    term.value = '';
    result.value = null;
    error.value = '';
    close();
  },
);
</script>

<style scoped>
.vc-search {
  position: relative;
}

.vc-search__field {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.vc-search__icon {
  position: absolute;
  left: 11px;
  color: var(--vc-text-faint);
  pointer-events: none;
}

.vc-search__input {
  padding-left: 34px;
  padding-right: 58px;
}

.vc-search__input::-webkit-search-cancel-button {
  cursor: pointer;
}

.vc-search__hotkey {
  position: absolute;
  right: 9px;
  pointer-events: none;
}

.vc-search__compact-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid transparent;
  background: transparent;
  color: var(--vc-text-muted);
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}

.vc-search__compact-btn:hover {
  background: var(--vc-purple-soft);
  border-color: var(--vc-purple-border);
  color: var(--vc-purple-strong);
}

/* ------------------------------------------------------------------- the panel */

/*
 * Wider than the box on purpose. At the width of the field a title is cut so early that the very
 * stretch the person typed can fall outside it — the line comes back from the server because it
 * matched, and the highlight has nothing to paint.
 */
.vc-search__panel {
  position: absolute;
  left: 0;
  right: auto;
  min-width: 100%;
  width: min(540px, calc(100vw - 32px));
  top: calc(100% + 8px);
  background: var(--vc-surface);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius-lg);
  box-shadow: var(--vc-shadow-lg);
  padding: 8px;
  max-height: min(70vh, 520px);
  overflow-y: auto;
  z-index: 50;
}

.vc-search__results.is-waiting {
  opacity: 0.55;
}

.vc-search__state {
  padding: 10px 6px;
  margin: 0;
}

.vc-search__state--error {
  color: var(--vc-danger-text);
  font-size: 0.85rem;
}

/* Same shape as the header dropdown titles; the panel belongs to this component, so it is local */
.vc-search__group-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 8px 4px;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vc-text-faint);
}

.vc-search__hit {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 8px;
  border: none;
  border-radius: var(--vc-radius);
  background: transparent;
  font: inherit;
  text-align: left;
  color: var(--vc-text);
  cursor: pointer;
}

.vc-search__hit.is-active,
.vc-search__hit:hover {
  background: var(--vc-purple-soft);
}

.vc-search__hit-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex: none;
  border-radius: 50%;
  overflow: hidden;
  background: var(--vc-purple-soft);
  color: var(--vc-purple-strong);
}

.vc-search__hit-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.vc-search__hit-text {
  min-width: 0;
  display: block;
}

.vc-search__hit-title,
.vc-search__hit-sub {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vc-search__hit-title {
  font-size: 0.9rem;
}

.vc-search__hit-sub {
  font-size: 0.8rem;
  color: var(--vc-text-muted);
}

.vc-search__hit-meta {
  font-size: 0.76rem;
  color: var(--vc-text-faint);
  white-space: nowrap;
}

.vc-search__hit mark {
  background: var(--vc-warning-bg);
  color: inherit;
  border-radius: 3px;
  padding: 0 1px;
}

.vc-search__more {
  width: 100%;
  padding: 6px 8px 8px;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 0.8rem;
  text-align: left;
  color: var(--vc-purple-strong);
  cursor: pointer;
}

.vc-search__more:hover {
  text-decoration: underline;
}

/* The hints stay on screen while a long list scrolls behind them */
.vc-search__foot {
  position: sticky;
  bottom: -8px;
  display: flex;
  gap: 14px;
  align-items: center;
  justify-content: flex-end;
  margin: 6px -8px -8px;
  padding: 7px 10px;
  border-top: 1px solid var(--vc-border);
  background: var(--vc-surface);
  font-size: 0.72rem;
  pointer-events: none;
}

/* --------------------------------------------------------------------- compact */

.vc-search.is-compact.is-open .vc-search__shell {
  position: fixed;
  left: 0;
  right: 0;
  top: var(--vc-header-h, 66px);
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px 0;
  background: var(--vc-surface);
  z-index: 55;
}

/* On the phone the panel is the overlay itself: it may not carry the desktop width */
.vc-search.is-compact.is-open .vc-search__panel {
  position: static;
  width: auto;
  min-width: 0;
  flex: 1;
  min-height: 0;
  max-height: none;
  border: none;
  box-shadow: none;
  padding: 0;
  border-radius: 0;
}

.vc-search.is-compact .vc-search__close {
  flex: none;
}
</style>
