<template>
  <main class="vc-page vc-page--wide">
    <div class="vc-stack">
      <div class="vc-row vc-row--between">
        <h1 class="vc-title vc-title--underlined">Demandas</h1>
        <div class="vc-row">
          <button
            v-if="multiTeam"
            type="button"
            :class="['vc-chip', 'tasks-scope', { 'vc-chip--purple': allTeams }]"
            :aria-pressed="allTeams"
            @click="toggleAllTeams"
          >
            Todas as equipes
          </button>
          <button v-if="auth.can('TASK_MANAGE')" class="vc-btn" type="button" @click="openCreate">
            Nova demanda
          </button>
        </div>
      </div>

      <div class="vc-row" style="flex-wrap: wrap">
        <template v-if="allTeams">
          <label class="vc-checkbox">
            <input type="checkbox" v-model="filters.assignedToMe" />
            Atribuídas a mim
          </label>
          <label class="vc-checkbox">
            <input type="checkbox" v-model="filters.inMyDivisions" />
            Minhas divisões
          </label>
          <span v-if="auth.can('TASK_MANAGE')" class="vc-faint">
            Uma demanda nova entra em {{ auth.activeTenantName }}.
          </span>
        </template>
        <template v-else>
          <select class="vc-select" style="max-width: 220px" v-model="filters.divisionId" @change="reload">
            <option value="">Todas as divisões</option>
            <option v-for="division in divisionList" :key="division.divisionId" :value="division.divisionId">
              {{ division.visibleName }}
            </option>
          </select>
          <label class="vc-checkbox">
            <input type="checkbox" v-model="filters.mine" @change="reload" />
            Só as minhas
          </label>
        </template>
        <span class="vc-spacer"></span>
        <div class="vc-input-group" style="max-width: 260px">
          <input class="vc-input" type="search" placeholder="Buscar demanda..." v-model="search" />
        </div>
        <span class="vc-chip">{{ countLabel }}</span>
      </div>

      <div class="vc-kanban">
        <section
          v-for="column in kanban"
          :key="column.key"
          :class="['vc-kanban__col', { 'is-drop-target': dropTarget === column.key }]"
          @dragover="onDragOver($event, column.key)"
          @dragleave="onDragLeave($event, column.key)"
          @drop.prevent="onDrop($event, column.key)"
        >
          <h3 class="vc-kanban__title">
            <span>{{ column.label }}</span>
            <!-- The column's true size, which is not the number of cards under it -->
            <span class="vc-kanban__count">{{ column.total }}</span>
          </h3>
          <button
            v-for="task in column.items"
            :key="task.taskId"
            type="button"
            :class="[
              'vc-kanban__card',
              'vc-kanban__card--' + task.priority.toLowerCase(),
              { 'vc-kanban__card--team': allTeams, 'is-dragging': dragging === task.taskId },
            ]"
            :style="allTeams ? { borderTopColor: task.tenantColor || 'var(--vc-purple)' } : null"
            :draggable="canManage(task)"
            @dragstart="onDragStart($event, task)"
            @dragend="onDragEnd"
            @click="open(task)"
          >
            <strong>{{ task.title }}</strong>
            <span class="vc-kanban__meta">
              <span :class="task.overdue ? 'vc-danger-text' : ''">{{ task.dueLabel }}</span>
              <span v-if="allTeams" class="vc-chip">
                <span class="vc-dot" :style="{ background: task.tenantColor || 'var(--vc-purple)' }"></span>
                {{ task.tenantName }}
              </span>
            </span>
            <span class="vc-kanban__meta">
              <span>{{ task.ownerLabel || 'A definir' }}</span>
              <span v-if="task.divisionName" class="vc-chip">{{ task.divisionName }}</span>
            </span>
          </button>
          <p v-if="!column.items.length" class="vc-faint" style="font-size: 0.78rem; margin: 0">
            Nada aqui.
          </p>
          <!--
            Só no quadro de uma equipe: lá a coluna é uma página do servidor. No quadro de todas as
            equipes a coluna é um corte do que já veio, e quem pede mais é o botão embaixo do quadro.
          -->
          <button v-if="column.rest" class="vc-btn vc-btn--ghost vc-btn--small" type="button"
                  :disabled="loadingMore === column.key" @click="loadMoreOf(column)">
            Ver mais ({{ column.rest }})
          </button>
        </section>
      </div>

      <div v-if="allTeams && tasks.length < total" class="vc-row vc-row--between">
        <span class="vc-faint">{{ tasks.length }} de {{ total }} demandas carregadas.</span>
        <button class="vc-btn vc-btn--ghost" type="button" :disabled="loadingMore === 'all'"
                @click="loadMoreMine">
          Carregar mais
        </button>
      </div>

      <!--
        O vazio agora tem duas causas: não há demanda nenhuma, ou os filtros não acharam nada. Desde que
        a busca virou do servidor, o quadro vazio de uma busca é indistinguível de um quadro vazio.
      -->
      <EmptyState v-if="!total" :title="emptyTitle">
        <template v-if="filtering">
          Limpe a busca e os filtros para ver o quadro inteiro.
        </template>
        <template v-else>
          {{ auth.can('TASK_MANAGE')
            ? 'Uma demanda é o que a equipe deve, com prazo e com um critério de conclusão que não deixa dúvida.'
            : 'Quem conduz a equipe registra as demandas aqui.' }}
        </template>
      </EmptyState>
    </div>

    <!-- ------------------------------------------------------------ detail -->
    <ModalDialog v-if="selected" :title="selected.title" wide @close="selected = null">
      <div class="vc-list">
        <div v-if="allTeams" class="vc-list__item vc-list__item--plain">
          <div class="vc-list__text">
            <strong>Equipe</strong>
            <span>
              <span class="vc-dot" :style="{ background: selected.tenantColor || 'var(--vc-purple)' }"></span>
              {{ selected.tenantName }}
            </span>
          </div>
          <span v-if="selected.teamNumber" class="vc-list__aside">#{{ selected.teamNumber }}</span>
        </div>
        <div class="vc-list__item vc-list__item--plain">
          <div class="vc-list__text"><strong>Situação</strong><span>{{ selected.statusLabel }}</span></div>
          <span class="vc-list__aside">{{ selected.priorityLabel }}</span>
        </div>
        <div class="vc-list__item vc-list__item--plain">
          <div class="vc-list__text"><strong>Prazo</strong><span>{{ formatDate(selected.dueDate) }}</span></div>
          <span :class="['vc-list__aside', selected.overdue ? 'vc-danger-text' : '']">{{ selected.dueLabel }}</span>
        </div>
        <div class="vc-list__item vc-list__item--plain">
          <div class="vc-list__text"><strong>Divisão</strong><span>{{ selected.divisionName || 'sem divisão' }}</span></div>
        </div>
        <div class="vc-list__item vc-list__item--plain">
          <div class="vc-list__text"><strong>Responsável</strong><span>{{ selected.ownerLabel || '—' }}</span></div>
        </div>
      </div>

      <div class="vc-callout">
        <strong>Critério de conclusão</strong>
        <p style="margin: 4px 0 0">{{ selected.definitionOfDone || 'Não definido.' }}</p>
      </div>

      <SectionTitle lead="Quem" title="Recebe o Lembrete" />
      <div v-if="selected.assignees.length" class="vc-list">
        <div v-for="person in selected.assignees" :key="person.userId" class="vc-list__item vc-list__item--plain">
          <div class="vc-list__text">
            <strong><PersonLink :user-id="person.userId" :name="person.name" /></strong>
            <span>{{ person.email || 'sem e-mail cadastrado' }}</span>
          </div>
          <span class="vc-list__aside">
            <a v-if="person.email" class="vc-btn vc-btn--ghost vc-btn--small"
               :href="mailto(person)">Abrir e-mail</a>
          </span>
        </div>
      </div>
      <EmptyState v-else title="Ninguém vinculado">
        Sem uma pessoa vinculada não há a quem lembrar.
      </EmptyState>

      <p v-if="selected.lastReminderOn" class="vc-faint">
        Último lembrete: {{ formatDate(selected.lastReminderOn) }}.
      </p>

      <template #footer>
        <button v-if="canManage(selected) && selected.assignees.length" class="vc-btn vc-btn--outline"
                type="button" @click="remind(selected)">
          Lembrar agora
        </button>
        <button v-if="canManage(selected)" class="vc-btn vc-btn--outline" type="button"
                @click="advance(selected)">
          Avançar situação
        </button>
        <button v-if="canManage(selected)" class="vc-btn vc-btn--ghost" type="button"
                @click="openEdit(selected)">
          Editar
        </button>
        <button v-if="canManage(selected)" class="vc-btn vc-btn--danger" type="button"
                @click="remove(selected)">
          Excluir
        </button>
      </template>
    </ModalDialog>

    <!-- -------------------------------------------------------------- form -->
    <ModalDialog v-if="editing" :title="form.taskId ? 'Editar demanda' : 'Nova demanda'" wide
                 @close="editing = false">
      <p v-if="multiTeam" class="vc-faint" style="margin: 0 0 12px">
        <span class="vc-chip">
          <span class="vc-dot" :style="{ background: form.tenantColor || 'var(--vc-purple)' }"></span>
          {{ form.tenantName }}
        </span>
      </p>
      <div class="vc-field">
        <label class="vc-label" for="title">Título</label>
        <input id="title" class="vc-input" type="text" v-model="form.title"
               placeholder="Validar sequência principal de missões" />
      </div>
      <div class="vc-grid">
        <div class="vc-field">
          <label class="vc-label" for="division">Divisão</label>
          <select id="division" class="vc-select" v-model="form.divisionId">
            <option value="">Nenhuma</option>
            <option v-for="division in divisionList" :key="division.divisionId" :value="division.divisionId">
              {{ division.visibleName }}
            </option>
          </select>
        </div>
        <div class="vc-field">
          <label class="vc-label" for="due">Prazo</label>
          <input id="due" class="vc-input" type="date" v-model="form.dueDate" />
        </div>
        <div class="vc-field">
          <label class="vc-label" for="priority">Prioridade</label>
          <select id="priority" class="vc-select" v-model="form.priority">
            <option value="HIGH">Alta</option>
            <option value="MEDIUM">Média</option>
            <option value="LOW">Baixa</option>
          </select>
        </div>
        <div class="vc-field">
          <label class="vc-label" for="status">Situação</label>
          <select id="status" class="vc-select" v-model="form.status">
            <option v-for="column in columns" :key="column.key" :value="column.key">{{ column.label }}</option>
          </select>
        </div>
        <div class="vc-field">
          <label class="vc-label" for="owner">Responsável (texto livre)</label>
          <input id="owner" class="vc-input" type="text" v-model="form.ownerLabel"
                 placeholder="Em branco: os nomes de quem foi vinculado" />
        </div>
      </div>
      <div class="vc-field">
        <label class="vc-label" for="definition">Critério de conclusão</label>
        <textarea id="definition" class="vc-textarea" v-model="form.definitionOfDone"
                  placeholder="Como saberemos objetivamente que terminou?"></textarea>
        <span class="vc-faint">Obrigatório: sem isso a demanda é discutida em vez de concluída.</span>
      </div>
      <div class="vc-field">
        <label class="vc-label">Pessoas vinculadas</label>
        <label v-for="member in members" :key="member.user.userId" class="vc-checkbox">
          <input type="checkbox" :value="member.user.userId" v-model="form.assigneeIds" />
          {{ member.user.name }}
          <span class="vc-faint">{{ member.user.email || 'sem e-mail' }}</span>
        </label>
      </div>
      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="editing = false">Cancelar</button>
        <button class="vc-btn" type="button" @click="save">Salvar</button>
      </template>
    </ModalDialog>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import ModalDialog from '@/components/ModalDialog.vue';
