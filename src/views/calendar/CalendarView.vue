<template>
  <main class="vc-page">
    <div class="vc-stack">
      <div class="vc-row vc-row--between">
        <h1 class="vc-title vc-title--underlined">Calendário</h1>
        <div class="vc-row" style="gap: 6px; align-items: center">
          <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="move(-1)">←</button>
          <strong class="cal__month">{{ monthLabel }}</strong>
          <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="move(1)">→</button>
          <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="today">Hoje</button>
        </div>
      </div>

      <p class="vc-muted" style="margin: 0">
        Reuniões, viagens, eventos, prazos de demanda e janelas de inscrição, num lugar só. Só aparece
        aqui o que você já veria na tela de origem.
      </p>

      <div class="vc-row cal__legend">
        <label v-for="kind in kinds" :key="kind.key" class="cal__key">
          <input type="checkbox" v-model="shown" :value="kind.key" />
          <span class="cal__dot" :style="{ background: kind.color }"></span>
          {{ kind.label }}
        </label>
      </div>

      <p v-if="loading" class="vc-faint">Carregando...</p>

      <template v-else>
        <!-- A grade do mês: semanas de segunda a domingo, que é como a equipe pensa a semana -->
        <div class="cal__grid" role="grid">
          <div v-for="name in weekdays" :key="name" class="cal__weekday">{{ name }}</div>
          <div v-for="cell in cells" :key="cell.key"
               :class="['cal__cell', cell.other ? 'is-other' : '', cell.today ? 'is-today' : '']">
            <span class="cal__day">{{ cell.day }}</span>
            <button v-for="item in cell.items" :key="item.kind + item.id" class="cal__item"
                    :style="{ '--dot': item.color }" :title="itemTitle(item)" @click="go(item)">
              <span class="cal__dot" :style="{ background: item.color }"></span>
              <!-- Concatenado e não dois nós: o Vue come o espaço entre a interpolação e o texto -->
              <span class="cal__text" :class="item.done ? 'is-done' : ''">
                {{ item.allDay ? item.title : formatTime(item.startsAt) + ' ' + item.title }}
              </span>
            </button>
          </div>
        </div>

        <!-- A lista embaixo: num mês cheio, a grade mostra que tem algo e a lista diz o quê -->
        <section class="vc-stack">
          <SectionTitle title="No período" />
          <EmptyState v-if="!visible.length" title="Nada marcado neste mês">
            Reuniões, viagens, eventos e prazos aparecem aqui assim que existirem.
          </EmptyState>
          <ul v-else class="cal__list">
            <li v-for="item in visible" :key="item.kind + item.id" @click="go(item)">
              <span class="cal__dot" :style="{ background: item.color }"></span>
              <span class="cal__when">
                {{ formatDate(item.startsAt) }}
                <span v-if="!item.allDay" class="vc-faint">{{ formatTime(item.startsAt) }}</span>
              </span>
              <span class="cal__grow" :class="item.done ? 'is-done' : ''">{{ item.title }}</span>
              <span class="vc-chip">{{ item.kindLabel }}</span>
              <span v-if="item.divisionName" class="vc-faint">{{ item.divisionName }}</span>
              <span v-if="item.detail" class="vc-faint">{{ item.detail }}</span>
            </li>
          </ul>
        </section>
      </template>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import EmptyState from '@/components/EmptyState.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import { authStore } from '@/store/auth.js';
import { calendar } from '@/services/api.js';
import { formatDate, formatTime, parseServer } from '@/services/time.js';

/*
 * O calendário único.
 *
 * O servidor já corta cada origem pela permissão dela, então esta tela não decide nada sobre acesso:
 * ela desenha o que veio. Os filtros de cima são preferência de leitura e nada mais — desmarcar
 * "Prazos" esconde da tela, não muda o que a pessoa pode ver.
 */
const auth = authStore();
const router = useRouter();
const toast = useToast();

const KINDS = [
  { key: 'MEETING', label: 'Reuniões', color: '#8864AE' },
  { key: 'TRIP', label: 'Viagens', color: '#2f80ed' },
  { key: 'EVENT', label: 'Eventos', color: '#e2a03f' },
  { key: 'TASK', label: 'Prazos', color: '#6b6b76' },
  { key: 'RECRUITMENT', label: 'Processos', color: '#2e9e5b' },
];

const weekdays = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

const items = ref([]);
const loading = ref(true);
const cursor = ref(startOfMonth(new Date()));
const shown = ref(KINDS.map((k) => k.key));

/* Só oferece o filtro do que existe no período: uma legenda de cinco cores num mês com reuniões só. */
const kinds = computed(() => {
  const present = new Set(items.value.map((i) => i.kind));
  return KINDS.filter((k) => present.has(k.key));
});

