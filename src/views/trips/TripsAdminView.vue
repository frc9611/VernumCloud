<template>
  <main class="vc-page vc-page--wide">
    <div class="vc-stack">
      <div class="vc-row vc-row--between">
        <div>
          <h1 class="vc-title vc-title--underlined">Viagens</h1>
          <p class="vc-faint" style="margin: 6px 0 0">{{ auth.activeTenantName }}</p>
        </div>
        <button v-if="auth.can('TRIP_MANAGE')" class="vc-btn" type="button" @click="openNew">
          <AppIcon name="plus" :size="15" />
          Nova viagem
        </button>
      </div>

      <EmptyState v-if="!loading && !list.length" title="Nenhuma viagem ainda">
        <template v-if="auth.can('TRIP_MANAGE')">Crie a primeira pelo botão acima.</template>
        <template v-else>Quando a equipe organizar uma viagem, ela aparece aqui.</template>
      </EmptyState>

      <div v-if="list.length" class="vc-table-wrap">
        <table class="vc-table">
          <thead>
            <tr>
              <th>Viagem</th><th>Destino</th><th>Saída</th><th>Retorno</th>
              <th>Situação</th><th>Vão</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in list" :key="item.tripId"
                :class="['is-clickable', item.tripId === trip.tripId ? 'is-active' : '']"
                @click="open(item.tripId)">
              <td>
                <AppIcon :name="item.transportIcon" :size="15" />
                {{ item.title }}
              </td>
              <td>{{ item.destination }}</td>
              <td>{{ item.departureAt ? formatWhen(item.departureAt) : 'a definir' }}</td>
              <td>{{ formatWhen(item.returnAt) }}</td>
              <td><span :class="['vc-chip', statusChip(item.status)]">{{ item.statusLabel }}</span></td>
              <td>{{ item.goingCount }} / {{ item.answeredCount }}</td>
              <td style="text-align: right">
                <button class="vc-btn vc-btn--ghost vc-btn--small" type="button">Abrir</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ------------------------------------------------------- one trip -->
      <template v-if="trip.tripId">
        <SectionTitle lead="Viagem" :title="trip.title">
          <template #actions>
            <router-link class="vc-btn vc-btn--ghost vc-btn--small"
                         :to="{ name: 'trip', params: { id: trip.tripId } }">
              Ver como convidado
            </router-link>
            <button v-if="trip.canManage && trip.status !== 'CANCELLED'"
                    class="vc-btn vc-btn--outline vc-btn--small" type="button" @click="cancel">
              Cancelar viagem
            </button>
            <button v-if="trip.canManage" class="vc-btn vc-btn--danger vc-btn--small" type="button"
                    @click="remove">
              Excluir
            </button>
          </template>
        </SectionTitle>

        <div class="vc-split">
          <div class="vc-stack">
            <PanelCard title="Dados da viagem" icon="mapPin">
              <div class="vc-row">
                <div class="vc-field" style="flex: 1; min-width: 200px">
                  <label class="vc-label" for="title">Título do evento</label>
                  <input id="title" class="vc-input" type="text" maxlength="160" v-model="form.title"
                         :disabled="!trip.canManage" />
                </div>
                <div class="vc-field" style="flex: 1; min-width: 200px">
                  <label class="vc-label" for="destination">Destino</label>
                  <input id="destination" class="vc-input" type="text" maxlength="200"
                         v-model="form.destination" :disabled="!trip.canManage" />
                </div>
              </div>
              <div class="vc-row">
                <div class="vc-field">
                  <label class="vc-label" for="departure">Saída (deixe vazio se não definida)</label>
                  <input id="departure" class="vc-input" type="datetime-local" v-model="form.departureAt"
                         :disabled="!trip.canManage" />
                </div>
                <div class="vc-field">
                  <label class="vc-label" for="return">Retorno</label>
                  <input id="return" class="vc-input" type="datetime-local" v-model="form.returnAt"
                         :disabled="!trip.canManage" />
                </div>
                <div class="vc-field">
                  <label class="vc-label" for="transport">Transporte</label>
                  <select id="transport" class="vc-select" v-model="form.transport"
                          :disabled="!trip.canManage">
                    <option value="BUS">Ônibus</option>
                    <option value="CAR">Carro</option>
                    <option value="PLANE">Avião</option>
                  </select>
                </div>
                <div class="vc-field">
                  <label class="vc-label" for="status">Situação</label>
                  <select id="status" class="vc-select" v-model="form.status" :disabled="!trip.canManage">
                    <option value="OPEN">Aberta</option>
                    <option value="CLOSED">Fechada</option>
                  </select>
                </div>
              </div>
              <div class="vc-field">
                <label class="vc-label" for="description">Descrição</label>
                <textarea id="description" class="vc-textarea" rows="2" maxlength="1000"
                          v-model="form.description" :disabled="!trip.canManage"></textarea>
              </div>
              <template #footer>
                <span class="vc-spacer"></span>
                <button v-if="trip.canManage" class="vc-btn" type="button" @click="save">Salvar</button>
              </template>
            </PanelCard>

            <SectionTitle lead="Documentos" title="Pedidos">
              <template #actions>
                <button v-if="trip.canManage" class="vc-btn vc-btn--small" type="button"
                        @click="openDocument(null)">
                  Pedir documento
                </button>
              </template>
            </SectionTitle>
            <EmptyState v-if="!trip.documents.length" title="Nenhum documento pedido">
              Sem documento pedido, o convidado só responde se vai ou não.
            </EmptyState>
            <div v-for="document in trip.documents" :key="document.tripDocumentId" class="vc-trip-doc">
              <AppIcon name="file" :size="18" />
              <div class="vc-trip-doc__body">
                <p class="vc-trip-doc__name" style="margin: 0">
                  {{ document.name }}
                  <span v-if="document.required" class="vc-chip vc-chip--danger">obrigatório</span>
                  <span v-if="document.hasTemplate" class="vc-chip vc-chip--info">
                    modelo: {{ document.templateName }}
                  </span>
                </p>
                <p v-if="document.description" class="vc-faint" style="margin: 2px 0 0">
                  {{ document.description }}
                </p>
              </div>
              <div v-if="trip.canManage" class="vc-row" style="gap: 6px">
                <label class="vc-btn vc-btn--ghost vc-btn--small">
                  <AppIcon name="upload" :size="14" />
                  Modelo
                  <input type="file" style="display: none" @change="uploadTemplate(document, $event)" />
                </label>
                <button class="vc-btn vc-btn--ghost vc-btn--small" type="button"
                        @click="openPicker(document)">
                  Da nuvem
                </button>
                <button class="vc-btn vc-btn--ghost vc-btn--small" type="button"
                        @click="openDocument(document)">
                  Editar
                </button>
                <button class="vc-btn vc-btn--danger vc-btn--small" type="button"
                        @click="removeDocument(document)">
                  Remover
                </button>
              </div>
            </div>

            <SectionTitle lead="Quem" title="Respondeu" />
            <div class="vc-table-wrap">
              <table class="vc-table">
                <thead>
                  <tr><th>Pessoa</th><th>Resposta</th><th>Documentos</th><th>Observação</th></tr>
                </thead>
                <tbody>
                  <tr v-for="person in trip.people" :key="person.userId">
                    <td>
                      {{ person.userName }}
                      <span v-if="!person.stillInvited" class="vc-chip vc-chip--warning">
                        saiu da equipe
                      </span>
                    </td>
                    <td><span :class="['vc-chip', answerChip(person.answer)]">{{ person.answerLabel }}</span></td>
                    <td>
                      <span v-if="!person.submissions.length" class="vc-faint">nenhum</span>
                      <button v-for="submission in person.submissions" :key="submission.tripSubmissionId"
                              class="vc-chip vc-chip--button" type="button" style="margin-right: 4px"
                              @click="downloadSubmission(submission)">
                        <AppIcon name="download" :size="12" />
                        {{ submission.documentName }}
                      </button>
                    </td>
                    <td class="vc-faint">{{ person.note || '—' }}</td>
                  </tr>
                </tbody>
              </table>
              <EmptyState v-if="!trip.people.length" title="Ninguém convidado ainda">
                Convide uma equipe ou pessoas ao lado.
              </EmptyState>
            </div>
          </div>

          <!-- ------------------------------------------------- audience -->
          <div class="vc-stack">
            <PanelCard title="Público alvo" icon="users">
              <div v-for="invite in trip.invites" :key="invite.tripInviteId" class="vc-row vc-row--between"
                   style="padding: 4px 0">
                <span class="vc-chip" :class="invite.type === 'TENANT' ? 'vc-chip--purple' : ''">
                  <span v-if="invite.tenantColor" class="vc-dot"
                        :style="{ background: invite.tenantColor }"></span>
                  {{ invite.type === 'TENANT' ? invite.tenantName : invite.userName }}
                </span>
                <button v-if="trip.canManage" class="vc-btn vc-btn--ghost vc-btn--small vc-btn--icon"
                        type="button" title="Remover convite" @click="removeInvite(invite)">
                  <AppIcon name="close" :size="14" />
                </button>
              </div>
              <p v-if="!trip.invites.length" class="vc-faint" style="margin: 0">
                Ninguém convidado ainda.
              </p>

              <template v-if="trip.canManage">
                <div class="vc-divider" style="margin: 12px 0"></div>
                <div class="vc-field">
                  <label class="vc-label" for="team">Convidar uma equipe</label>
                  <select id="team" class="vc-select" v-model="newTeam">
                    <option value="">Escolha uma equipe que você administra</option>
                    <option v-for="team in administrated" :key="team.tenantId" :value="team.tenantId">
                      {{ team.visibleName }}
                    </option>
                  </select>
                </div>
                <button class="vc-btn vc-btn--outline vc-btn--block" type="button" :disabled="!newTeam"
                        @click="inviteTeam">
                  Convidar equipe
                </button>

                <div class="vc-field" style="margin-top: 12px">
                  <label class="vc-label" for="person">Convidar uma pessoa</label>
                  <select id="person" class="vc-select" v-model="newPerson">
                    <option value="">Escolha alguém da equipe</option>
                    <option v-for="member in members" :key="member.user.userId" :value="member.user.userId">
                      {{ member.user.name }}
                    </option>
                  </select>
                </div>
                <button class="vc-btn vc-btn--outline vc-btn--block" type="button" :disabled="!newPerson"
                        @click="invitePerson">
                  Convidar pessoa
                </button>
              </template>
            </PanelCard>

            <PanelCard title="Onde ficam os documentos" icon="plane" muted>
              <p class="vc-faint" style="margin: 0">
                Numa pasta da nuvem desta equipe, com o ícone de avião, restrita a quem organiza. Quem
                foi convidado envia pelo formulário e abre o próprio arquivo, mas não entra na pasta.
              </p>
            </PanelCard>
          </div>
        </div>
      </template>
    </div>

    <!-- ------------------------------------------------------------ modals -->
    <ModalDialog v-if="creating" title="Nova viagem" @close="creating = false">
      <div class="vc-field">
        <label class="vc-label" for="newTitle">Título do evento</label>
        <input id="newTitle" class="vc-input" type="text" maxlength="160" v-model="draft.title"
               placeholder="Regional de Brasília" />
      </div>
      <div class="vc-field">
        <label class="vc-label" for="newDestination">Destino</label>
        <input id="newDestination" class="vc-input" type="text" maxlength="200"
               v-model="draft.destination" placeholder="Brasília, DF" />
      </div>
      <div class="vc-row">
        <div class="vc-field">
          <label class="vc-label" for="newDeparture">Saída (opcional)</label>
          <input id="newDeparture" class="vc-input" type="datetime-local" v-model="draft.departureAt" />
        </div>
        <div class="vc-field">
          <label class="vc-label" for="newReturn">Retorno</label>
          <input id="newReturn" class="vc-input" type="datetime-local" v-model="draft.returnAt" />
        </div>
        <div class="vc-field">
          <label class="vc-label" for="newTransport">Transporte</label>
          <select id="newTransport" class="vc-select" v-model="draft.transport">
            <option value="BUS">Ônibus</option>
            <option value="CAR">Carro</option>
            <option value="PLANE">Avião</option>
          </select>
        </div>
      </div>
      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="creating = false">Cancelar</button>
        <button class="vc-btn" type="button"
                :disabled="!draft.title.trim() || !draft.destination.trim() || !draft.returnAt"
                @click="create">
          Criar viagem
        </button>
      </template>
    </ModalDialog>

    <ModalDialog v-if="editingDocument" title="Documento pedido" @close="editingDocument = null">
      <div class="vc-field">
        <label class="vc-label" for="docName">Nome</label>
        <input id="docName" class="vc-input" type="text" maxlength="160" v-model="documentDraft.name"
               placeholder="Autorização do responsável" />
      </div>
      <div class="vc-field">
        <label class="vc-label" for="docDescription">O que o convidado precisa saber</label>
        <textarea id="docDescription" class="vc-textarea" rows="2" maxlength="500"
                  v-model="documentDraft.description"></textarea>
      </div>
      <label class="vc-checkbox">
        <input type="checkbox" v-model="documentDraft.required" />
        Obrigatório
      </label>
      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="editingDocument = null">Cancelar</button>
        <button class="vc-btn" type="button" :disabled="!documentDraft.name.trim()" @click="saveDocument">
          Salvar
        </button>
      </template>
    </ModalDialog>

    <!-- Picking a template from the cloud: a copy is made, the original is never linked -->
    <ModalDialog v-if="picking" title="Escolher um modelo da nuvem" wide @close="picking = null">
      <nav class="vc-row" style="gap: 6px; flex-wrap: wrap">
        <button v-for="(crumb, index) in picker.path" :key="crumb.id"
                class="vc-chip vc-chip--button" type="button" @click="browse(crumb.id)">
          {{ index === 0 ? 'Geral' : crumb.name }}
        </button>
      </nav>
      <div class="vc-table-wrap" style="margin-top: 10px">
        <table class="vc-table">
          <tbody>
            <tr v-for="folder in picker.folders" :key="'f' + folder.id" class="is-clickable"
                @click="browse(folder.id)">
              <td><AppIcon :name="folder.icon || 'folder'" :size="16" /> {{ folder.name }}</td>
              <td style="text-align: right" class="vc-faint">pasta</td>
            </tr>
            <tr v-for="file in picker.files" :key="file.fileId" class="is-clickable"
                @click="chooseTemplate(file)">
              <td><AppIcon name="file" :size="16" /> {{ file.name }}</td>
              <td style="text-align: right" class="vc-faint">usar como modelo</td>
            </tr>
          </tbody>
        </table>
        <EmptyState v-if="!picker.folders.length && !picker.files.length" title="Pasta vazia">
          Nada aqui para usar como modelo.
        </EmptyState>
      </div>
      <p class="vc-faint" style="margin: 10px 0 0">
        O arquivo é <strong>copiado</strong> para a viagem. O original fica onde está e ninguém ganha
        acesso a ele.
      </p>
    </ModalDialog>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import AppIcon from '@/components/AppIcon.vue';
