<template>
  <div class="wall" ref="rootEl">
    <!-- The address is wrong, the wall is off, or the team turned the feature off: all the same 404 -->
    <div v-if="notFound" class="wall__missing">
      <VernumLogo :size="46" :with-wordmark="false" />
      <p class="wall__missing-title">Mural indisponível</p>
      <p class="wall__missing-text">
        Este endereço não abre nenhum mural agora. A tela volta sozinha assim que a equipe ligar o mural.
      </p>
    </div>

    <p v-else-if="!snapshot" class="wall__missing-text wall__loading">Carregando o mural...</p>

    <template v-else>
      <!-- There is no application header on this route, so the wall carries its own thin strip -->
      <header class="wall__bar">
        <span v-if="snapshot.teamNumber" class="wall__number">#{{ snapshot.teamNumber }}</span>
        <span class="wall__team">{{ snapshot.teamName }}</span>
        <span class="wall__bar-spacer"></span>
        <span :class="['wall__link', live ? 'is-live' : 'is-down']">
          <span class="wall__dot"></span>
          {{ live ? 'ao vivo' : 'reconectando' }}
        </span>
        <span class="wall__date">{{ dateText }}</span>
        <span class="wall__clock">{{ clockText }}</span>
      </header>

      <div class="wall__body">
        <div v-if="mainPanels.length" class="wall__main">
          <template v-for="panel in mainPanels" :key="panel">
            <!-- ------------------------------------------------------------- countdown -->
            <section v-if="panel === 'countdown' && countdown" class="panel panel--countdown">
              <p v-if="countdown.label" class="countdown__label">{{ countdown.label }}</p>
              <p v-if="countdownFinished" class="countdown__over">TEMPO ESGOTADO</p>
              <p v-else :class="['countdown__clock', countdownUrgent ? 'is-urgent' : '']">
                {{ countdownText }}
              </p>
              <div v-if="countdownPercent !== null" class="countdown__bar">
                <span :style="{ width: countdownPercent + '%' }"></span>
              </div>
              <p class="countdown__target">termina {{ targetText }}</p>
            </section>

            <!-- ---------------------------------------------------------------- kanban -->
            <section v-else-if="panel === 'kanban'" class="panel panel--kanban">
              <div class="kanban" :style="{ gridTemplateColumns: `repeat(${columns.length || 1}, minmax(0, 1fr))` }">
                <div v-for="(column, index) in columns" :key="column.status" class="kcol">
                  <header class="kcol__head">
                    <span>{{ column.statusLabel }}</span>
                    <b>{{ column.count }}</b>
                  </header>
                  <div class="kcol__cards">
                    <article v-for="card in visibleCards(column, index)" :key="card.taskId"
                             :class="['kcard', 'kcard--' + (card.priority || 'low').toLowerCase()]">
                      <strong class="kcard__title">{{ card.title }}</strong>
                      <p class="kcard__meta">
                        <span v-if="card.divisionName">{{ card.divisionName }}</span>
                        <span v-if="card.assignees && card.assignees.length">{{ card.assignees.join(', ') }}</span>
                      </p>
                      <p v-if="card.dueLabel" :class="['kcard__due', card.overdue ? 'is-late' : '']">
                        {{ card.dueLabel }}
                      </p>
                    </article>
                  </div>
                  <p class="kcol__more">{{ hiddenCards(column, index) ? '+' + hiddenCards(column, index) : '' }}</p>
                </div>
              </div>
            </section>

            <!-- ----------------------------------------------------------------- stats -->
            <section v-else-if="panel === 'stats' && stats" class="panel panel--stats">
              <div class="stat">
                <span class="stat__value">{{ stats.tasksDone }}<i>/{{ stats.tasksTotal }}</i></span>
                <span class="stat__label">Demandas feitas</span>
              </div>
              <div class="stat">
                <span class="stat__value stat__value--accent">{{ stats.donePercent }}<i>%</i></span>
                <span class="stat__label">Concluído</span>
              </div>
              <div class="stat">
                <span :class="['stat__value', stats.tasksLate ? 'stat__value--late' : '']">{{ stats.tasksLate }}</span>
                <span class="stat__label">Atrasadas</span>
              </div>
              <div class="stat">
                <span class="stat__value">{{ stats.peopleInRoom }}</span>
                <span class="stat__label">Na sala</span>
              </div>
              <div class="stat">
                <span :class="['stat__value', stats.criticalRisks ? 'stat__value--late' : '']">
                  {{ stats.criticalRisks }}
                </span>
                <span class="stat__label">Riscos críticos</span>
              </div>
            </section>
          </template>
        </div>

        <aside v-if="asidePanels.length" :class="['wall__aside', mainPanels.length ? '' : 'is-alone']">
          <template v-for="panel in asidePanels" :key="panel">
            <!-- ---------------------------------------------------------- announcements -->
            <section v-if="panel === 'announcements'" class="panel panel--list">
              <h2 class="panel__title"><AppIcon name="megaphone" :size="18" />Avisos</h2>
              <div class="panel__scroll list-announcements">
                <article v-for="item in visibleAnnouncements" :key="item.announcementId" class="notice">
                  <strong>{{ item.title }}</strong>
                  <p class="notice__text">{{ excerpt(item.content) }}</p>
                  <p class="notice__foot">{{ item.senderName }} · {{ agoText(item.createdAt) }}</p>
                </article>
                <p v-if="!announcements.length" class="panel__empty">Nenhum aviso agora.</p>
              </div>
              <p class="panel__more">{{ hiddenAnnouncements ? '+' + hiddenAnnouncements : '' }}</p>
            </section>

            <!-- --------------------------------------------------------------- updates -->
            <section v-else-if="panel === 'updates'" class="panel panel--list">
              <h2 class="panel__title"><AppIcon name="history" :size="18" />Atualizações</h2>
              <div class="panel__scroll list-updates">
                <div v-for="(item, index) in visibleUpdates" :key="index" class="update">
                  <AppIcon class="update__icon" :name="updateIcon(item.kind)" :size="17" />
                  <div class="update__body">
                    <span class="update__text">{{ item.text }}</span>
                    <span v-if="item.detail" class="update__detail">{{ item.detail }}</span>
                  </div>
                  <span class="update__when">{{ agoText(item.at) }}</span>
                </div>
                <p v-if="!updates.length" class="panel__empty">Nada de novo por enquanto.</p>
              </div>
              <p class="panel__more">{{ hiddenUpdates ? '+' + hiddenUpdates : '' }}</p>
            </section>

            <!-- ------------------------------------------------------------------ room -->
            <section v-else-if="panel === 'room'" class="panel panel--list">
              <h2 class="panel__title"><AppIcon name="clock" :size="18" />Na sala</h2>
              <div class="panel__scroll list-room">
                <div v-for="person in visibleInRoom" :key="person.userId" class="person">
                  <span class="person__name">{{ person.name }}</span>
                  <span class="person__since">desde {{ hourText(person.since) }}</span>
                </div>
                <p v-if="!inRoom.length" class="panel__empty">Ninguém na sala agora.</p>
              </div>
              <p class="panel__more">{{ hiddenInRoom ? '+' + hiddenInRoom : '' }}</p>
            </section>
          </template>
        </aside>
      </div>

      <!-- ------------------------------------------------------------------ live event -->
      <div v-if="liveEvent" class="event" :style="liveEvent.color ? { '--event-color': liveEvent.color } : null">
        <div class="event__wash"></div>
        <div class="event__inner">
          <span v-if="liveEvent.kindLabel" class="event__kind">{{ liveEvent.kindLabel }}</span>
          <p class="event__title">{{ liveEvent.title }}</p>
          <p v-if="liveEvent.message" class="event__message">{{ liveEvent.message }}</p>
        </div>
        <div class="event__bar"><span :style="{ width: eventPercent + '%' }"></span></div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppIcon from '@/components/AppIcon.vue';
