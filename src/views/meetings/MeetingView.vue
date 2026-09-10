<template>
  <main class="vc-page">
    <div v-if="meeting" class="vc-stack">
      <div class="vc-row vc-row--between" style="align-items: flex-start">
        <div>
          <router-link class="vc-faint" :to="{ name: 'meetings' }">← Reuniões</router-link>
          <h1 class="vc-title" style="margin: 4px 0 0">{{ meeting.title }}</h1>
          <p class="vc-faint" style="margin: 4px 0 0">
            {{ formatDateTime(meeting.startsAt) }}
            <template v-if="meeting.endsAt"> até {{ formatTime(meeting.endsAt) }}</template>
            <template v-if="meeting.location"> · {{ meeting.location }}</template>
            <span v-if="meeting.divisionName" class="vc-chip">{{ meeting.divisionName }}</span>
            <span v-if="meeting.closed" class="vc-chip vc-chip--success">ata fechada</span>
          </p>
        </div>
        <div class="vc-row" style="gap: 6px; flex-wrap: wrap; justify-content: flex-end">
          <button v-if="canWrite" class="vc-btn vc-btn--ghost vc-btn--small" type="button"
                  @click="toggleClosed">
            {{ meeting.closed ? 'Reabrir ata' : 'Fechar ata' }}
          </button>
          <button v-if="canWrite && !meeting.closed" class="vc-btn vc-btn--danger vc-btn--small"
                  type="button" @click="remove">Apagar</button>
        </div>
      </div>

      <!--
        Fechada, a tela para de oferecer edição. Nada é congelado no banco — quem responde por alteração
        é a trilha de auditoria — mas reabrir passa a ser um ato deliberado em vez de um deslize.
      -->
      <AlertBanner v-if="meeting.closed" variant="success" title="Ata fechada.">
        Ninguém escreve nela enquanto estiver assim. Reabra para corrigir alguma coisa.
      </AlertBanner>

      <div class="mv__split">
        <section class="vc-stack">
          <SectionTitle title="Pauta" />
          <template v-if="editing">
            <textarea class="vc-input mv__area" v-model="draft.agenda"
                      placeholder="## Pauta&#10;&#10;1. ..."></textarea>
          </template>
          <MarkdownView v-else-if="meeting.agenda" :content="meeting.agenda" :tenant-id="auth.activeTenantId" />
          <p v-else class="vc-faint">Sem pauta escrita.</p>
        </section>

        <section class="vc-stack">
          <SectionTitle title="Ata" />
          <template v-if="editing">
            <textarea class="vc-input mv__area" v-model="draft.minutes"
                      placeholder="O que foi dito, em markdown."></textarea>
          </template>
          <MarkdownView v-else-if="meeting.minutes" :content="meeting.minutes" :tenant-id="auth.activeTenantId" />
          <p v-else class="vc-faint">Ainda não escrita.</p>
        </section>
      </div>

      <div v-if="canWrite && !meeting.closed" class="vc-row" style="gap: 8px">
        <button v-if="!editing" class="vc-btn vc-btn--small" type="button" @click="startEdit">
          Escrever pauta e ata
        </button>
        <template v-else>
          <button class="vc-btn vc-btn--small" type="button" @click="saveText">Salvar</button>
          <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="editing = false">
            Cancelar
          </button>
        </template>
      </div>

      <!-- ------------------------------------------------------------ presença -->
      <section class="vc-stack">
        <SectionTitle title="Quem foi chamado">
          <template #actions>
            <span class="vc-faint">{{ presentCount }} de {{ meeting.attendees.length }} presentes</span>
          </template>
        </SectionTitle>
        <p class="vc-faint" style="margin: 0">
          Chamado e presente são duas coisas: "quem faltou" é pergunta que uma ata recebe.
        </p>
        <div v-if="canWrite && !meeting.closed" class="mv__people">
          <label v-for="person in members" :key="person.user.userId" class="mv__person">
            <input type="checkbox" :value="person.user.userId" v-model="called" />
            <span class="mv__name">{{ person.user.name }}</span>
            <span v-if="called.includes(person.user.userId)" class="mv__came">
              <input type="checkbox" :value="person.user.userId" v-model="present" />
              veio
            </span>
          </label>
        </div>
        <ul v-else class="mv__plain">
          <li v-for="a in meeting.attendees" :key="a.person.userId">
            <AppIcon :name="a.present ? 'check' : 'close'" :size="13" />
            {{ a.person.name }}
            <span class="vc-faint">{{ a.present ? 'presente' : 'faltou' }}</span>
          </li>
          <li v-if="!meeting.attendees.length" class="vc-faint">Ninguém registrado.</li>
        </ul>
        <div v-if="canWrite && !meeting.closed">
          <button class="vc-btn vc-btn--small" type="button" @click="saveAttendance">Salvar presença</button>
        </div>
      </section>

      <!-- ----------------------------------------------------------- decisões -->
      <section class="vc-stack">
        <SectionTitle title="Decisões" />
        <ul class="mv__plain">
          <li v-for="d in meeting.decisions" :key="d.decisionId">
            <AppIcon name="check" :size="13" />
            <span class="mv__grow">{{ d.text }}</span>
            <button v-if="canWrite && !meeting.closed" class="vc-btn vc-btn--ghost vc-btn--small"
                    type="button" @click="dropDecision(d)">tirar</button>
          </li>
          <li v-if="!meeting.decisions.length" class="vc-faint">Nada decidido ainda.</li>
        </ul>
        <div v-if="canWrite && !meeting.closed" class="vc-row" style="gap: 8px">
          <input class="vc-input" type="text" v-model="newDecision" maxlength="500"
                 placeholder="O que ficou decidido" @keyup.enter="addDecision" />
          <button class="vc-btn vc-btn--small" type="button" :disabled="!newDecision.trim()"
                  @click="addDecision">Registrar</button>
        </div>
      </section>

      <!-- ----------------------------------------------------- encaminhamentos -->
      <section class="vc-stack">
        <SectionTitle title="Encaminhamentos" />
        <p class="vc-faint" style="margin: 0">
          O que vira demanda cai no quadro, com prazo e responsável, e o lembrete sai de lá. O que não
          vira fica só aqui.
        </p>
        <ul class="mv__plain">
          <li v-for="a in meeting.actions" :key="a.actionId">
            <AppIcon name="kanban" :size="13" />
            <span class="mv__grow">
              {{ a.text }}
              <span v-if="a.owner" class="vc-faint"> · {{ a.owner.name }}</span>
              <span v-if="a.dueDate" class="vc-faint"> · até {{ formatDate(a.dueDate) }}</span>
            </span>
            <span v-if="a.taskId" :class="['vc-chip', a.taskDone ? 'vc-chip--success' : 'vc-chip--purple']">
              {{ a.taskDone ? 'demanda concluída' : 'no quadro' }}
            </span>
            <button v-else-if="canWrite && canManageTasks && !meeting.closed"
                    class="vc-btn vc-btn--small" type="button" @click="toTask(a)">
              Virar demanda
            </button>
            <button v-if="canWrite && !meeting.closed" class="vc-btn vc-btn--ghost vc-btn--small"
                    type="button" @click="dropAction(a)">tirar</button>
          </li>
          <li v-if="!meeting.actions.length" class="vc-faint">Nada combinado ainda.</li>
        </ul>
        <div v-if="canWrite && !meeting.closed" class="mv__newaction">
          <input class="vc-input" type="text" v-model="action.text" maxlength="300"
                 placeholder="O que ficou de ser feito" />
          <select class="vc-input" v-model="action.ownerId">
            <option :value="null">Sem responsável</option>
            <option v-for="p in members" :key="p.user.userId" :value="p.user.userId">{{ p.user.name }}</option>
          </select>
          <input class="vc-input" type="date" v-model="action.dueDate" />
          <button class="vc-btn vc-btn--small" type="button" :disabled="!action.text.trim()"
                  @click="addAction">Registrar</button>
        </div>
      </section>
    </div>
    <p v-else-if="loading" class="vc-faint">Carregando...</p>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AlertBanner from '@/components/AlertBanner.vue';