import PersonLink from '@/components/PersonLink.vue';
import EmptyState from '@/components/EmptyState.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import { authStore } from '@/store/auth.js';
import { divisions as divisionsApi, tasks as tasksApi, tenants } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

/*
 * The board of the team as a kanban.
 *
 * The columns are the six situations the server knows, in the order work moves through them, and
 * "Bloqueada" sits at the end because it is not a stage — it is the state that asks for a decision.
 *
 * The board of one team is answered column by column: each column arrives with its own slice of cards
 * and its own true total, so the counter says how much the team owes and not how much came down the
 * wire, and "Ver mais" asks the server for the next page of that one column. The search and the filters
 * are the server's too — they are clauses of the query, not a pass over the cards already here, because
 * filtering a page and calling it the answer is how a board quietly starts lying.
 *
 * Somebody in more than one team can widen the board to every team at once. The cards then come from
 * /tasks/mine as one flat page — a survey across teams, not a surface to work on — split into columns
 * here; each carries its team and two flags, which are also filters of the query. Every action on a card
 * is gated by the permission on that card's own team, not by the team currently open. Creating stays in
 * the open team, because a new demanda has to belong to exactly one.
 */
const auth = authStore();
const toast = useToast();

const columns = [
  { key: 'BACKLOG', label: 'Backlog' },
  { key: 'PLANNED', label: 'Planejadas' },
  { key: 'DOING', label: 'Em andamento' },
  { key: 'VALIDATION', label: 'Validação' },
  { key: 'DONE', label: 'Concluídas' },
  { key: 'BLOCKED', label: 'Bloqueadas' },
];
const ADVANCE = ['BACKLOG', 'PLANNED', 'DOING', 'VALIDATION', 'DONE'];