import VernumLogo from '@/components/VernumLogo.vue';
import { wall } from '@/services/api.js';
import { applyTheme } from '@/services/theme.js';

/*
 * The wall as a television in the room reads it: no login, no header, no footer, and nobody
 * touching it for the thirty hours of a marathon.
 *
 * Three decisions come out of that:
 *
 *   - Nothing here may scroll. Every list is cut to what fits and says "+N", and every size is a
 *     clamp() on vw/vmin, so the same layout fills a 1080p television and a 4K one without the
 *     text turning into ants on the second.
 *   - The stream is expected to drop. A dead EventSource is reopened with a growing wait and, while
 *     it is down, the snapshot is polled, so a proxy that closed an idle connection at three in the
 *     morning costs a few seconds of staleness and not a black screen.
 *   - Time is counted here, not asked for. The server sends the target and its own clock; the skew
 *     between the two is measured once per snapshot and the seconds tick locally, so a television
 *     whose clock is ten minutes off still shows the right countdown.
 */
const route = useRoute();

/* EventSource does not go through axios, so the base URL is built by hand — same value as http.js */
const API_BASE = process.env.VUE_APP_API_URL || 'https://vernumserver-prod.onrender.com';

/* Wide blocks stack down the middle, narrow ones down the side; `panels` decides which and in
   which order, and the filters below keep that order inside each column. */