import AppIcon from '@/components/AppIcon.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import MarkdownView from '@/components/wiki/MarkdownView.vue';
import { authStore } from '@/store/auth.js';
import { meetings, tenants } from '@/services/api.js';
import { formatDate, formatDateTime, formatTime } from '@/services/time.js';

/*
 * Uma reunião: a pauta e a ata lado a lado, e embaixo o que ela produziu.
 *
 * A pauta e a ata em markdown usam o mesmo renderizador da base de conhecimento — a ata de uma reunião
 * é o mesmo tipo de documento, e ter dois renderizadores seria ter duas maneiras de a mesma tabela sair
 * torta.
 */
const auth = authStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const meeting = ref(null);
const members = ref([]);
const loading = ref(true);
const editing = ref(false);
const newDecision = ref('');
const called = ref([]);
const present = ref([]);

const draft = reactive({ agenda: '', minutes: '' });
const action = reactive({ text: '', ownerId: null, dueDate: '' });

const canWrite = computed(() => auth.can('MEETING_MANAGE'));
const canManageTasks = computed(() => auth.can('TASK_MANAGE'));
const presentCount = computed(() => (meeting.value?.attendees || []).filter((a) => a.present).length);

onMounted(async () => {
  await load();
  try {
    const { data } = await tenants.members(auth.activeTenantId);
    members.value = data.filter((m) => m.active !== false);
  } catch (error) {
    members.value = [];
  }
});