import EmptyState from '@/components/EmptyState.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import PanelCard from '@/components/PanelCard.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import { authStore } from '@/store/auth.js';
import { cloud, tenants as tenantsApi, trips as tripsApi } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

/*
 * Organising a trip: the event, the documents asked for, the audience, and who answered.
 *
 * The audience is the part that needs the server: a team can only be invited by somebody who
 * administrates it, and that is not a permission the dashboard holds — it reads it off the
 * memberships it already has, and the server refuses anything else.
 *
 * A template picked from the cloud is copied into the trip. The picker browses with the ordinary
 * cloud calls, so it can only show what this person already reaches.
 */
const auth = authStore();
const toast = useToast();

const list = ref([]);
const trip = ref({ documents: [], invites: [], people: [] });
const loading = ref(true);
const creating = ref(false);
const editingDocument = ref(null);
const picking = ref(null);
const members = ref([]);
const newTeam = ref('');
const newPerson = ref('');

const form = reactive({ title: '', destination: '', description: '', departureAt: '', returnAt: '', transport: 'BUS', status: 'OPEN' });
const draft = reactive({ title: '', destination: '', departureAt: '', returnAt: '', transport: 'BUS' });
const documentDraft = reactive({ tripDocumentId: null, name: '', description: '', required: true });
const picker = reactive({ path: [], folders: [], files: [] });