const WIDE_PANELS = ['countdown', 'kanban', 'stats'];
const NARROW_PANELS = ['announcements', 'updates', 'room'];
const DEFAULT_PANELS = ['countdown', 'kanban', 'announcements', 'updates', 'room', 'stats'];

/* Text reflows on its own — "há 9 min" becomes "há 10 min" and a line wraps — so the fit is retaken */
const REMEASURE = 60000;

const RECONNECT_START = 2000;
const RECONNECT_MAX = 30000;
const POLL_WHILE_DOWN = 15000;

const UPDATE_ICONS = {
  TASK_DONE: 'check',
  TASK_MOVED: 'kanban',
  TASK_NEW: 'plus',
  ANNOUNCEMENT: 'megaphone',
  ARRIVED: 'userCheck',
  LEFT: 'back',
  RISK: 'alert',
};

const snapshot = ref(null);
const notFound = ref(false);
const live = ref(false);
const rootEl = ref(null);

/*
 * How many items of each list are on the screen, measured instead of guessed: a card with a long
 * title is taller than one with a short title, so no fixed number is right at every resolution and
 * for every board. `measuring` renders every item for one frame — clipped, so nothing shows — and
 * the pass after it counts the ones that ended up inside their panel. It converges in that single
 * pass because dropping the items that did not fit never moves the ones that did.
 */
const measuring = ref(true);
const caps = reactive({ cards: [], announcements: null, updates: null, room: null });

/* The device clock, ticking, plus how far the server is from it */
const nowMs = ref(Date.now());
const clockSkew = ref(0);
const serverNow = computed(() => nowMs.value + clockSkew.value);

/* Widest remaining time this screen has seen, the only start the progress bar can be measured from */
const countdownSeen = ref(0);
let lastTarget = null;

let source = null;
let tick = null;
let remeasure = null;
let reconnectTimer = null;
let pollTimer = null;
let reconnectDelay = RECONNECT_START;
const originalTitle = document.title;

onMounted(() => {
  /*
   * The wall is always dark, whatever the browser or the person behind it prefers: this is a screen
   * on a wall in a room, read from across it, and a white rectangle at two in the morning is a lamp.
   * The accent is repainted with the team colour as soon as the first snapshot names it.
   */
  applyTheme('dark');
  tick = setInterval(() => (nowMs.value = Date.now()), 1000);
  remeasure = setInterval(measure, REMEASURE);
  window.addEventListener('resize', measure);
  //The first snapshot can land before Poppins does, and the fallback font is not the same height
  if (document.fonts?.ready) {
    document.fonts.ready.then(measure);
  }
  start();
});

onUnmounted(() => {
  stopFeed();
  clearInterval(tick);
  clearInterval(remeasure);
  tick = null;
  remeasure = null;
  window.removeEventListener('resize', measure);
  document.title = originalTitle;
});

/* Another wall on the same screen: drop the feed of the old token and open the one of the new */
watch(() => route.params.token, () => {
  stopFeed();
  snapshot.value = null;
  //Whatever the old address answered is not news about the new one
  notFound.value = false;
  live.value = false;
  start();
});

