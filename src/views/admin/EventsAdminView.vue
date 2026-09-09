<template>
  <main class="vc-page vc-page--wide">
    <div class="vc-stack">
      <div class="vc-row vc-row--between">
        <div>
          <h1 class="vc-title vc-title--underlined">Eventos e premiações</h1>
          <p class="vc-faint" style="margin: 6px 0 0">{{ auth.activeTenantName }}</p>
        </div>
        <button v-if="auth.can('EVENT_MANAGE')" class="vc-btn" type="button" @click="creating = true">
          <AppIcon name="plus" :size="15" />
          Novo evento
        </button>
      </div>

      <div class="vc-banner vc-banner--info">
        <AppIcon name="badge" :size="18" />
        <span>
          Cada participação e cada prêmio vira um <strong>badge</strong> no perfil da pessoa — e fica com
          ela mesmo depois de sair da equipe. Remover a participação ou o prêmio remove o badge.
        </span>
      </div>

      <EmptyState v-if="!loading && !list.length" title="Nenhum evento registrado ainda">
        <template v-if="auth.can('EVENT_MANAGE')">
          Registre a primeira competição, oficina ou ação social pelo botão acima — um evento antigo entra
          do mesmo jeito.
        </template>
        <template v-else>Quando a equipe registrar um evento, ele aparece aqui.</template>
      </EmptyState>

      <div v-if="list.length" class="vc-table-wrap">
        <table class="vc-table">
          <thead>
            <tr>
              <th>Evento</th><th>Tipo</th><th>Quando</th><th>Onde</th><th>Quem foi</th><th>Prêmios</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in list" :key="item.eventId"
                :class="['is-clickable', item.eventId === event?.eventId ? 'events__row--active' : '']"
                @click="open(item.eventId)">
              <td><strong>{{ item.name }}</strong></td>
              <td><span :class="['vc-chip', kindChip(item.kind)]">{{ item.kindLabel }}</span></td>
              <td>{{ formatRange(item.startDate, item.endDate) }}</td>
              <td>{{ item.location || '—' }}</td>
              <td class="events__count"><AppIcon name="users" :size="14" /> {{ item.participantCount }}</td>
              <td class="events__count"><AppIcon name="award" :size="14" /> {{ item.awardCount }}</td>
              <td style="text-align: right">
                <button class="vc-btn vc-btn--ghost vc-btn--small" type="button">Abrir</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ------------------------------------------------------ one event -->
      <template v-if="event">
        <div ref="detailRef" class="vc-stack">
          <SectionTitle lead="Evento" :title="event.name">
            <template #actions>
              <button v-if="event.canManage" class="vc-btn vc-btn--ghost vc-btn--small" type="button"
                      @click="editing = true">
                <AppIcon name="edit" :size="14" />
                Editar
              </button>
              <button v-if="event.canManage" class="vc-btn vc-btn--danger vc-btn--small" type="button"
                      @click="remove">
                <AppIcon name="trash" :size="14" />
                Excluir
              </button>
            </template>
          </SectionTitle>

          <div class="vc-card">
            <div class="vc-card__body">
              <div class="events__facts">
                <span :class="['vc-chip', kindChip(event.kind)]">{{ event.kindLabel }}</span>
                <span class="vc-chip">
                  <AppIcon name="calendar" :size="13" />
                  {{ formatRange(event.startDate, event.endDate) }}
                </span>
                <span v-if="event.location" class="vc-chip">
                  <AppIcon name="mapPin" :size="13" />
                  {{ event.location }}
                </span>
                <span class="vc-chip">
                  <AppIcon name="users" :size="13" />
                  {{ plural(event.participants.length, 'participante', 'participantes') }}
                </span>
                <span class="vc-chip">
                  <AppIcon name="award" :size="13" />
                  {{ plural(event.awards.length, 'prêmio', 'prêmios') }}
                </span>
              </div>
              <p v-if="event.description" class="events__description">{{ event.description }}</p>
              <p v-else class="vc-faint">Sem descrição.</p>
              <p v-if="event.createdBy" class="vc-faint vc-small" style="margin: 0">
                Registrado por {{ event.createdBy.name }} em {{ formatWhen(event.createdAt) }}
              </p>
            </div>
          </div>

          <EventParticipantsPanel :event="event" :can-manage="event.canManage" @changed="applyChange" />
          <EventAwardsPanel :event="event" :can-manage="event.canManage" @changed="applyChange" />
        </div>
      </template>
    </div>

    <!-- ------------------------------------------------------------ modals -->
    <EventFormModal v-if="creating" :tenant-id="auth.activeTenantId" @close="creating = false" @saved="onCreated" />
    <EventFormModal v-if="editing && event" :event="event" @close="editing = false" @saved="onEdited" />
  </main>
