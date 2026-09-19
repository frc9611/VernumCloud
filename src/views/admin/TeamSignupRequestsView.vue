<template>
  <main class="vc-page vc-page--wide">
    <div class="vc-stack">
      <SectionTitle lead="Administração" title="Solicitações de equipe">
        <template #actions>
          <span v-if="pendingCount" class="vc-chip vc-chip--warning">{{ pendingCount }} em análise</span>
        </template>
      </SectionTitle>

      <p class="vc-muted" style="margin: 0">
        Equipes que se cadastraram pela página pública. Nenhuma existe até alguém aprovar aqui.
      </p>

      <div class="vc-tabs">
        <a v-for="tab in tabs" :key="tab.key" :class="['vc-tab', { 'is-active': filter === tab.key }]"
           href="#" @click.prevent="select(tab.key)">{{ tab.label }}</a>
      </div>

      <p v-if="loading" class="vc-faint">Carregando solicitações...</p>

      <EmptyState v-else-if="!requests.length" title="Nenhuma solicitação por aqui">
        Quando uma equipe se cadastrar pela página pública, o pedido aparece nesta lista.
      </EmptyState>

      <article v-for="request in requests" v-else :key="request.teamSignupRequestId" class="vc-card">
        <div class="vc-card__body">
          <div class="request">
            <div class="vc-stack" style="gap: 8px">
              <strong>
                {{ request.visibleName }}
                <span v-if="request.teamNumber" class="vc-faint">#{{ request.teamNumber }}</span>
              </strong>

              <div class="request__facts">
                <span :class="['vc-chip', chipFor(request)]">{{ request.statusLabel }}</span>
                <span v-if="request.competitionCategoryLabel" class="vc-chip">
                  {{ request.competitionCategoryLabel }}
                </span>
                <span v-if="request.roomName" class="vc-chip">{{ request.roomName }}</span>
                <span v-else-if="request.requestedRoomName" class="vc-chip vc-chip--info">
                  Sala nova: {{ request.requestedRoomName }}
                </span>
                <span v-if="request.featureProfile" class="vc-chip">{{ profileLabel(request) }}</span>
                <span class="vc-chip">{{ request.slug }}</span>
              </div>

              <p class="vc-small vc-muted" style="margin: 0">
                <PersonLink :user-id="request.requesterId" :name="request.requesterName" muted />
                · {{ request.requesterUsername }} · enviada em {{ formatDate(request.createdAt) }}
              </p>

              <p v-if="request.message" class="vc-small" style="margin: 0">“{{ request.message }}”</p>

              <p v-if="request.reviewNote" class="vc-small vc-muted" style="margin: 0">
                <strong>Observação:</strong> {{ request.reviewNote }}
                <template v-if="request.reviewedByName"> — {{ request.reviewedByName }}</template>
              </p>
            </div>

            <div class="vc-stack" style="gap: 6px">
              <button v-if="request.status === 'PENDING' && canDecide" class="vc-btn vc-btn--small"
                      type="button" @click="open(request)">
                Analisar
              </button>
              <router-link v-if="request.createdTenantId" class="vc-btn vc-btn--ghost vc-btn--small"
                           :to="{ name: 'adminTenants' }">
                Abrir a equipe
              </router-link>
              <router-link class="vc-btn vc-btn--ghost vc-btn--small"
                           :to="{ name: 'person', params: { id: request.requesterId } }">
                Ver a pessoa
              </router-link>
            </div>
          </div>
        </div>
      </article>
    </div>

    <!-- ------------------------------------------------------------------- decision -->
    <ModalDialog v-if="editing" wide :title="`Analisar solicitação — ${editing.visibleName}`"
                 @close="editing = null">
      <div class="vc-stack">
        <p class="vc-small vc-muted" style="margin: 0">
          Pedida por <strong>{{ editing.requesterName }}</strong> ({{ editing.requesterUsername }}).
          Aprovada, ela vira a proprietária da equipe.
        </p>

        <div v-if="editing.message" class="vc-callout">
          <strong>Recado de quem pediu</strong>
          <p style="margin: 4px 0 0">{{ editing.message }}</p>
        </div>

        <div class="request__pair">
          <div class="vc-field">
            <label class="vc-label" for="slug">Endereço da equipe</label>
            <input id="slug" v-model="decision.slug" class="vc-input" maxlength="60">
            <p class="vc-small vc-muted" style="margin: 6px 0 0">Nunca muda depois de criada.</p>
          </div>
          <div class="vc-field">
            <label class="vc-label" for="number">Número</label>
            <input id="number" v-model="decision.teamNumber" class="vc-input" maxlength="20">
          </div>
        </div>

        <div class="request__pair">
          <div class="vc-field">
            <label class="vc-label" for="cat">Competição</label>
            <select id="cat" v-model="decision.competitionCategory" class="vc-select">
              <option v-for="category in categories" :key="category.name" :value="category.name">
                {{ category.label }}
              </option>
            </select>
          </div>
          <div class="vc-field">
            <label class="vc-label" for="prof">Recursos</label>
            <select id="prof" v-model="decision.featureProfile" class="vc-select">
              <option value="">Tudo ligado</option>
              <option v-for="profile in profiles" :key="profile.name" :value="profile.name">
                {{ profile.label }}
              </option>
            </select>
          </div>
        </div>

        <div class="vc-field">
          <label class="vc-label" for="room">Sala</label>
          <select id="room" v-model="roomChoice" class="vc-select">
            <option v-if="editing.requestedRoomName" value="new">
              Criar "{{ editing.requestedRoomName }}"
            </option>
            <option v-for="room in rooms" :key="room.roomId" :value="String(room.roomId)">{{ room.name }}</option>
            <option value="none">Sem sala</option>
          </select>
          <p v-if="editing.requestedRoomName" class="vc-small vc-muted" style="margin: 6px 0 0">
            A equipe pediu uma sala nova. Escolher uma da lista deixa a sala pedida de lado.
          </p>
        </div>

        <div class="vc-field">
          <label class="vc-label" for="note">Observação</label>
          <textarea id="note" v-model="decision.note" class="vc-textarea" rows="3" maxlength="1000"
                    placeholder="O que a pessoa vai ler junto com a resposta."></textarea>
        </div>
      </div>

      <template #footer>
        <button class="vc-btn vc-btn--danger" type="button" :disabled="saving" @click="reject">Recusar</button>
        <span class="vc-spacer"></span>
        <button class="vc-btn vc-btn--ghost" type="button" @click="editing = null">Cancelar</button>
        <button class="vc-btn" type="button" :disabled="saving" @click="approve">
          {{ saving ? 'Salvando...' : 'Aprovar e criar a equipe' }}
        </button>
      </template>
    </ModalDialog>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useToast } from 'vue-toastification';