async function load() {
  loading.value = true;
  try {
    const { data } = await meetings.one(auth.activeTenantId, route.params.meetingId);
    meeting.value = data;
    called.value = data.attendees.map((a) => a.person.userId);
    present.value = data.attendees.filter((a) => a.present).map((a) => a.person.userId);
  } catch (error) {
    toast.error('Não deu para abrir a reunião.');
    router.push({ name: 'meetings' });
  } finally {
    loading.value = false;
  }
}

function startEdit() {
  draft.agenda = meeting.value.agenda || '';
  draft.minutes = meeting.value.minutes || '';
  editing.value = true;
}

async function saveText() {
  try {
    const { data } = await meetings.update(auth.activeTenantId, meeting.value.meetingId,
      { agenda: draft.agenda, minutes: draft.minutes });
    meeting.value = data;
    editing.value = false;
    toast.success('Salvo.');
  } catch (error) {
    toast.error(error.response?.data?.message || 'Não deu para salvar.');
  }
}

async function saveAttendance() {
  try {
    //Só quem foi chamado pode constar como presente: a lista de presentes é subconjunto da de chamados
    const { data } = await meetings.setAttendance(auth.activeTenantId, meeting.value.meetingId, {
      calledIds: called.value,
      presentIds: present.value.filter((id) => called.value.includes(id)),
    });
    meeting.value = data;
    toast.success('Presença salva.');
  } catch (error) {
    toast.error(error.response?.data?.message || 'Não deu para salvar a presença.');
  }
}

async function toggleClosed() {
  try {
    const { data } = await meetings.setClosed(auth.activeTenantId, meeting.value.meetingId,
      !meeting.value.closed);
    meeting.value = data;
    editing.value = false;
  } catch (error) {
    toast.error('Não deu para mudar a ata.');
  }
}

async function remove() {
  if (!window.confirm(`Apagar "${meeting.value.title}"? As demandas que saíram dela ficam no quadro.`)) {
    return;
  }
  try {
    await meetings.remove(auth.activeTenantId, meeting.value.meetingId);
    router.push({ name: 'meetings' });
  } catch (error) {
    toast.error('Não deu para apagar.');
  }
}

async function addDecision() {
  if (!newDecision.value.trim()) return;
  try {
    await meetings.addDecision(auth.activeTenantId, meeting.value.meetingId, newDecision.value);
    newDecision.value = '';
    await load();
  } catch (error) {
    toast.error(error.response?.data?.message || 'Não deu para registrar.');
  }
}

async function dropDecision(decision) {
  try {
    await meetings.removeDecision(auth.activeTenantId, decision.decisionId);
    await load();
  } catch (error) {
    toast.error('Não deu para tirar.');
  }
}

async function addAction() {
  try {
    await meetings.addAction(auth.activeTenantId, meeting.value.meetingId, {
      text: action.text,
      ownerId: action.ownerId,
      dueDate: action.dueDate || null,
    });
    Object.assign(action, { text: '', ownerId: null, dueDate: '' });
    await load();
  } catch (error) {
    toast.error(error.response?.data?.message || 'Não deu para registrar.');
  }
}

async function dropAction(item) {
  try {
    await meetings.removeAction(auth.activeTenantId, item.actionId);
    await load();
  } catch (error) {
    toast.error('Não deu para tirar.');
  }
}

async function toTask(item) {
  try {
    await meetings.toTask(auth.activeTenantId, item.actionId);
    toast.success('Virou demanda no quadro.');
    await load();
  } catch (error) {
    toast.error(error.response?.data?.message || 'Não deu para criar a demanda.');
  }
}
</script>

<style scoped>
.mv__split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  align-items: start;
}

@media (max-width: 900px) {
  .mv__split { grid-template-columns: 1fr; }
}

.mv__area {
  min-height: 240px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
}

.mv__plain { list-style: none; margin: 0; padding: 0; }

.mv__plain li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-top: 1px solid var(--vc-border);
}

.mv__grow { flex: 1; min-width: 0; }

.mv__people {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 6px;
}

.mv__person {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 9px;
  border: 1px solid var(--vc-border);
  border-radius: 8px;
  cursor: pointer;
}

.mv__name { flex: 1; min-width: 0; }

.mv__came {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--vc-text-muted);
}

.mv__newaction {
  display: grid;
  grid-template-columns: 2fr 1fr 150px auto;
  gap: 8px;
}

@media (max-width: 900px) {
  .mv__newaction { grid-template-columns: 1fr; }
}
</style>
