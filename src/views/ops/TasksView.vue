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
          <select class="vc-select" style="max-width: 220px" v-model="filters.divisionId" @change="load">
            <option value="">Todas as divisões</option>
            <option v-for="division in divisionList" :key="division.divisionId" :value="division.divisionId">
              {{ division.visibleName }}
            </option>
          </select>
          <label class="vc-checkbox">
            <input type="checkbox" v-model="filters.mine" @change="load" />
            Só as minhas
          </label>
        </template>
        <span class="vc-spacer"></span>
        <div class="vc-input-group" style="max-width: 260px">
          <input class="vc-input" type="search" placeholder="Buscar demanda..." v-model="search" />
        </div>
        <span class="vc-chip">{{ visible.length }} demanda(s)</span>
      </div>

      <div class="vc-kanban">
        <section
          v-for="column in columns"
          :key="column.key"
          :class="['vc-kanban__col', { 'is-drop-target': dropTarget === column.key }]"
          @dragover="onDragOver($event, column.key)"
          @dragleave="onDragLeave($event, column.key)"
          @drop.prevent="onDrop($event, column.key)"
        >
          <h3 class="vc-kanban__title">
            <span>{{ column.label }}</span>
            <span class="vc-kanban__count">{{ inColumn(column.key).length }}</span>
          </h3>
          <button
            v-for="task in inColumn(column.key)"
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
          <p v-if="!inColumn(column.key).length" class="vc-faint" style="font-size: 0.78rem; margin: 0">
            Nada aqui.
          </p>
        </section>
      </div>

      <EmptyState v-if="!tasks.length" :title="allTeams ? 'Nenhuma demanda nas suas equipes' : 'Nenhuma demanda ainda'">
        {{ auth.can('TASK_MANAGE')
          ? 'Uma demanda é o que a equipe deve, com prazo e com um critério de conclusão que não deixa dúvida.'
          : 'Quem conduz a equipe registra as demandas aqui.' }}
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
import { computed, onMounted, reactive, ref, watch } from 'vue';
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
 * The search filters what is already loaded: a team's board is small and a round trip per keystroke
 * would be slower than the browser.
 *
 * Somebody in more than one team can widen the board to every team at once. The cards then come from
 * /tasks/mine, each carrying its team and two flags the person filters by, and every action on a card
 * is gated by the permission on that card's own team — not by the team currently open. Creating stays
 * in the open team, because a new demanda has to belong to exactly one.
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

/* Remembered in the browser only: it is a way of looking, not a fact about the person. */
const SCOPE_KEY = 'vernum.tasks.allTeams';

const tasks = ref([]);
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

const visible = computed(() => {
  const term = search.value.trim().toLowerCase();
  return tasks.value.filter((task) => {
    if (allTeams.value) {
      if (filters.assignedToMe && !task.assignedToMe) return false;
      if (filters.inMyDivisions && !task.inMyDivisions) return false;
    }
    if (!term) return true;
    return [task.title, task.ownerLabel, task.definitionOfDone, task.divisionName, task.tenantName]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(term));
  });
});

function inColumn(status) {
  return visible.value.filter((task) => task.status === status);
}

onMounted(load);
watch(() => auth.activeTenantId, load);
watch(allTeams, load);

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
  try {
    if (allTeams.value) {
      const { data } = await tasksApi.mine();
      tasks.value = data;
    } else {
      const params = {};
      if (filters.divisionId) params.divisionId = filters.divisionId;
      if (filters.mine) params.mine = true;
      const { data } = await tasksApi.list(auth.activeTenantId, params);
      tasks.value = data;
    }
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar as demandas'));
  }
  await loadPeople(auth.activeTenantId);
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
 */
async function moveTo(task, status) {
  const before = task.status;
  task.status = status;
  try {
    const { data } = await tasksApi.update(task.taskId, { status });
    Object.assign(task, { status: data.status, statusLabel: data.statusLabel, updatedAt: data.updatedAt });
    return true;
  } catch (error) {
    task.status = before;
    toast.error(apiMessage(error, 'Erro ao mover a demanda'));
    return false;
  }
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
  const task = tasks.value.find((item) => item.taskId === taskId);
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