</template>

<script setup>
import { nextTick, onMounted, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import AppIcon from '@/components/AppIcon.vue';
import EmptyState from '@/components/EmptyState.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import EventAwardsPanel from '@/components/events/EventAwardsPanel.vue';
import EventFormModal from '@/components/events/EventFormModal.vue';
import EventParticipantsPanel from '@/components/events/EventParticipantsPanel.vue';
import { formatRange, kindChip } from '@/components/events/eventLabels.js';
import { authStore } from '@/store/auth.js';
import { events as eventsApi } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

/*
 * Where the team went, who went and what came back: the list of events, and one event open below
 * it with its participants and awards.
 *
 * Reading is the route's EVENT_VIEW; every write sits behind `auth.can('EVENT_MANAGE')` on the list
 * and behind `event.canManage` on the open event — the same answer, given by the server for that
 * event. The badges themselves live on the profile of each person; here they are only announced,
 * because the server generates and removes them with the rows.
 */
const auth = authStore();
const toast = useToast();

const list = ref([]);
const event = ref(null);
const loading = ref(true);
const creating = ref(false);
const editing = ref(false);
const detailRef = ref(null);

onMounted(load);
watch(() => auth.activeTenantId, () => {
  event.value = null;
  load();
});

async function load() {
  if (!auth.activeTenantId) return;
  loading.value = true;
  try {
    const { data } = await eventsApi.list(auth.activeTenantId);
    list.value = data;
    if (event.value && !data.some((item) => item.eventId === event.value.eventId)) {
      event.value = null;
    }
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar os eventos'));
  } finally {
    loading.value = false;
  }
}

async function open(eventId) {
  try {
    const { data } = await eventsApi.get(eventId);
    event.value = data;
    await nextTick();
    detailRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao abrir o evento'));
  }
}

/** A panel changed something: use the event it got back, or fetch it again, and refresh the counts. */
async function applyChange(detail) {
  if (detail) {
    event.value = detail;
  } else if (event.value) {
    try {
      const { data } = await eventsApi.get(event.value.eventId);
      event.value = data;
    } catch (error) {
      toast.error(apiMessage(error, 'Erro ao recarregar o evento'));
    }
  }
  await load();
}

async function onCreated(detail) {
  creating.value = false;
  event.value = detail;
  await load();
  await nextTick();
  detailRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function onEdited(detail) {
  editing.value = false;
  event.value = detail;
  await load();
}

async function remove() {
  const sure = window.confirm(
    `Excluir o evento "${event.value.name}"?\n\nIsso apaga também os badges gerados: a participação de cada pessoa e os prêmios deste evento somem dos perfis.`,
  );
  if (!sure) return;
  try {
    await eventsApi.remove(event.value.eventId);
    event.value = null;
    await load();
    toast.info('Evento excluído.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao excluir o evento'));
  }
}

/* ----------------------------------------------------------------- helpers */

function plural(total, one, many) {
  return `${total} ${total === 1 ? one : many}`;
}

function formatWhen(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
</script>

<style scoped>
.events__row--active td {
  background: var(--vc-purple-soft);
}

.events__count {
  white-space: nowrap;
}

.events__count svg {
  vertical-align: -2px;
  margin-right: 2px;
  color: var(--vc-text-muted);
}

.events__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.events__description {
  white-space: pre-line;
  color: var(--vc-text);
  font-size: 0.95rem;
}
</style>
