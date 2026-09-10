<template>
  <main class="vc-page">
    <div class="vc-stack">
      <div class="vc-row vc-row--between">
        <h1 class="vc-title vc-title--underlined">Reuniões</h1>
        <button v-if="canWrite" class="vc-btn" type="button" @click="openNew">Marcar reunião</button>
      </div>

      <p class="vc-muted" style="margin: 0">
        A pauta antes e a ata depois são a mesma página. O que ficou combinado vira demanda no quadro,
        para não morrer dentro do documento.
      </p>

      <p v-if="loading" class="vc-faint">Carregando...</p>
      <EmptyState v-else-if="!rows.length" title="Nenhuma reunião ainda">
        <template v-if="canWrite">Marque uma e escreva a pauta; a ata se escreve na mesma página.</template>
        <template v-else>Quando a equipe marcar uma, ela aparece aqui.</template>
      </EmptyState>

      <ul v-else class="mt__list">
        <li v-for="row in rows" :key="row.meetingId" class="mt__row" @click="open(row.meetingId)">
          <div class="mt__when">
            <strong>{{ formatDate(row.startsAt) }}</strong>
            <span class="vc-faint">{{ formatTime(row.startsAt) }}</span>
          </div>
          <div class="mt__main">
            <div class="vc-row" style="gap: 6px; flex-wrap: wrap; align-items: center">
              <strong>{{ row.title }}</strong>
              <span v-if="row.divisionName" class="vc-chip"
                    :style="{ '--chip': row.divisionColor }">{{ row.divisionName }}</span>
              <span v-if="row.closed" class="vc-chip vc-chip--success">ata fechada</span>
              <span v-else-if="row.hasMinutes" class="vc-chip vc-chip--warning">ata aberta</span>
              <span v-else class="vc-chip">sem ata</span>
            </div>
            <p class="vc-faint" style="margin: 3px 0 0">
              <template v-if="row.location">{{ row.location }} · </template>
              {{ row.present }} presente{{ row.present === 1 ? '' : 's' }} ·
              {{ row.decisions }} decisã{{ row.decisions === 1 ? 'o' : 'ões' }} ·
              {{ row.actions }} encaminhamento{{ row.actions === 1 ? '' : 's' }}
              <template v-if="row.openActions"> ({{ row.openActions }} em aberto)</template>
            </p>
          </div>
          <AppIcon name="chevronRight" :size="16" />
        </li>
      </ul>
    </div>

    <ModalDialog v-if="creating" title="Marcar reunião" @close="creating = false">
      <div class="vc-stack">
        <div class="vc-field">
          <label class="vc-label" for="mt-title">Assunto</label>
          <input id="mt-title" class="vc-input" type="text" v-model="form.title" maxlength="160"
                 placeholder="Retrospectiva da temporada" />
        </div>
        <div class="mt__grid">
          <div class="vc-field">
            <label class="vc-label" for="mt-start">Começa</label>
            <input id="mt-start" class="vc-input" type="datetime-local" v-model="form.startsAt" />
          </div>
          <div class="vc-field">
            <label class="vc-label" for="mt-end">Termina</label>
            <input id="mt-end" class="vc-input" type="datetime-local" v-model="form.endsAt" />
          </div>
        </div>
        <div class="mt__grid">
          <div class="vc-field">
            <label class="vc-label" for="mt-place">Onde</label>
            <input id="mt-place" class="vc-input" type="text" v-model="form.location" maxlength="160"
                   placeholder="Sala 3, ou o link da chamada" />
          </div>
          <div class="vc-field">
            <label class="vc-label" for="mt-div">Divisão</label>
            <select id="mt-div" class="vc-input" v-model="form.divisionId">
              <option :value="0">A equipe toda</option>
              <option v-for="d in divisions" :key="d.divisionId" :value="d.divisionId">
                {{ d.visibleName }}
              </option>
            </select>
          </div>
        </div>
        <p v-if="zoneNote" class="vc-faint" style="margin: 0">{{ zoneNote }}</p>
      </div>
      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="creating = false">Cancelar</button>
        <button class="vc-btn" type="button" :disabled="!form.title.trim() || !form.startsAt" @click="create">
          Marcar
        </button>
      </template>
    </ModalDialog>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AppIcon from '@/components/AppIcon.vue';
import EmptyState from '@/components/EmptyState.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import { authStore } from '@/store/auth.js';
import { divisions as divisionsApi, meetings } from '@/services/api.js';
import { formatDate, formatTime, fromInputValue, zoneNotice } from '@/services/time.js';

const auth = authStore();
const router = useRouter();
const toast = useToast();

const rows = ref([]);
const divisions = ref([]);
const loading = ref(true);
const creating = ref(false);
const zoneNote = zoneNotice();

const form = reactive({ title: '', startsAt: '', endsAt: '', location: '', divisionId: 0 });

const canWrite = computed(() => auth.can('MEETING_MANAGE'));

onMounted(load);
watch(() => auth.activeTenantId, load);

async function load() {
  loading.value = true;
  try {
    const { data } = await meetings.list(auth.activeTenantId);
    rows.value = data;
  } catch (error) {
    rows.value = [];
    toast.error('Não deu para carregar as reuniões.');
  } finally {
    loading.value = false;
  }
}

async function openNew() {
  creating.value = true;
  Object.assign(form, { title: '', startsAt: '', endsAt: '', location: '', divisionId: 0 });
  try {
    const { data } = await divisionsApi.list(auth.activeTenantId);
    divisions.value = data;
  } catch (error) {
    divisions.value = [];
  }
}

async function create() {
  try {
    const { data } = await meetings.create(auth.activeTenantId, {
      title: form.title,
      startsAt: fromInputValue(form.startsAt),
      endsAt: fromInputValue(form.endsAt),
      location: form.location || null,
      divisionId: form.divisionId || null,
    });
    creating.value = false;
    router.push({ name: 'meeting', params: { meetingId: data.meetingId } });
  } catch (error) {
    toast.error(error.response?.data?.message || 'Não deu para marcar a reunião.');
  }
}

function open(meetingId) {
  router.push({ name: 'meeting', params: { meetingId } });
}
</script>

<style scoped>
.mt__list { list-style: none; margin: 0; padding: 0; }

.mt__row {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--vc-border);
  border-radius: 10px;
  background: var(--vc-surface);
  margin-bottom: 8px;
  cursor: pointer;
}

.mt__row:hover { border-color: var(--vc-purple-border); }

.mt__when {
  display: flex;
  flex-direction: column;
  min-width: 96px;
  text-align: center;
  padding-right: 12px;
  border-right: 1px solid var(--vc-border);
}

.mt__main { flex: 1; min-width: 0; }

.mt__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
</style>