/* Cards per column on the team board, and per page on the survey across teams. */
const PAGE_SIZE = 50;
/* A round trip per keystroke is a round trip per keystroke; the server answers the pause, not the key. */
const SEARCH_DELAY = 300;

/* Remembered in the browser only: it is a way of looking, not a fact about the person. */
const SCOPE_KEY = 'vernum.tasks.allTeams';

/* The flat page of /tasks/mine (all teams) and the columns of /tenants/{id}/tasks (one team). */
const tasks = ref([]);
const boardColumns = ref([]);
const total = ref(0);
const minePage = ref(0);
/* Which "ver mais" is in flight: a column's status, or 'all' for the survey across teams. */
const loadingMore = ref(null);
const members = ref([]);
const divisionList = ref([]);
/* Whose members and divisions the form is showing; the edit of another team's card swaps them. */
const peopleTenantId = ref(null);
const selected = ref(null);
const editing = ref(false);
const search = ref('');
const filters = reactive({ divisionId: '', mine: false, assignedToMe: false, inMyDivisions: false });
const form = reactive(blank());

const allTeamsPref = ref(readScope());
const multiTeam = computed(() => auth.memberships.length > 1);
const allTeams = computed(() => multiTeam.value && allTeamsPref.value);

/* Drag and drop: the card travelling and the column under it. */
const dragging = ref(null);
const dropTarget = ref(null);

