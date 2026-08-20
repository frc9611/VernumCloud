<template>
  <main class="vc-page vc-page--wide">
    <div class="vc-stack">
      <div class="vc-row vc-row--between">
        <h1 class="vc-title vc-title--underlined">Demandas</h1>
        <button v-if="auth.can('TASK_MANAGE')" class="vc-btn" type="button" @click="openCreate">
          Nova demanda
        </button>
      </div>

      <div class="vc-row" style="flex-wrap: wrap">
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
        <span class="vc-spacer"></span>
        <div class="vc-input-group" style="max-width: 260px">
          <input class="vc-input" type="search" placeholder="Buscar demanda..." v-model="search" />
        </div>
        <span class="vc-chip">{{ visible.length }} demanda(s)</span>
      </div>

      <div class="vc-kanban">
        <section v-for="column in columns" :key="column.key" class="vc-kanban__col">
          <h3 class="vc-kanban__title">
            <span>{{ column.label }}</span>
            <span class="vc-kanban__count">{{ inColumn(column.key).length }}</span>
          </h3>
          <button
            v-for="task in inColumn(column.key)"
            :key="task.taskId"
            type="button"
            :class="['vc-kanban__card', 'vc-kanban__card--' + task.priority.toLowerCase()]"
            @click="open(task)"
          >
            <strong>{{ task.title }}</strong>
            <span class="vc-kanban__meta">
              <span>{{ task.area || 'Geral' }}</span>
              <span :class="task.overdue ? 'vc-danger-text' : ''">{{ task.dueLabel }}</span>
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

      <EmptyState v-if="!tasks.length" title="Nenhuma demanda ainda">
        {{ auth.can('TASK_MANAGE')
          ? 'Uma demanda é o que a equipe deve, com prazo e com um critério de conclusão que não deixa dúvida.'
          : 'Quem conduz a equipe registra as demandas aqui.' }}
      </EmptyState>
    </div>

    <!-- ------------------------------------------------------------ detail -->
    <ModalDialog v-if="selected" :title="selected.title" wide @close="selected = null">
      <div class="vc-list">
        <div class="vc-list__item vc-list__item--plain">
          <div class="vc-list__text"><strong>Situação</strong><span>{{ selected.statusLabel }}</span></div>
          <span class="vc-list__aside">{{ selected.priorityLabel }}</span>
        </div>
        <div class="vc-list__item vc-list__item--plain">
          <div class="vc-list__text"><strong>Prazo</strong><span>{{ formatDate(selected.dueDate) }}</span></div>
          <span :class="['vc-list__aside', selected.overdue ? 'vc-danger-text' : '']">{{ selected.dueLabel }}</span>
        </div>
        <div class="vc-list__item vc-list__item--plain">
          <div class="vc-list__text"><strong>Área</strong><span>{{ selected.area || '—' }}</span></div>
          <span class="vc-list__aside">{{ selected.divisionName || 'sem divisão' }}</span>
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
            <strong>{{ person.name }}</strong>
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
        <button v-if="auth.can('TASK_MANAGE') && selected.assignees.length" class="vc-btn vc-btn--outline"
                type="button" @click="remind(selected)">
          Lembrar agora
        </button>
        <button v-if="auth.can('TASK_MANAGE')" class="vc-btn vc-btn--outline" type="button"
                @click="advance(selected)">
          Avançar situação
        </button>
        <button v-if="auth.can('TASK_MANAGE')" class="vc-btn vc-btn--ghost" type="button"
                @click="openEdit(selected)">
          Editar
        </button>
        <button v-if="auth.can('TASK_MANAGE')" class="vc-btn vc-btn--danger" type="button"
                @click="remove(selected)">
          Excluir
        </button>
      </template>
    </ModalDialog>

    <!-- -------------------------------------------------------------- form -->
    <ModalDialog v-if="editing" :title="form.taskId ? 'Editar demanda' : 'Nova demanda'" wide
                 @close="editing = false">
      <div class="vc-field">
        <label class="vc-label" for="title">Título</label>
        <input id="title" class="vc-input" type="text" v-model="form.title"
               placeholder="Validar sequência principal de missões" />
      </div>
      <div class="vc-grid">
        <div class="vc-field">
          <label class="vc-label" for="area">Área</label>
          <input id="area" class="vc-input" type="text" v-model="form.area" placeholder="Engenharia" />
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
          <label class="vc-label" for="division">Divisão</label>
          <select id="division" class="vc-select" v-model="form.divisionId">
            <option value="">Nenhuma</option>
            <option v-for="division in divisionList" :key="division.divisionId" :value="division.divisionId">
              {{ division.visibleName }}
            </option>
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