const visible = computed(() => items.value.filter((i) => shown.value.includes(i.kind)));

const monthLabel = computed(() =>
  cursor.value.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));

const cells = computed(() => {
  const first = startOfMonth(cursor.value);
  const offset = (first.getDay() + 6) % 7; //segunda = 0
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  const now = new Date();
  const out = [];
  for (let i = 0; i < 42; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    out.push({
      key: day.toISOString().slice(0, 10),
      day: day.getDate(),
      other: day.getMonth() !== first.getMonth(),
      today: sameDay(day, now),
      items: visible.value.filter((item) => covers(item, day)),
    });
  }
  //Corta a última semana quando ela é inteira do mês seguinte
  return out.slice(0, out.slice(35).every((c) => c.other) ? 35 : 42);
});

onMounted(load);
watch([cursor, () => auth.activeTenantId], load);

async function load() {
  loading.value = true;
  try {
    const first = startOfMonth(cursor.value);
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    //A janela pega a semana inteira nas duas pontas, senão a grade mostra células vazias que não são
    const from = new Date(first);
    from.setDate(first.getDate() - 7);
    const to = new Date(last);
    to.setDate(last.getDate() + 7);
    const { data } = await calendar.between(auth.activeTenantId, iso(from), iso(to));
    items.value = data;
  } catch (error) {
    items.value = [];
    toast.error('Não deu para carregar o calendário.');
  } finally {
    loading.value = false;
  }
}

function move(months) {
  const next = new Date(cursor.value);
  next.setMonth(next.getMonth() + months);
  cursor.value = startOfMonth(next);
}

function today() {
  cursor.value = startOfMonth(new Date());
}

/* Um item de vários dias aparece em todos eles, que é o que "a viagem é de 12 a 15" quer dizer. */
function covers(item, day) {
  const start = parseServer(item.startsAt);
  const end = parseServer(item.endsAt) || start;
  if (!start) return false;
  const d = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const a = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const b = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return d >= a && d <= b;
}

function go(item) {
  if (item.kind === 'MEETING') {
    router.push({ name: 'meeting', params: { meetingId: item.routeId } });
    return;
  }
  //As outras telas não abrem um item por id, então o calendário leva até a tela e para por ali
  const routes = { TRIP: 'trips', EVENT: 'adminEvents', TASK: 'tasks', RECRUITMENT: 'adminRecruitment' };
  const name = routes[item.kind];
  if (!name) return;
  //A rota pode ser recusada pela guarda de permissão da tela de destino, e aí não há o que fazer:
  //o item aparece no calendário porque a origem deixou, não porque a tela dela esteja aberta.
  router.push({ name }).catch((refused) => toast.info('Você não tem acesso à tela dessa origem.'));
}

function itemTitle(item) {
  const parts = [item.kindLabel, item.title];
  if (item.detail) parts.push(item.detail);
  return parts.join(' · ');
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function iso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
</script>

<style scoped>
/* Só a primeira letra: `capitalize` inteiro escreve "Setembro De 2026".
   `inline-block` é necessário — ::first-letter não pega num elemento inline. */
.cal__month { display: inline-block; min-width: 150px; text-align: center; }
.cal__month::first-letter { text-transform: uppercase; }

.cal__legend { flex-wrap: wrap; gap: 12px; }

.cal__key {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  cursor: pointer;
}

.cal__dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.cal__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 1px;
  background: var(--vc-border);
  border: 1px solid var(--vc-border);
  border-radius: 10px;
  overflow: hidden;
}

.cal__weekday {
  padding: 7px;
  background: var(--vc-surface-muted);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--vc-text-muted);
  text-align: center;
}

.cal__cell {
  min-height: 92px;
  padding: 5px;
  background: var(--vc-surface);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cal__cell.is-other { background: var(--vc-surface-muted); }
.cal__cell.is-other .cal__day { opacity: 0.45; }

.cal__cell.is-today .cal__day {
  background: var(--vc-purple);
  color: var(--vc-on-accent);
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.cal__day { font-size: 11px; color: var(--vc-text-muted); }

.cal__item {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  padding: 2px 4px;
  border: none;
  border-radius: 4px;
  background: none;
  color: inherit;
  font: inherit;
  font-size: 11px;
  text-align: left;
  cursor: pointer;
}

.cal__item:hover { background: var(--vc-surface-muted); }

.cal__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.is-done { text-decoration: line-through; opacity: 0.6; }

.cal__list { list-style: none; margin: 0; padding: 0; }

.cal__list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-top: 1px solid var(--vc-border);
  cursor: pointer;
}

.cal__when { min-width: 128px; }

.cal__grow { flex: 1; min-width: 0; }
</style>