/*
 * The six sections the kanban draws. On one team's board they are what the server answered, `rest`
 * being how many cards of that column are still there to ask for; on the board of every team they are
 * the flat page split by status, and `rest` is empty because a column there is not a page of its own.
 */
const kanban = computed(() => {
  if (!allTeams.value) {
    return boardColumns.value.map((column) => ({
      key: column.status,
      label: column.label,
      items: column.items,
      total: column.total,
      rest: column.items.length < column.total ? column.total - column.items.length : 0,
    }));
  }
  return columns.map((column) => {
    const items = tasks.value.filter((task) => task.status === column.key);
    return { key: column.key, label: column.label, items, total: items.length, rest: 0 };
  });
});

const countLabel = computed(() => (allTeams.value
  ? `${tasks.value.length} de ${total.value} demanda(s)`
  : `${total.value} demanda(s)`));

/* Whether anything is narrowing the board, which is what tells an empty board from an empty search. */
const filtering = computed(() => !!search.value.trim() || (allTeams.value
  ? filters.assignedToMe || filters.inMyDivisions
  : !!filters.divisionId || filters.mine));

const emptyTitle = computed(() => {
  if (filtering.value) return 'Nada com esses filtros';
  return allTeams.value ? 'Nenhuma demanda nas suas equipes' : 'Nenhuma demanda ainda';
});

let searchTimer = null;