import SectionTitle from '@/components/SectionTitle.vue';
import EmptyState from '@/components/EmptyState.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import PersonLink from '@/components/PersonLink.vue';
import { catalogs, rooms as roomsApi, teamSignupRequests } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';
import { authStore } from '@/store/auth.js';

/*
 * The queue of teams asking to exist.
 *
 * Reading it is TENANT_VIEW_ALL, which is what the route asks for; deciding is TENANT_CREATE, and
 * that is why the buttons are hidden by `canDecide` rather than by the route: the read permission
 * is the weaker of the two, and a reviewer holding only it would press approve and get a 403.
 *
 * Every field of the decision starts filled with what was asked, because months may pass between a
 * request and its answer: the slug that was free then may be taken now, and the address of a team
 * is never patched silently.
 */
const auth = authStore();
const toast = useToast();

const tabs = [
  { key: 'PENDING', label: 'Em análise' },
  { key: 'APPROVED', label: 'Aprovadas' },
  { key: 'REJECTED', label: 'Recusadas' },
  { key: '', label: 'Todas' },
];

const loading = ref(true);
const saving = ref(false);
const filter = ref('PENDING');
const requests = ref([]);
const categories = ref([]);
const profiles = ref([]);
const rooms = ref([]);

const editing = ref(null);
const roomChoice = ref('none');
const decision = reactive({ slug: '', teamNumber: '', competitionCategory: '', featureProfile: '', note: '' });