/* --------------------------------------------------------------------- the feed */

function start() {
  reconnectDelay = RECONNECT_START;
  loadSnapshot();
  openStream();
}

function stopFeed() {
  closeStream();
  clearTimeout(reconnectTimer);
  clearInterval(pollTimer);
  reconnectTimer = null;
  pollTimer = null;
}

async function loadSnapshot() {
  const token = route.params.token;
  if (!token) return;
  try {
    const { data } = await wall.snapshot(token);
    apply(data);
  } catch (error) {
    /*
     * A 404 is the wall itself: an address that leads nowhere, a wall switched off, a team that
     * turned the feature off — the server answers the same one for all of them on purpose, and the
     * screen clears. Anything else is the road between here and the server, and the room keeps
     * reading the last board it was given while the connection comes back.
     */
    if (error?.response?.status === 404) {
      snapshot.value = null;
      notFound.value = true;
    }
  }
}

function openStream() {
  const token = route.params.token;
  if (!token || typeof EventSource === 'undefined') return;
  closeStream();
  source = new EventSource(`${API_BASE}/public/wall/${encodeURIComponent(token)}/stream`);

  source.onopen = () => {
    live.value = true;
    reconnectDelay = RECONNECT_START;
    clearInterval(pollTimer);
    pollTimer = null;
  };
  source.addEventListener('snapshot', (message) => readMessage(message));
  //Defensive: a snapshot arriving unnamed still repaints the wall, a ping never does
  source.onmessage = (message) => readMessage(message);
  source.onerror = () => dropped();
}

function readMessage(message) {
  try {
    const data = JSON.parse(message.data);
    /*
     * `serverTime` is the tell that this is a real board and not a keep alive: every snapshot
     * carries it, and the screen needs it anyway to set its clock against the server's. Guarding on
     * a field the payload does not actually have would drop every frame in silence — the wall would
     * sit there showing the board it was given when it was switched on, looking perfectly alive
     * because the countdown ticks on its own.
     */
    if (data && data.serverTime) {
      apply(data);
    }
  } catch (error) {
    //A keep alive, or half a frame: the next snapshot fixes the screen
  }
}

/** The stream died. Reopen it with a growing wait, and poll the snapshot until it is back. */
function dropped() {
  live.value = false;
  closeStream();
  if (!pollTimer) {
    pollTimer = setInterval(loadSnapshot, POLL_WHILE_DOWN);
  }
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(openStream, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX);
}

function closeStream() {
  if (source) {
    source.close();
    source = null;
  }
}

function apply(data) {
  const target = data.countdown ? data.countdown.target : null;
  //An administrator moving the deadline starts the progress bar over
  if (target !== lastTarget) {
    lastTarget = target;
    countdownSeen.value = 0;
  }
  snapshot.value = data;
  notFound.value = false;
  if (data.serverTime) {
    clockSkew.value = parseLocal(data.serverTime).getTime() - Date.now();
  }
  applyTheme('dark', data.teamColor || null);
  document.title = `${data.teamName} · Mural`;
  measure();
}

/* ------------------------------------------------------------------- the panels */

const panels = computed(() => {
  const list = snapshot.value?.panels;
  return list && list.length ? list : DEFAULT_PANELS;
});
const mainPanels = computed(() => panels.value.filter((panel) => WIDE_PANELS.includes(panel)));
const asidePanels = computed(() => panels.value.filter((panel) => NARROW_PANELS.includes(panel)));

const columns = computed(() => snapshot.value?.columns || []);
const announcements = computed(() => snapshot.value?.announcements || []);
const updates = computed(() => snapshot.value?.updates || []);
const inRoom = computed(() => snapshot.value?.inRoom || []);
const stats = computed(() => snapshot.value?.stats || null);

const visibleAnnouncements = computed(() => cut(announcements.value, caps.announcements));
const hiddenAnnouncements = computed(() => left(announcements.value, caps.announcements));
const visibleUpdates = computed(() => cut(updates.value, caps.updates));
const hiddenUpdates = computed(() => left(updates.value, caps.updates));
const visibleInRoom = computed(() => cut(inRoom.value, caps.room));
const hiddenInRoom = computed(() => left(inRoom.value, caps.room));