onMounted(load);
onUnmounted(() => clearTimeout(searchTimer));
watch(() => auth.activeTenantId, load);
watch(allTeams, load);
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(reload, SEARCH_DELAY);
});
/* The two flags of the survey are query clauses now, so ticking one asks the server again. */
watch(() => [filters.assignedToMe, filters.inMyDivisions], reload);

function blank() {
  return {
    taskId: null, tenantId: null, tenantName: '', tenantColor: '', title: '', ownerLabel: '', dueDate: '',
    priority: 'MEDIUM', status: 'PLANNED', divisionId: '', definitionOfDone: '', assigneeIds: [],
  };
}

function readScope() {
  try {
    return localStorage.getItem(SCOPE_KEY) === '1';
  } catch (error) {
    return false;
  }
}

function toggleAllTeams() {
  allTeamsPref.value = !allTeamsPref.value;
  try {
    localStorage.setItem(SCOPE_KEY, allTeamsPref.value ? '1' : '0');
  } catch (error) {
    //A private window forgets the choice on close, which is fine
  }
}

/*
 * Who may move or change a card. On the open team's board that is the usual can(); on the board of
 * every team it is the permission on the card's own team, which may not be the one open.
 */
function canManage(task) {
  if (!task) return false;
  if (!allTeams.value) return auth.can('TASK_MANAGE');
  return auth.permissionsOn(task.tenantId).includes('TASK_MANAGE');
}

async function load() {
  if (!auth.activeTenantId) return;
  await reload();
  await loadPeople(auth.activeTenantId);
}

/* The board from the first page again: what every filter, every search and every edit goes back to. */
async function reload() {
  if (!auth.activeTenantId) return;
  try {
    if (allTeams.value) {
      const { data } = await tasksApi.mine({ ...mineParams(), page: 0, size: PAGE_SIZE });
      tasks.value = data.items || [];
      total.value = data.totalElements || 0;
      minePage.value = 0;
      //Nothing of the other board survives the switch: a stale column would still answer a dropped card
      boardColumns.value = [];
    } else {
      const { data } = await tasksApi.list(auth.activeTenantId, { ...boardParams(), size: PAGE_SIZE });
      //`page` per column, because each one is asked for on its own from here on
      boardColumns.value = (data.columns || []).map((column) => ({ ...column, page: 0 }));
      total.value = data.totalElements || 0;
      tasks.value = [];
    }
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar as demandas'));
  }
}

/* What narrows the board of one team, and what narrows the survey across every team. */
function boardParams() {
  const params = {};
  if (filters.divisionId) params.divisionId = filters.divisionId;
  if (filters.mine) params.mine = true;
  if (search.value.trim()) params.search = search.value.trim();
  return params;
}

function mineParams() {
  const params = {};
  if (filters.assignedToMe) params.assignedToMe = true;
  if (filters.inMyDivisions) params.inMyDivisions = true;
  if (search.value.trim()) params.search = search.value.trim();
  return params;
}

/*
 * The next page of one column, appended to it. The answer carries that column alone — that is what
 * `status` does to the route — so the other five stay exactly as they are.
 */
async function loadMoreOf(column) {
  const source = boardColumns.value.find((item) => item.status === column.key);
  if (!source || loadingMore.value) return;
  loadingMore.value = column.key;
  try {
    const next = source.page + 1;
    const { data } = await tasksApi.list(auth.activeTenantId, {
      ...boardParams(), status: column.key, page: next, size: PAGE_SIZE,
    });
    const answered = (data.columns || [])[0];
    if (answered) {
      source.items = [...source.items, ...answered.items];
      source.total = answered.total;
      source.page = next;
    }
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar mais demandas'));
  } finally {
    loadingMore.value = null;
  }
}

/* The next page of the survey across teams, appended to the flat list the columns are cut from. */
async function loadMoreMine() {
  if (loadingMore.value) return;
  loadingMore.value = 'all';
  try {
    const next = minePage.value + 1;
    const { data } = await tasksApi.mine({ ...mineParams(), page: next, size: PAGE_SIZE });
    tasks.value = [...tasks.value, ...(data.items || [])];
    total.value = data.totalElements || 0;
    minePage.value = next;
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar mais demandas'));
  } finally {
    loadingMore.value = null;
  }
}