const tasks = ref([]);
const members = ref([]);
const divisionList = ref([]);
const selected = ref(null);
const editing = ref(false);
const search = ref('');
const filters = reactive({ divisionId: '', mine: false });
const form = reactive(blank());

const visible = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return tasks.value;
  return tasks.value.filter((task) =>
    [task.title, task.area, task.ownerLabel, task.definitionOfDone]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(term)),
  );
});

function inColumn(status) {
  return visible.value.filter((task) => task.status === status);
}

onMounted(load);
watch(() => auth.activeTenantId, load);

function blank() {
  return {
    taskId: null, title: '', area: '', ownerLabel: '', dueDate: '', priority: 'MEDIUM',
    status: 'PLANNED', divisionId: '', definitionOfDone: '', assigneeIds: [],
  };
}

async function load() {
  if (!auth.activeTenantId) return;
  try {
    const params = {};
    if (filters.divisionId) params.divisionId = filters.divisionId;
    if (filters.mine) params.mine = true;
    const { data } = await tasksApi.list(auth.activeTenantId, params);
    tasks.value = data;
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar as demandas'));
  }
  if (auth.can('MEMBER_VIEW')) {
    try {
      const { data } = await tenants.members(auth.activeTenantId);
      members.value = data.filter((member) => member.active !== false);
    } catch (error) {
      members.value = [];
    }
  }
  if (auth.can('DIVISION_VIEW')) {
    try {
      const { data } = await divisionsApi.list(auth.activeTenantId);
      divisionList.value = data;
    } catch (error) {
      divisionList.value = [];
    }
  }
}

function open(task) {
  selected.value = task;
}

function openCreate() {
  Object.assign(form, blank());
  editing.value = true;
}

function openEdit(task) {
  Object.assign(form, {
    taskId: task.taskId,
    title: task.title,
    area: task.area || '',
    ownerLabel: task.ownerLabel || '',
    dueDate: task.dueDate || '',
    priority: task.priority,
    status: task.status,
    divisionId: task.divisionId || '',
    definitionOfDone: task.definitionOfDone || '',
    assigneeIds: task.assignees.map((person) => person.userId),
  });
  selected.value = null;
  editing.value = true;
}

async function save() {
  const body = {
    title: form.title,
    area: form.area || null,
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

/* Moves one step along the normal path. "Bloqueada" is left out: that is a decision, not a step. */
async function advance(task) {
  const index = ADVANCE.indexOf(task.status);
  const next = index < 0 || index === ADVANCE.length - 1 ? 'DONE' : ADVANCE[index + 1];
  try {
    await tasksApi.update(task.taskId, { status: next });
    selected.value = null;
    await load();
    toast.success('Situação atualizada.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao mover a demanda'));
  }
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
  const subject = `Vernum · ${selected.value.title}`;
  const body = `Olá, ${person.name.split(' ')[0]}!\n\n`
    + `A demanda "${selected.value.title}" de ${auth.activeTenantName} ${selected.value.dueLabel}.\n`
    + `Prioridade: ${selected.value.priorityLabel}\nSituação: ${selected.value.statusLabel}\n`
    + `Critério de conclusão: ${selected.value.definitionOfDone || '—'}\n`;
  return `mailto:${encodeURIComponent(person.email)}?subject=${encodeURIComponent(subject)}`
    + `&body=${encodeURIComponent(body)}`;
}

function formatDate(value) {
  return value ? new Date(value + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
}
</script>