/** Teams this person administrates, which is exactly who they may invite. */
const administrated = computed(() =>
  auth.memberships
    .filter((membership) => ['OWNER', 'ADMIN'].includes(membership.role)
      || (membership.permissions || []).includes('TENANT_MANAGE'))
    .map((membership) => membership.tenant));

onMounted(load);
watch(() => auth.activeTenantId, load);

async function load() {
  if (!auth.activeTenantId) return;
  loading.value = true;
  try {
    const { data } = await tripsApi.list(auth.activeTenantId);
    list.value = data;
    if (trip.value.tripId && !data.some((item) => item.tripId === trip.value.tripId)) {
      trip.value = { documents: [], invites: [], people: [] };
    }
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar as viagens'));
  } finally {
    loading.value = false;
  }
}

async function open(tripId) {
  try {
    const { data } = await tripsApi.get(tripId);
    trip.value = data;
    Object.assign(form, {
      title: data.title,
      destination: data.destination,
      description: data.description || '',
      departureAt: toInput(data.departureAt),
      returnAt: toInput(data.returnAt),
      transport: data.transport,
      status: data.status === 'CANCELLED' ? 'CLOSED' : data.status,
    });
    if (!members.value.length && auth.can('MEMBER_VIEW')) {
      const answer = await tenantsApi.members(auth.activeTenantId);
      members.value = answer.data;
    }
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao abrir a viagem'));
  }
}