/* The members and divisions of one team: the form's choices and the single-team division filter. */
async function loadPeople(tenantId) {
  const permissions = auth.permissionsOn(tenantId);
  peopleTenantId.value = tenantId;
  members.value = [];
  divisionList.value = [];
  if (permissions.includes('MEMBER_VIEW')) {
    try {
      const { data } = await tenants.members(tenantId);
      members.value = data.filter((member) => member.active !== false);
    } catch (error) {
      members.value = [];
    }
  }
  if (permissions.includes('DIVISION_VIEW')) {
    try {
      const { data } = await divisionsApi.list(tenantId);
      divisionList.value = data;
    } catch (error) {
      divisionList.value = [];
    }
  }
}

function open(task) {
  selected.value = task;
}

async function openCreate() {
  Object.assign(form, blank(), {
    tenantId: auth.activeTenantId,
    tenantName: auth.activeTenantName,
    tenantColor: auth.activeTenantColor,
  });
  if (peopleTenantId.value !== auth.activeTenantId) {
    await loadPeople(auth.activeTenantId);
  }
  editing.value = true;
}

async function openEdit(task) {
  Object.assign(form, {
    taskId: task.taskId,
    tenantId: task.tenantId,
    tenantName: task.tenantName,
    tenantColor: task.tenantColor,
    title: task.title,
    ownerLabel: task.ownerLabel || '',
    dueDate: task.dueDate || '',
    priority: task.priority,
    status: task.status,
    divisionId: task.divisionId || '',
    definitionOfDone: task.definitionOfDone || '',
    assigneeIds: task.assignees.map((person) => person.userId),
  });
  selected.value = null;
  //A card of another team is edited with that team's divisions and people, not the open team's
  if (peopleTenantId.value !== task.tenantId) {
    await loadPeople(task.tenantId);
  }
  editing.value = true;
}

async function save() {
  const body = {
    title: form.title,
    ownerLabel: form.ownerLabel || null,
    dueDate: form.dueDate || null,
    priority: form.priority,
    status: form.status,
    divisionId: form.divisionId || null,
    definitionOfDone: form.definitionOfDone,
    assigneeIds: form.assigneeIds,
  };
  try {
    if (form.taskId) {
      await tasksApi.update(form.taskId, body);
    } else {
      await tasksApi.create(auth.activeTenantId, body);
    }
    editing.value = false;
    await load();
    toast.success('Demanda salva!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao salvar a demanda'));
  }
}

/*
 * Moves the card on the screen first and asks the server afterwards: the board should show what the
 * hand just did. When the server refuses, the card goes back and the reason lands in the toast.
 *
 * On one team's board the columns come from the server, so moving a card is taking it out of one array
 * and putting it in another — changing only `task.status` would leave it sitting in the column it came
 * from. That board is read again afterwards because the totals of both columns changed, and a total is
 * the one thing on this screen that has to be the server's.
 *
 * The survey across every team is not read again, and must not be: there the columns are cut from the
 * flat list by `task.status`, so the card has already moved, and going back to page 0 would throw away
 * every "Carregar mais" the person pressed as the price of dragging one card.
 */
async function moveTo(task, status) {
  const before = task.status;
  applyStatus(task, status);
  try {
    const { data } = await tasksApi.update(task.taskId, { status });
    //The card the hand is still on gets the server's own words, before the board is read again
    Object.assign(task, { status: data.status, statusLabel: data.statusLabel, updatedAt: data.updatedAt });
    if (!allTeams.value) await reload();
    return true;
  } catch (error) {
    applyStatus(task, before);
    toast.error(apiMessage(error, 'Erro ao mover a demanda'));
    return false;
  }
}

/* Puts a card in the column of a status, on whichever of the two boards is on the screen. */
function applyStatus(task, status) {
  const from = boardColumns.value.find((column) => column.items.some((item) => item.taskId === task.taskId));
  task.status = status;
  //On the board of every team the split is computed from task.status, so there is nothing to move
  if (!from) return;
  const to = boardColumns.value.find((column) => column.status === status);
  from.items = from.items.filter((item) => item.taskId !== task.taskId);
  from.total = Math.max(0, from.total - 1);
  if (to) {
    to.items = [task, ...to.items];
    to.total += 1;
  }
}