const canDecide = computed(() => auth.canPlatform('TENANT_CREATE'));
const pendingCount = computed(() => requests.value.filter((item) => item.status === 'PENDING').length);

onMounted(async () => {
  await Promise.all([load(), loadCatalogs()]);
});

async function loadCatalogs() {
  try {
    const [categoryList, profileList, roomList] = await Promise.all([
      catalogs.competitionCategories(),
      catalogs.featureProfiles(),
      roomsApi.list(),
    ]);
    categories.value = categoryList.data;
    profiles.value = profileList.data.filter((profile) => profile.name !== 'CUSTOM');
    rooms.value = roomList.data;
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível carregar as listas.'));
  }
}

async function load() {
  loading.value = true;
  try {
    const { data } = await teamSignupRequests.list(filter.value || undefined);
    requests.value = data;
  } catch (error) {
    requests.value = [];
    toast.error(apiMessage(error, 'Não foi possível carregar as solicitações.'));
  } finally {
    loading.value = false;
  }
}

function select(key) {
  filter.value = key;
  load();
}

function open(request) {
  editing.value = request;
  decision.slug = request.slug || '';
  decision.teamNumber = request.teamNumber || '';
  decision.competitionCategory = request.competitionCategory || '';
  decision.featureProfile = request.featureProfile || '';
  decision.note = '';
  if (request.requestedRoomName) roomChoice.value = 'new';
  else if (request.roomId) roomChoice.value = String(request.roomId);
  else roomChoice.value = 'none';
}

/*
 * "new" leaves roomId out so the server creates (or joins) the room that was asked for; "none"
 * sends a zero, which is how the rest of the API says "no room".
 */
function roomBody() {
  if (roomChoice.value === 'new') return { roomName: editing.value.requestedRoomName };
  if (roomChoice.value === 'none') return { roomId: 0 };
  return { roomId: Number(roomChoice.value) };
}

async function approve() {
  saving.value = true;
  try {
    await teamSignupRequests.approve(editing.value.teamSignupRequestId, {
      note: decision.note || null,
      slug: decision.slug || null,
      teamNumber: decision.teamNumber || null,
      competitionCategory: decision.competitionCategory || null,
      featureProfile: decision.featureProfile || null,
      ...roomBody(),
    });
    toast.success('Equipe criada.');
    editing.value = null;
    await Promise.all([load(), auth.loadMe()]);
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível aprovar a solicitação.'));
  } finally {
    saving.value = false;
  }
}

async function reject() {
  if (!decision.note) {
    toast.error('Escreva uma observação: é o que a pessoa vai ler.');
    return;
  }
  saving.value = true;
  try {
    await teamSignupRequests.reject(editing.value.teamSignupRequestId, { note: decision.note });
    toast.success('Solicitação recusada.');
    editing.value = null;
    await load();
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível recusar a solicitação.'));
  } finally {
    saving.value = false;
  }
}

function chipFor(request) {
  if (request.status === 'APPROVED') return 'vc-chip--success';
  if (request.status === 'REJECTED') return 'vc-chip--danger';
  return 'vc-chip--warning';
}

function profileLabel(request) {
  const found = profiles.value.find((profile) => profile.name === request.featureProfile);
  return found ? found.label : request.featureProfile;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('pt-BR');
}
</script>

<style scoped>
.request {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: start;
}

.request__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.request__pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 620px) {
  .request,
  .request__pair {
    grid-template-columns: 1fr;
  }
}
</style>