function openNew() {
  Object.assign(draft, { title: '', destination: '', departureAt: '', returnAt: '', transport: 'BUS' });
  creating.value = true;
}

async function create() {
  try {
    const { data } = await tripsApi.create(auth.activeTenantId, { ...draft });
    creating.value = false;
    await load();
    await open(data.tripId);
    toast.success('Viagem criada!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao criar a viagem'));
  }
}

async function save() {
  try {
    const { data } = await tripsApi.update(trip.value.tripId, { ...form });
    trip.value = data;
    await load();
    toast.success('Viagem salva!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao salvar a viagem'));
  }
}

async function cancel() {
  try {
    const { data } = await tripsApi.cancel(trip.value.tripId);
    trip.value = data;
    await load();
    toast.info('Viagem cancelada. Todo mundo convidado foi avisado.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao cancelar'));
  }
}

async function remove() {
  try {
    await tripsApi.remove(trip.value.tripId);
    trip.value = { documents: [], invites: [], people: [] };
    await load();
    toast.info('Viagem excluída.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao excluir'));
  }
}

/* ------------------------------------------------------------- documents */

function openDocument(document) {
  Object.assign(documentDraft, document
    ? { tripDocumentId: document.tripDocumentId, name: document.name, description: document.description || '', required: document.required }
    : { tripDocumentId: null, name: '', description: '', required: true });
  editingDocument.value = document || {};
}