/* The card behind a dragged id, on whichever of the two boards is on the screen. */
function findTask(taskId) {
  if (allTeams.value) {
    return tasks.value.find((item) => item.taskId === taskId);
  }
  for (const column of boardColumns.value) {
    const found = column.items.find((item) => item.taskId === taskId);
    if (found) return found;
  }
  return null;
}

/* Moves one step along the normal path. "Bloqueada" is left out: that is a decision, not a step. */
async function advance(task) {
  const index = ADVANCE.indexOf(task.status);
  const next = index < 0 || index === ADVANCE.length - 1 ? 'DONE' : ADVANCE[index + 1];
  if (await moveTo(task, next)) {
    selected.value = null;
    toast.success('Situação atualizada.');
  }
}

function onDragStart(event, task) {
  if (!canManage(task)) {
    event.preventDefault();
    return;
  }
  dragging.value = task.taskId;
  event.dataTransfer.effectAllowed = 'move';
  //Firefox only starts a drag that carries some data
  event.dataTransfer.setData('text/plain', String(task.taskId));
}

function onDragEnd() {
  dragging.value = null;
  dropTarget.value = null;
}

function onDragOver(event, status) {
  if (dragging.value === null) return;
  //Allowing the drop is done by cancelling the default, and only for a card of this board
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  dropTarget.value = status;
}

function onDragLeave(event, status) {
  //Moving over a card inside the column also fires dragleave; only an exit from the column counts
  if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget)) return;
  if (dropTarget.value === status) dropTarget.value = null;
}

async function onDrop(event, status) {
  const carried = event.dataTransfer.getData('text/plain');
  const taskId = carried ? Number(carried) : dragging.value;
  dragging.value = null;
  dropTarget.value = null;
  const task = findTask(taskId);
  if (!task || task.status === status || !canManage(task)) return;
  await moveTo(task, status);
}

async function remind(task) {
  try {
    const { data } = await tasksApi.remind(task.taskId);
    toast.success(`${data.notified} pessoa(s) notificada(s).`);
    await load();
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao enviar o lembrete'));
  }
}

async function remove(task) {
  if (!window.confirm(`Excluir a demanda "${task.title}"?`)) return;
  try {
    await tasksApi.remove(task.taskId);
    selected.value = null;
    await load();
    toast.info('Demanda excluída.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao excluir a demanda'));
  }
}

/* A draft in the person's own mail client: the platform notifies inside itself, never by e-mail. */
function mailto(person) {
  const team = selected.value.tenantName || auth.activeTenantName;
  const subject = `Vernum · ${selected.value.title}`;
  const body = `Olá, ${person.name.split(' ')[0]}!\n\n`
    + `A demanda "${selected.value.title}" de ${team} ${selected.value.dueLabel}.\n`
    + `Prioridade: ${selected.value.priorityLabel}\nSituação: ${selected.value.statusLabel}\n`
    + `Critério de conclusão: ${selected.value.definitionOfDone || '—'}\n`;
  return `mailto:${encodeURIComponent(person.email)}?subject=${encodeURIComponent(subject)}`
    + `&body=${encodeURIComponent(body)}`;
}

function formatDate(value) {
  return value ? new Date(value + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
}
</script>

<style scoped>
/* The switch between the open team's board and the board of every team, worn as a chip. */
.tasks-scope {
  font: inherit;
  cursor: pointer;
}

/* A card that may be moved says so with the hand, and fades while it travels. */
.vc-kanban__card[draggable="true"] {
  cursor: grab;
}

.vc-kanban__card.is-dragging {
  opacity: 0.5;
}

/* The column under a travelling card. */
.vc-kanban__col.is-drop-target {
  border-color: var(--vc-purple-border);
  background: var(--vc-purple-soft);
}

/*
 * On the board of every team the top edge carries the team's colour, set inline from the card's data;
 * the left edge stays the priority, which is what the whole kanban already reads it as.
 */
.vc-kanban__card--team {
  border-top-width: 3px;
}
</style>