function visibleCards(column, index) {
  return cut(column.cards || [], caps.cards[index]);
}

/*
 * The server sends only the first cards of a column and the size of the whole column next to them,
 * so what is missing is measured against `count` and not against the handful that arrived: a column
 * of twenty three with eight sent and six fitting says "+17", not "+2".
 */
function hiddenCards(column, index) {
  const cards = column.cards || [];
  const total = typeof column.count === 'number' ? column.count : cards.length;
  return Math.max(0, total - cut(cards, caps.cards[index]).length);
}

/** The head of a list that fits, or all of it while the wall is measuring. */
function cut(items, cap) {
  return measuring.value || cap == null ? items : items.slice(0, cap);
}

function left(items, cap) {
  return measuring.value || cap == null ? 0 : Math.max(0, items.length - cap);
}

/** How many children of `container` end above its bottom edge. */
function fitCount(container, selector) {
  if (!container) return null;
  const items = Array.from(container.children).filter((item) => item.matches(selector));
  if (!items.length) return null;
  const bottom = container.getBoundingClientRect().bottom;
  let count = 0;
  //A pixel of slack: a fractional layout can put the last line half a pixel over the edge
  while (count < items.length && items[count].getBoundingClientRect().bottom <= bottom + 1) {
    count++;
  }
  return Math.max(1, count);
}

async function measure() {
  measuring.value = true;
  await nextTick();
  const root = rootEl.value;
  if (root) {
    caps.cards = Array.from(root.querySelectorAll('.kcol__cards')).map((el) => fitCount(el, '.kcard'));
    caps.announcements = fitCount(root.querySelector('.list-announcements'), '.notice');
    caps.updates = fitCount(root.querySelector('.list-updates'), '.update');
    caps.room = fitCount(root.querySelector('.list-room'), '.person');
  }
  measuring.value = false;
}

function updateIcon(kind) {
  return UPDATE_ICONS[kind] || 'info';
}

function excerpt(text) {
  const value = String(text || '').trim();
  return value.length > 180 ? value.slice(0, 180) + '...' : value;
}

/* ----------------------------------------------------------------- the countdown */

const countdown = computed(() => snapshot.value?.countdown || null);

const countdownLeft = computed(() => {
  const target = countdown.value?.target;
  if (!target) return null;
  return Math.max(0, Math.round((parseLocal(target).getTime() - serverNow.value) / 1000));
});

/* The local count is what ticks between snapshots, and the server's word settles the edge of it */
const countdownFinished = computed(() => {
  if (!countdown.value) return false;
  return countdown.value.finished === true || countdownLeft.value === 0;
});

/* Under an hour the clock turns red and breathes: from across the room that is the whole message */
const countdownUrgent = computed(() => countdownLeft.value !== null && countdownLeft.value < 3600);

const countdownText = computed(() => (countdownLeft.value === null ? '' : formatClock(countdownLeft.value)));

watch(countdownLeft, (remaining) => {
  if (remaining !== null && remaining > countdownSeen.value) {
    countdownSeen.value = remaining;
  }
});

/*
 * The server sends no start, only the end, so the bar measures against the widest remaining time
 * this screen has seen — the whole marathon for a television switched on before it began. It stays
 * hidden until some of it has actually passed, instead of sitting at zero.
 */
const countdownPercent = computed(() => {
  const remaining = countdownLeft.value;
  if (remaining === null || countdownSeen.value <= 0) return null;
  const elapsed = countdownSeen.value - remaining;
  //Under a minute of it is the screen having just been switched on, not progress worth a bar
  if (elapsed < 60) return null;
  return Math.min(100, (elapsed / countdownSeen.value) * 100);
});

const targetText = computed(() => {
  const target = countdown.value?.target;
  if (!target) return '';
  return parseLocal(target).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
});

/* ---------------------------------------------------------------- the live event */

/*
 * The event is whatever the last snapshot carried, minus the seconds that passed since: it leaves
 * the screen on its own when the time runs out, and at once when a snapshot arrives without it.
 */
