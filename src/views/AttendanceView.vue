<template>
  <main class="vc-page">
    <div class="vc-stack">
      <div class="vc-row vc-row--between">
        <div>
          <h1 class="vc-title vc-title--underlined">Presença</h1>
          <p class="vc-faint" style="margin: 6px 0 0">{{ auth.activeTenantName }}</p>
        </div>
        <button class="vc-btn vc-btn--ghost" type="button" :disabled="loading" @click="load">
          <AppIcon name="refresh" :size="15" />
          Atualizar
        </button>
      </div>

      <!-- Says out loud how far the register reaches, so a short table is never a mystery. -->
      <AlertBanner :variant="scopeVariant" :title="scopeTitle" :aside="lastUpdatedLabel">
        {{ scopeHint }}
      </AlertBanner>

      <!-- Everybody reads their own presence, whatever the permissions say. -->
      <PanelCard title="Minha presença" icon="clock">
        <div class="vc-row vc-row--between" style="align-items: flex-start">
          <div>
            <p style="margin: 0; font-weight: 600">
              {{ me.inRoom ? 'Você está na sala' : 'Você não está na sala' }}
            </p>
            <p class="vc-faint" style="margin: 4px 0 0">
              <template v-if="me.inRoom">
                Desde {{ formatDateTime(me.since) }} · {{ formatDuration(me.secondsInRoom) }}
              </template>
              <template v-else>
                A entrada e a saída são marcadas no quiosque de presença da sala.
              </template>
            </p>
          </div>
          <span :class="['vc-chip', me.inRoom ? 'vc-chip--success' : '']">
            {{ me.inRoom ? 'Na sala' : 'Fora' }}
          </span>
        </div>

        <!--
          One room, one number. The per-team totals the server still answers are the same figure
          repeated, so the teams are the label of the total and not counters of their own.
        -->
        <div class="vc-divider" style="margin: 14px 0"></div>
        <div class="vc-row vc-row--between" style="align-items: flex-end">
          <div>
            <p class="vc-label" style="margin: 0">Tempo total na sala</p>
            <p style="margin: 2px 0 0; font-size: 1.6rem; font-weight: 600">
              {{ formatDuration(me.totalSeconds) }}
            </p>
          </div>
          <div v-if="me.tenants && me.tenants.length" style="text-align: right">
            <p class="vc-label" style="margin: 0 0 6px">Conta para</p>
            <span v-for="line in me.tenants" :key="line.tenantId" class="vc-chip"
                  style="margin-left: 6px">
              <span class="vc-dot" :style="{ background: line.tenantColor || 'var(--vc-purple)' }"></span>
              {{ line.tenantName }}
            </span>
          </div>
        </div>
      </PanelCard>

      <TabBar v-model="tab" :tabs="tabs" />

      <!-- ------------------------------------------------------------- in the room -->
      <template v-if="tab === 'sala'">
        <SectionTitle lead="Quem está" title="na Sala Agora">
          <template #actions>
            <span v-if="scope.board === 'TEAM'" class="vc-chip">A sala é a mesma para todas as equipes</span>
          </template>
        </SectionTitle>
        <div class="vc-table-wrap">
          <table class="vc-table">
            <thead>
              <tr>
                <th>Pessoa</th><th>Equipes</th><th>Entrou</th><th>Há quanto tempo</th>
                <th v-if="scope.canManage"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="person in now" :key="person.userId">
                <td><PersonLink :user-id="person.userId" :name="person.userName" /></td>
                <td>
                  <!-- The label is what tells apart who is who when the room has more than one team -->
                  <span v-for="team in person.teams" :key="team.tenantId"
                        :class="['vc-chip', team.tenantId === auth.activeTenantId ? 'vc-chip--purple' : '']"
                        style="margin-right: 4px">
                    <span class="vc-dot" :style="{ background: team.tenantColor || 'var(--vc-purple)' }"></span>
                    {{ team.tenantName }}
                  </span>
                </td>
                <td>{{ formatDateTime(person.since) }}</td>
                <td>{{ formatDuration(person.seconds) }}</td>
                <td v-if="scope.canManage" style="text-align: right">
                  <!-- Only for a stay of this team: reading the room does not mean writing to another register -->
                  <button v-if="person.closableAttendanceId" class="vc-btn vc-btn--outline vc-btn--small"
                          type="button" @click="openCloseRoom(person)">
                    Fechar estada
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <EmptyState v-if="!now.length" title="Ninguém na sala">
            Ninguém marcou entrada no quiosque até agora.
          </EmptyState>
        </div>
      </template>

      <!-- ---------------------------------------------------------------- ranking -->
      <template v-if="tab === 'ranking'">
        <SectionTitle lead="Ranking por" title="Tempo na Sala">
          <template #actions>
            <!-- Off by default: a mentor's afternoons in the room are not a student's frequency -->
            <label class="vc-checkbox" style="align-items: center; font-size: 0.85rem">
              <input type="checkbox" v-model="includeStaff" style="margin-top: 0" />
              Incluir técnicos e administradores
            </label>
            <span class="vc-chip">{{ periodLabel }}</span>
          </template>
        </SectionTitle>
        <div class="vc-table-wrap">
          <table class="vc-table">
            <thead>
              <tr><th style="width: 60px">#</th><th>Pessoa</th><th>Tempo total</th><th>Agora</th></tr>
            </thead>
            <tbody>
              <tr v-for="line in ranking" :key="line.userId">
                <td>{{ line.position }}</td>
                <td>
                  <PersonLink :user-id="line.userId" :name="line.userName" />
                  <!-- Only ever present when the box above is ticked: the server hides the staff otherwise -->
                  <span v-if="line.staff" class="vc-chip" style="margin-left: 6px">conduz a equipe</span>
                </td>
                <td>{{ formatDuration(line.totalSeconds) }}</td>
                <td>
                  <span :class="['vc-badge', line.inRoom ? 'vc-badge--on' : 'vc-badge--neutral']">
                    {{ line.inRoom ? 'Na sala' : '—' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <EmptyState v-if="!ranking.length" title="Nada no período">
            Ninguém que você acompanha registrou presença entre {{ formatDate(period.from) }} e
            {{ formatDate(period.to) }}.
            <template v-if="!includeStaff"> Técnicos e administradores ficam de fora do ranking.</template>
          </EmptyState>
        </div>
        <p class="vc-faint" style="margin: 0">
          Quem conduz a equipe fica fora do ranking por padrão: as horas de um técnico na sala não são a
          frequência de um estudante. A sala e o histórico continuam mostrando todo mundo.
        </p>
      </template>

      <!-- -------------------------------------------------------------- history -->
      <template v-if="tab === 'historico'">
        <SectionTitle lead="Histórico de" title="Estadas" />

        <div class="vc-row">
          <div class="vc-field" style="margin: 0">
            <label class="vc-label" for="from">De</label>
            <input id="from" class="vc-input" type="date" v-model="period.from" @change="load" />
          </div>
          <div class="vc-field" style="margin: 0">
            <label class="vc-label" for="to">Até</label>
            <input id="to" class="vc-input" type="date" v-model="period.to" @change="load" />
          </div>
          <div v-if="people.length > 1" class="vc-field" style="margin: 0; min-width: 220px">
            <label class="vc-label" for="person">Pessoa</label>
            <select id="person" class="vc-select" v-model="personFilter">
              <option value="">Todas que você acompanha</option>
              <option v-for="person in people" :key="person.userId" :value="person.userId">
                {{ person.userName }}
              </option>
            </select>
          </div>
        </div>

        <div class="vc-table-wrap">
          <table class="vc-table">
            <thead>
              <tr>
                <th>Pessoa</th><th>Entrada</th><th>Saída</th><th>Duração</th>
                <th v-if="scope.canManage"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="stay in visibleEntries" :key="stay.attendanceId">
                <td><PersonLink :user-id="stay.userId" :name="stay.userName" /></td>
                <td>{{ formatDateTime(stay.startTime) }}</td>
                <td>
                  <span v-if="stay.endTime">{{ formatDateTime(stay.endTime) }}</span>
                  <span v-else class="vc-chip vc-chip--warning">Em aberto</span>
                </td>
                <td>{{ formatDuration(stay.seconds) }}</td>
                <td v-if="scope.canManage" style="text-align: right">
                  <button v-if="stay.open" class="vc-btn vc-btn--outline vc-btn--small" type="button"
                          @click="openClose(stay)">
                    Fechar estada
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <EmptyState v-if="!visibleEntries.length" title="Nenhuma estada no período">
            Ajuste as datas ou espere alguém marcar presença no quiosque.
          </EmptyState>
        </div>
        <p class="vc-faint" style="margin: 0">
          Uma estada conta para o dia em que começou, mesmo quando atravessa a meia-noite.
        </p>
      </template>
    </div>

    <ModalDialog v-if="closing" title="Fechar estada esquecida aberta" @close="closing = null">
      <p class="vc-muted" style="margin-top: 0">
        <strong>{{ closing.userName }}</strong> entrou em {{ formatDateTime(closing.startTime) }} e não
        marcou saída. Escolha a hora em que a pessoa saiu de verdade.
      </p>
      <div class="vc-field">
        <label class="vc-label" for="endTime">Saída</label>
        <input id="endTime" class="vc-input" type="datetime-local" v-model="closeEndTime" />
      </div>
      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="closing = null">Cancelar</button>
        <button class="vc-btn" type="button" @click="confirmClose">Fechar estada</button>
      </template>
    </ModalDialog>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import AlertBanner from '@/components/AlertBanner.vue';
import PersonLink from '@/components/PersonLink.vue';
import AppIcon from '@/components/AppIcon.vue';
import EmptyState from '@/components/EmptyState.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import PanelCard from '@/components/PanelCard.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import TabBar from '@/components/TabBar.vue';
import { authStore } from '@/store/auth.js';
import { attendance as attendanceApi } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

/*
 * The presence register of the team, from the dashboard.
 *
 * The kiosk in the room is where people clock in and out; this is where the register is read. The
 * server decides how far each person sees — the whole team, the divisions they lead or only
 * themselves — and answers `/attendance/scope` so the screen can say which of the three it is
 * showing instead of leaving a short table looking broken.
 */
const auth = authStore();
const toast = useToast();

const REFRESH_MS = 60000;

const tab = ref('sala');
const loading = ref(false);
const lastUpdated = ref(null);
const scope = ref({ board: 'SELF', logs: 'SELF', divisions: [], canRegister: false, canManage: false });
const me = ref({ inRoom: false, since: null, secondsInRoom: 0, totalSeconds: 0, tenants: [] });
const now = ref([]);
const ranking = ref([]);
const entries = ref([]);
/*
 * Whether the ranking shows whoever conducts the team. Off by default and remembered per browser: the
 * server hides the staff unless asked, and the 60 s refresh has to keep asking the same thing.
 */
const INCLUDE_STAFF_KEY = 'attendance.includeStaff';
const includeStaff = ref(localStorage.getItem(INCLUDE_STAFF_KEY) === 'true');
const personFilter = ref('');
const closing = ref(null);
const closeEndTime = ref('');

/* Last thirty days: enough to answer "quem veio esse mês" without dragging the whole history. */
const period = reactive({ from: isoDate(daysAgo(30)), to: isoDate(new Date()) });

let timer = null;

/* The room board is hidden when it would only ever show one line: the person reading it. */
const tabs = computed(() => {
  const items = [];
  if (scope.value.board !== 'SELF') {
    items.push({ key: 'sala', label: 'Na sala agora' });
    items.push({ key: 'ranking', label: 'Ranking' });
  }
  items.push({ key: 'historico', label: 'Histórico' });
  return items;
});

const scopeVariant = computed(() => (scope.value.logs === 'SELF' ? 'info' : 'success'));

const scopeTitle = computed(() => {
  if (scope.value.logs === 'TEAM') return 'Você vê a equipe inteira.';
  if (scope.value.logs === 'DIVISIONS') return 'Você vê as divisões que lidera.';
  if (scope.value.board === 'TEAM') return 'Você vê o painel da sala e a sua própria presença.';
  return 'Você vê a sua presença.';
});

const scopeHint = computed(() => {
  if (scope.value.logs === 'TEAM') {
    return 'O histórico cobre todas as pessoas da equipe. A sala é compartilhada, então quem está nela'
      + ' aparece com a etiqueta da equipe de cada um.';
  }
  if (scope.value.logs === 'DIVISIONS') {
    const names = scope.value.divisions.join(', ');
    return `O histórico cobre quem está em ${names} e nas subdivisões dessas divisões, além de você.`;
  }
  if (scope.value.board === 'TEAM') {
    return 'A sala e o ranking você vê inteiros; o histórico detalhado é só o seu.';
  }
  return 'Para acompanhar outras pessoas é preciso liderar uma divisão ou ter a permissão de ver o registro.';
});

const periodLabel = computed(() => `${formatDate(period.from)} a ${formatDate(period.to)}`);

const lastUpdatedLabel = computed(() =>
  lastUpdated.value ? `Atualizado às ${lastUpdated.value}` : '',
);

/* The person filter only offers who the server actually answered about. */
const people = computed(() => {
  const seen = new Map();
  entries.value.forEach((stay) => {
    if (stay.userId && !seen.has(stay.userId)) {
      seen.set(stay.userId, { userId: stay.userId, userName: stay.userName });
    }
  });
  return [...seen.values()].sort((a, b) => (a.userName || '').localeCompare(b.userName || ''));
});

const visibleEntries = computed(() =>
  personFilter.value ? entries.value.filter((stay) => stay.userId === personFilter.value) : entries.value,
);

onMounted(() => {
  load();
  timer = setInterval(load, REFRESH_MS);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

watch(() => auth.activeTenantId, load);

/* A tab that disappeared with the scope must not stay selected. */
watch(tabs, (list) => {
  if (!list.some((item) => item.key === tab.value)) {
    tab.value = list[list.length - 1].key;
  }
});

watch(includeStaff, (value) => {
  localStorage.setItem(INCLUDE_STAFF_KEY, value ? 'true' : 'false');
  load();
});

async function load() {
  if (!auth.activeTenantId) return;
  loading.value = true;
  const tenantId = auth.activeTenantId;
  const params = { from: period.from, to: period.to };
  try {
    const [scopeResponse, meResponse] = await Promise.all([
      attendanceApi.scope(tenantId),
      attendanceApi.me(),
    ]);
    scope.value = scopeResponse.data;
    me.value = meResponse.data;

    const [nowResponse, rankingResponse, entriesResponse] = await Promise.all([
      attendanceApi.now(tenantId),
      /* Only the ranking is a frequency analysis; the history keeps showing everybody's stays */
      attendanceApi.ranking(tenantId, { ...params, includeStaff: includeStaff.value }),
      attendanceApi.entries(tenantId, params),
    ]);
    now.value = nowResponse.data;
    ranking.value = rankingResponse.data;
    entries.value = entriesResponse.data;
    lastUpdated.value = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar a presença'));
  } finally {
    loading.value = false;
  }
}

function openClose(stay) {
  closing.value = stay;
  closeEndTime.value = localInputValue(new Date());
}

/** A row of the room is a person, and the stay to close is the one of the team being read. */
function openCloseRoom(person) {
  openClose({
    attendanceId: person.closableAttendanceId,
    userName: person.userName,
    startTime: person.since,
  });
}

async function confirmClose() {
  try {
    await attendanceApi.close(closing.value.attendanceId, closeEndTime.value || null);
    closing.value = null;
    await load();
    toast.success('Estada fechada!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao fechar a estada'));
  }
}

/* ------------------------------------------------------------------ dates */

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/** yyyy-mm-dd in the local timezone, which is what the date input and the API expect. */
function isoDate(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

/** yyyy-mm-ddThh:mm, the format of an <input type="datetime-local"> and of LocalDateTime. */
function localInputValue(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDate(value) {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* Never shows a negative time: a clock out of step is a defect, not something to print. */
function formatDuration(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  if (total < 60) return `${total}s`;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (!hours) return `${minutes}min`;
  return `${hours}h ${String(minutes).padStart(2, '0')}min`;
}
</script>