async function saveDocument() {
  const body = {
    name: documentDraft.name,
    description: documentDraft.description,
    required: documentDraft.required,
  };
  try {
    if (documentDraft.tripDocumentId) {
      await tripsApi.updateDocument(trip.value.tripId, documentDraft.tripDocumentId, body);
    } else {
      await tripsApi.addDocument(trip.value.tripId, body);
    }
    editingDocument.value = null;
    await open(trip.value.tripId);
    toast.success('Documento salvo!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao salvar o documento'));
  }
}

async function removeDocument(document) {
  try {
    await tripsApi.removeDocument(trip.value.tripId, document.tripDocumentId);
    await open(trip.value.tripId);
    toast.info('Documento removido.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao remover o documento'));
  }
}

async function uploadTemplate(document, event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  try {
    await tripsApi.uploadTemplate(trip.value.tripId, document.tripDocumentId, file);
    await open(trip.value.tripId);
    toast.success('Modelo enviado!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao enviar o modelo'));
  }
}

/* --------------------------------------------------- template from the cloud */

async function openPicker(document) {
  picking.value = document;
  try {
    //root() answers the folder itself; the listing of what is inside comes from folder()
    const { data } = await cloud.root(auth.activeTenantId);
    await browse(data.id);
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao abrir a nuvem'));
    picking.value = null;
  }
}