const liveEvent = computed(() => {
  const event = snapshot.value?.liveEvent;
  if (!event) return null;
  const ends = event.expiresAt ? parseLocal(event.expiresAt).getTime() : null;
  if (ends !== null && serverNow.value >= ends) return null;
  return event;
});

const eventPercent = computed(() => {
  const event = liveEvent.value;
  if (!event?.expiresAt) return 100;
  const ends = parseLocal(event.expiresAt).getTime();
  const started = event.createdAt ? parseLocal(event.createdAt).getTime() : null;
  const total = started === null ? 0 : ends - started;
  if (total <= 0) return 100;
  return Math.max(0, Math.min(100, ((ends - serverNow.value) / total) * 100));
});

/* --------------------------------------------------------------------- the clock */

const clockText = computed(() =>
  new Date(serverNow.value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
);
const dateText = computed(() =>
  new Date(serverNow.value).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }),
);

/* LocalDateTime comes with no zone and six fractional digits: cut them and read it as local time. */
function parseLocal(value) {
  return new Date(String(value).slice(0, 19));
}

function pad(value) {
  return String(value).padStart(2, '0');
}

/** "HH:MM:SS", with the hours free to go past 24 — a marathon is longer than a day. */
function formatClock(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
}

function hourText(value) {
  if (!value) return '';
  return parseLocal(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function agoText(value) {
  if (!value) return '';
  const seconds = Math.max(0, Math.round((serverNow.value - parseLocal(value).getTime()) / 1000));
  if (seconds < 60) return 'agora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  return `há ${Math.floor(hours / 24)} d`;
}
</script>

<style scoped>
/*
 * Every length here is either a clamp() on vw/vmin or a fraction of the grid, so the wall is the
 * same picture at 1920x1080 and at 3840x2160. Colours are the tokens of the design system, which
 * this screen pins to the dark palette on mount.
 */
.wall {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background:
    radial-gradient(120% 80% at 50% -20%, var(--vc-purple-soft), transparent 60%),
    var(--vc-bg);
  color: var(--vc-text);
  font-variant-numeric: tabular-nums;
}

/* ------------------------------------------------------------------ the strip */

.wall__bar {
  flex: none;
  display: flex;
  align-items: center;
  gap: clamp(8px, 0.8vw, 20px);
  padding: clamp(8px, 0.9vh, 22px) clamp(14px, 1.4vw, 36px);
  border-bottom: 1px solid var(--vc-border);
  font-size: clamp(13px, 1.15vw, 30px);
}

.wall__bar-spacer {
  flex: 1;
}

.wall__number {
  padding: 0.1em 0.5em;
  border-radius: 999px;
  background: var(--vc-purple);
  color: var(--vc-on-accent);
  font-weight: 600;
}

.wall__team {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.wall__date {
  color: var(--vc-text-faint);
}

/* pt-BR writes the weekday and the month in lower case; only the first letter is ours to raise */
.wall__date::first-letter {
  text-transform: uppercase;
}

.wall__clock {
  font-weight: 600;
  font-size: clamp(15px, 1.5vw, 38px);
}

.wall__link {
  display: inline-flex;
  align-items: center;
  gap: 0.45em;
  font-size: 0.8em;
  color: var(--vc-text-faint);
}

.wall__dot {
  width: 0.55em;
  height: 0.55em;
  border-radius: 50%;
  background: currentColor;
}

.wall__link.is-live {
  color: var(--vc-success-text);
}

.wall__link.is-down {
  color: var(--vc-warning-strong);
  animation: wall-breathe 1.6s ease-in-out infinite;
}

/* -------------------------------------------------------------- the two lanes */

.wall__body {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: clamp(10px, 1vw, 26px);
  padding: clamp(10px, 1vw, 26px);
}

.wall__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(10px, 1vw, 26px);
}

.wall__aside {
  flex: none;
  width: clamp(230px, 23vw, 620px);
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 1vw, 26px);
}

/* Only the narrow blocks were picked: they take the room the board would have had, instead of
   leaving two thirds of the television empty. */
.wall__aside.is-alone {
  flex: 1;
  width: auto;
}

.panel {
  min-height: 0;
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius-lg);
  background: var(--vc-surface);
  padding: clamp(10px, 1vw, 28px);
}

.panel--countdown {
  flex: none;
  text-align: center;
  border-color: var(--vc-purple-border);
  background: var(--vc-surface);
}

.panel--kanban {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.panel--stats {
  flex: none;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: clamp(8px, 0.8vw, 22px);
}

.panel--list {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4em;
  overflow: hidden;
}

.panel__title {
  flex: none;
  display: flex;
  align-items: center;
  gap: 0.45em;
  margin: 0;
  color: var(--vc-purple-strong);
  font-size: clamp(12px, 1vw, 26px);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.panel__scroll {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: clamp(5px, 0.5vh, 14px);
}

/* Always in the layout, empty or not: a line that appeared when a list overflowed would change the
   height being measured, and the count of what fits would never settle. */
.panel__more,
.kcol__more {
  flex: none;
  margin: 0;
  min-height: 1.3em;
  color: var(--vc-text-faint);
  font-size: clamp(11px, 0.95vw, 24px);
  font-weight: 600;
}

.panel__empty {
  margin: 0;
  color: var(--vc-text-faint);
  font-size: clamp(11px, 0.95vw, 24px);
}

/* ------------------------------------------------------------------ countdown */

.countdown__label {
  margin: 0;
  color: var(--vc-text-muted);
  font-size: clamp(13px, 1.3vw, 49px);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.countdown__clock,
.countdown__over {
  margin: 0.04em 0 0;
  font-size: clamp(56px, 10vw, 384px);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--vc-text);
}

.countdown__clock.is-urgent {
  color: var(--vc-danger-strong);
  animation: wall-breathe 1.1s ease-in-out infinite;
}

.countdown__over {
  color: var(--vc-danger-strong);
  font-size: clamp(40px, 7vw, 268px);
  letter-spacing: 0.02em;
}

.countdown__bar {
  height: clamp(5px, 0.5vh, 14px);
  margin: clamp(8px, 0.8vh, 20px) auto 0;
  width: min(100%, 78%);
  border-radius: 999px;
  background: var(--vc-surface-muted);
  overflow: hidden;
}

.countdown__bar > span {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--vc-purple);
}

.countdown__target {
  margin: clamp(5px, 0.5vh, 14px) 0 0;
  color: var(--vc-text-faint);
  font-size: clamp(11px, 1vw, 26px);
}

/* --------------------------------------------------------------------- kanban */

.kanban {
  height: 100%;
  display: grid;
  gap: clamp(7px, 0.7vw, 20px);
}

.kcol {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(5px, 0.5vh, 14px);
}

.kcol__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4em;
  padding-bottom: 0.3em;
  border-bottom: 2px solid var(--vc-purple-border);
  font-size: clamp(11px, 0.95vw, 24px);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--vc-text-muted);
}

.kcol__head b {
  color: var(--vc-purple-strong);
  font-size: 1.15em;
}

.kcol__cards {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: clamp(5px, 0.5vh, 14px);
}

.kcard {
  flex: none;
  padding: clamp(6px, 0.55vw, 16px) clamp(7px, 0.65vw, 18px);
  border-radius: var(--vc-radius);
  border-left: 4px solid var(--vc-border-strong);
  background: var(--vc-surface-muted);
}

.kcard--high { border-left-color: var(--vc-danger-strong); }
.kcard--medium { border-left-color: var(--vc-warning-strong); }
.kcard--low { border-left-color: var(--vc-success-text); }

.kcard__title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: clamp(12px, 1.05vw, 27px);
  font-weight: 600;
  line-height: 1.2;
}

/* A block and not a flex row, so the ellipsis actually cuts a long list of names */
.kcard__meta {
  margin: 0.2em 0 0;
  color: var(--vc-text-muted);
  font-size: clamp(10px, 0.85vw, 22px);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kcard__meta span + span::before {
  content: ' · ';
  color: var(--vc-text-faint);
}

.kcard__due {
  margin: 0.15em 0 0;
  color: var(--vc-text-faint);
  font-size: clamp(10px, 0.82vw, 21px);
}

.kcard__due.is-late {
  color: var(--vc-danger-strong);
  font-weight: 600;
}

/* ---------------------------------------------------------------------- stats */

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.1em;
  min-width: 0;
}