async function browse(folderId) {
  try {
    const { data } = await cloud.folder(folderId);
    applyPicker(data);
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao abrir a pasta'));
  }
}

function applyPicker(data) {
  picker.path = data.path || [];
  picker.folders = (data.folders || []).filter((folder) => folder.access !== 'NONE');
  picker.files = (data.files || []).filter((file) => file.access !== 'NONE');
}

async function chooseTemplate(file) {
  try {
    await tripsApi.updateDocument(trip.value.tripId, picking.value.tripDocumentId, {
      name: picking.value.name,
      description: picking.value.description,
      required: picking.value.required,
      templateFileId: file.fileId,
    });
    picking.value = null;
    await open(trip.value.tripId);
    toast.success('Modelo copiado para a viagem!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao usar o arquivo como modelo'));
  }
}

/* ---------------------------------------------------------------- audience */

async function inviteTeam() {
  try {
    await tripsApi.invite(trip.value.tripId, { type: 'TENANT', tenantId: Number(newTeam.value) });
    newTeam.value = '';
    await open(trip.value.tripId);
    toast.success('Equipe convidada!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao convidar a equipe'));
  }
}

async function invitePerson() {
  try {
    await tripsApi.invite(trip.value.tripId, { type: 'USER', userId: newPerson.value });
    newPerson.value = '';
    await open(trip.value.tripId);
    toast.success('Pessoa convidada!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao convidar a pessoa'));
  }
}

async function removeInvite(invite) {
  try {
    await tripsApi.removeInvite(trip.value.tripId, invite.tripInviteId);
    await open(trip.value.tripId);
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao remover o convite'));
  }
}

async function downloadSubmission(submission) {
  try {
    const response = await tripsApi.downloadSubmission(trip.value.tripId, submission.tripSubmissionId);
    const contentType = response.headers['content-type'] || 'application/octet-stream';
    const url = window.URL.createObjectURL(new Blob([response.data], { type: contentType }));
    window.open(url, '_blank');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao abrir o documento'));
  }
}

/* ----------------------------------------------------------------- helpers */

/** yyyy-MM-ddTHH:mm, which is what a datetime-local holds and what the server parses. */
function toInput(value) {
  return value ? String(value).slice(0, 16) : '';
}

function formatWhen(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function statusChip(status) {
  if (status === 'OPEN') return 'vc-chip--success';
  if (status === 'CANCELLED') return 'vc-chip--danger';
  return 'vc-chip--warning';
}

function answerChip(answer) {
  if (answer === 'GOING') return 'vc-chip--success';
  if (answer === 'NOT_GOING') return 'vc-chip--danger';
  return 'vc-chip--warning';
}
</script>