.stat__value {
  font-size: clamp(26px, 3.2vw, 122px);
  font-weight: 700;
  line-height: 1;
}

.stat__value i {
  font-style: normal;
  font-size: 0.5em;
  color: var(--vc-text-faint);
}

.stat__value--accent { color: var(--vc-purple); }
.stat__value--late { color: var(--vc-danger-strong); }

.stat__label {
  color: var(--vc-text-muted);
  font-size: clamp(10px, 0.85vw, 22px);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-align: center;
}

/* ------------------------------------------------------- announcements, updates, room */

.notice strong {
  display: block;
  font-size: clamp(12px, 1.05vw, 27px);
  line-height: 1.2;
}

.notice__text {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0.15em 0 0;
  color: var(--vc-text-muted);
  font-size: clamp(11px, 0.9vw, 23px);
  line-height: 1.3;
}

.notice__foot {
  margin: 0.15em 0 0;
  color: var(--vc-text-faint);
  font-size: clamp(10px, 0.8vw, 21px);
}

.update {
  display: flex;
  align-items: flex-start;
  gap: 0.5em;
  font-size: clamp(11px, 0.92vw, 24px);
}

.update__icon {
  flex: none;
  margin-top: 0.15em;
  color: var(--vc-purple);
}

.update__body {
  flex: 1;
  min-width: 0;
  display: grid;
}

.update__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.update__detail {
  color: var(--vc-text-faint);
  font-size: 0.85em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.update__when {
  flex: none;
  color: var(--vc-text-faint);
  font-size: 0.85em;
}

.person {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.6em;
  font-size: clamp(11px, 0.95vw, 25px);
}

.person__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.person__since {
  flex: none;
  color: var(--vc-text-faint);
  font-size: 0.82em;
}

/* ----------------------------------------------------------------- live event */

.event {
  --event-color: var(--vc-purple);
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: clamp(16px, 3vh, 64px);
  background: var(--vc-bg);
  animation: wall-enter 0.25s ease-out;
}

.event__wash {
  position: absolute;
  inset: 0;
  background: var(--event-color);
  opacity: 0.16;
}

.event__inner {
  position: relative;
  max-width: 88vw;
  text-align: center;
}

.event__kind {
  display: inline-block;
  padding: 0.25em 1em;
  border-radius: 999px;
  border: 2px solid var(--event-color);
  color: var(--event-color);
  font-size: clamp(13px, 1.4vw, 53px);
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

/* 120 characters at a tenth of the screen do not fit on it: three lines, and the rest is an ellipsis */
.event__title {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0.25em 0 0;
  color: var(--event-color);
  font-size: clamp(44px, 8vw, 307px);
  font-weight: 700;
  line-height: 1.02;
  letter-spacing: -0.02em;
}

.event__message {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0.35em 0 0;
  color: var(--vc-text);
  font-size: clamp(18px, 2.6vw, 99px);
  line-height: 1.2;
}

.event__bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: clamp(6px, 0.7vh, 18px);
  background: var(--vc-surface-muted);
}

.event__bar > span {
  display: block;
  height: 100%;
  background: var(--event-color);
  transition: width 1s linear;
}

/* ------------------------------------------------------------- nothing to show */

.wall__missing {
  margin: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(8px, 1vh, 22px);
  text-align: center;
  padding: 5vh 6vw;
}

.wall__missing-title {
  margin: 0;
  font-size: clamp(22px, 2.6vw, 66px);
  font-weight: 600;
}

.wall__missing-text {
  margin: 0;
  max-width: 26em;
  color: var(--vc-text-muted);
  font-size: clamp(13px, 1.2vw, 30px);
}

.wall__loading {
  margin: auto;
  text-align: center;
}

@keyframes wall-breathe {
  50% { opacity: 0.45; }
}

@keyframes wall-enter {
  from { opacity: 0; transform: scale(1.03); }
}
</style>
