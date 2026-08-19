<template>
  <main class="vc-page vc-page--wide">
    <TabBar v-model="tab" :tabs="tabs">
      <template #context>
        <span class="vc-chip vc-chip--purple">{{ auth.activeTenantName }}</span>
        <span v-if="content.access" class="vc-chip">{{ accessLabel(content.access) }}</span>
      </template>
    </TabBar>

    <!-- ------------------------------------------------------ access denied -->
    <div v-if="content.denied" class="vc-stack">
      <AlertBanner variant="warning" icon="🔒" :title="'Sem acesso a ' + (content.folder?.name || 'esta pasta')"
                   aside="Você pode solicitar acesso">
        Esta pasta existe, mas ainda não foi liberada para você.
      </AlertBanner>

      <PanelCard title="Solicitar acesso" icon="🔐">
        <p v-if="content.myAccessRequest">
          Seu pedido está <strong>{{ content.myAccessRequest.statusLabel }}</strong> desde
          {{ formatWhen(content.myAccessRequest.createdAt) }}. Quem pode liberar já foi notificado.
        </p>
        <template v-else>
          <div class="vc-field">
            <label class="vc-label" for="requestLevel">Nível desejado</label>
            <select id="requestLevel" class="vc-select" v-model="accessRequest.requestedLevel">
              <option value="VIEW">Ver e baixar</option>
              <option value="EDIT">Ver, enviar e alterar</option>
            </select>
          </div>
          <div class="vc-field">
            <label class="vc-label" for="requestMessage">Mensagem</label>
            <textarea id="requestMessage" class="vc-textarea" v-model="accessRequest.message"
                      placeholder="Explique por que precisa deste acesso."></textarea>
          </div>
          <button class="vc-btn" type="button" @click="requestAccess">Enviar pedido</button>
        </template>
      </PanelCard>

      <div class="vc-row">
        <button class="vc-btn vc-btn--ghost" type="button" @click="goUp">Voltar</button>
        <router-link class="vc-btn vc-btn--ghost" :to="{ name: 'cloud' }">Ir para a raiz da equipe</router-link>
      </div>
    </div>

    <!-- -------------------------------------------------------- file manager -->
    <div v-else class="vc-stack">
      <!-- breadcrumb + actions -->
      <div class="vc-row vc-row--between">
        <nav class="cloud__path">
          <template v-for="(item, index) in content.path || []" :key="item.id">
            <router-link :to="{ name: 'cloudFolder', params: { id: item.id } }" class="cloud__crumb">
              {{ index === 0 ? '🏠 ' + item.name : item.name }}
            </router-link>
            <span v-if="index < (content.path || []).length - 1" class="cloud__sep">/</span>
          </template>
        </nav>

        <div class="vc-row">
          <router-link class="vc-btn vc-btn--ghost vc-btn--small" :to="{ name: 'sharedWithMe' }">
            Compartilhados comigo
          </router-link>
          <router-link class="vc-btn vc-btn--ghost vc-btn--small" :to="{ name: 'accessRequests' }">
            Pedidos de acesso
          </router-link>
        </div>
      </div>

      <div class="vc-row">
        <label v-if="content.canUpload" class="vc-btn">
          Enviar arquivo
          <input type="file" style="display: none" @change="upload" />
        </label>
        <form v-if="content.canUpload" class="vc-row" style="gap: 6px" @submit.prevent="createFolder">
          <input class="vc-input" style="min-width: 220px" type="text" v-model="newFolderName"
                 placeholder="Nome da nova pasta..." required />
          <button class="vc-btn vc-btn--outline" type="submit">+ Criar pasta</button>
        </form>
        <span class="vc-spacer"></span>
        <button v-if="content.canManage && !isRoot" class="vc-btn vc-btn--ghost vc-btn--small"
                type="button" @click="openFolderSettings">
          Configurar pasta
        </button>
        <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="openComments('folder', content.folder)">
          Comentários
        </button>
      </div>

      <div v-if="uploading" class="vc-banner vc-banner--info">
        Enviando arquivo... {{ uploadProgress }}%
      </div>

      <!-- content grid -->
      <div class="cloud__grid">
        <button v-if="!isRoot" type="button" class="cloud__item cloud__item--back" @click="goUp">
          <span class="cloud__icon">↩</span>
          <span class="cloud__name">Voltar</span>
        </button>

        <div
          v-for="folder in content.folders || []"
          :key="'folder-' + folder.id"
          :class="['cloud__item', folder.access === 'NONE' ? 'is-locked' : '']"
        >
          <button type="button" class="cloud__open" @click="openFolder(folder)">
            <span class="cloud__icon">{{ folder.access === 'NONE' ? '🔒' : '📁' }}</span>
            <span class="cloud__name">{{ folder.name }}</span>
            <span v-if="folder.visibility === 'RESTRICTED'" class="vc-chip vc-chip--warning">restrita</span>
            <span v-else-if="folder.access === 'NONE'" class="vc-chip">sem acesso</span>
          </button>
          <div class="cloud__actions">
            <button v-if="canManageItem(folder)" class="cloud__action" type="button" @click="openShares('folder', folder)">
              Compartilhar
            </button>
            <button v-if="canManageItem(folder)" class="cloud__action" type="button" @click="openItemSettings('folder', folder)">
              Editar
            </button>
            <button v-if="canManageItem(folder)" class="cloud__action is-danger" type="button" @click="removeFolder(folder)">
              Deletar
            </button>
            <button v-if="folder.access === 'NONE'" class="cloud__action" type="button" @click="openFolder(folder)">
              Solicitar
            </button>
          </div>
        </div>

        <div
          v-for="file in content.files || []"
          :key="'file-' + file.fileId"
          :class="['cloud__item', file.access === 'NONE' ? 'is-locked' : '']"
        >
          <button type="button" class="cloud__open" @click="openFile(file)">
            <span class="cloud__icon">{{ file.access === 'NONE' ? '🔒' : '📄' }}</span>
            <span class="cloud__name">{{ file.name }}</span>
            <span v-if="file.sizeBytes" class="vc-faint">{{ formatSize(file.sizeBytes) }}</span>
            <span v-else-if="file.access === 'NONE'" class="vc-chip">sem acesso</span>
          </button>
          <div class="cloud__actions">
            <button class="cloud__action" type="button" @click="openComments('file', file)">Comentar</button>
            <button v-if="canManageItem(file)" class="cloud__action" type="button" @click="openShares('file', file)">
              Compartilhar
            </button>
            <button v-if="canManageItem(file)" class="cloud__action" type="button" @click="openItemSettings('file', file)">
              Editar
            </button>
            <button v-if="canEditItem(file)" class="cloud__action is-danger" type="button" @click="removeFile(file)">
              Deletar
            </button>
          </div>
        </div>
      </div>

      <EmptyState v-if="isEmpty" title="Pasta vazia">
        Envie um arquivo ou crie uma pasta para começar.
      </EmptyState>
    </div>

    <!-- ------------------------------------------------------------ shares -->
    <ModalDialog v-if="sharing" wide :title="'Compartilhar ' + sharing.item.name" @close="sharing = null">
      <div class="vc-table-wrap" v-if="shares.length">
        <table class="vc-table">
          <thead><tr><th>Para</th><th>Nível</th><th>Origem</th><th></th></tr></thead>
          <tbody>
            <tr v-for="share in shares" :key="share.shareId">
              <td>
                {{ share.granteeUserName || share.granteeDivisionName || share.granteeTenantName }}
                <span class="vc-faint">({{ granteeLabel(share.granteeType) }})</span>
              </td>
              <td>{{ accessLabel(share.accessLevel) }}</td>
              <td>
                <span v-if="share.external" class="vc-chip vc-chip--warning">externo</span>
                <span v-else class="vc-chip">interno</span>
              </td>
              <td style="text-align: right">
                <button class="vc-btn vc-btn--danger vc-btn--small" type="button" @click="removeShare(share)">
                  Remover
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="vc-faint" style="margin: 0">Nenhum compartilhamento explícito ainda.</p>

      <hr class="vc-divider" />

      <div class="vc-field">
        <label class="vc-label" for="granteeType">Compartilhar com</label>
        <select id="granteeType" class="vc-select" v-model="newShare.granteeType">
          <option value="USER">Uma pessoa</option>
          <option value="DIVISION">Uma divisão (e suas subdivisões)</option>
          <option value="TENANT">Uma equipe inteira</option>
        </select>
      </div>

      <div v-if="newShare.granteeType === 'USER'" class="vc-field">
        <label class="vc-label" for="granteeUsername">Usuário</label>
        <input id="granteeUsername" class="vc-input" type="text" v-model="newShare.granteeUsername"
               placeholder="username da pessoa" />
        <span class="vc-faint">Pode ser alguém de outra equipe: aí é um compartilhamento externo.</span>
      </div>

      <div v-else-if="newShare.granteeType === 'DIVISION'" class="vc-field">
        <label class="vc-label" for="granteeDivision">Divisão</label>
        <select id="granteeDivision" class="vc-select" v-model="newShare.granteeDivisionId">
          <option :value="null">Escolha uma divisão</option>
          <option v-for="division in divisionList" :key="division.divisionId" :value="division.divisionId">
            {{ division.visibleName }}
          </option>
        </select>
      </div>

      <div v-else class="vc-field">
        <label class="vc-label" for="granteeTenant">Equipe</label>
        <select id="granteeTenant" class="vc-select" v-model="newShare.granteeTenantId">
          <option :value="null">Escolha uma equipe</option>
          <option v-for="tenant in tenantList" :key="tenant.tenantId" :value="tenant.tenantId">
            {{ tenant.visibleName }}
          </option>
        </select>
      </div>

      <div class="vc-field">
        <label class="vc-label" for="accessLevel">Nível de acesso</label>
        <select id="accessLevel" class="vc-select" v-model="newShare.accessLevel">
          <option value="VIEW">Ver e baixar</option>
          <option value="EDIT">Ver, enviar e alterar</option>
          <option value="MANAGE">Gerenciar e compartilhar</option>
        </select>
      </div>

      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="sharing = null">Fechar</button>
        <button class="vc-btn" type="button" @click="addShare">Compartilhar</button>
      </template>
    </ModalDialog>

    <!-- ---------------------------------------------------------- settings -->
    <ModalDialog v-if="settings" :title="'Configurar ' + settings.item.name" @close="settings = null">
      <div class="vc-field">
        <label class="vc-label" for="itemName">Nome</label>
        <input id="itemName" class="vc-input" type="text" v-model="settingsForm.name" />
      </div>
      <div v-if="settings.kind === 'folder'" class="vc-field">
        <label class="vc-label" for="visibility">Quem alcança esta pasta</label>
        <select id="visibility" class="vc-select" v-model="settingsForm.visibility">
          <option value="INHERIT">Herdar da pasta acima</option>
          <option value="TENANT">Toda a equipe</option>
          <option value="RESTRICTED">Somente quem eu compartilhar</option>
        </select>
      </div>
      <label class="vc-checkbox">
        <input type="checkbox" v-model="settingsForm.hiddenTitle" />
        <span>
          Esconder o nome de quem não tem acesso
          <span class="vc-faint" style="display: block">
            Quem não pode abrir vê "[redacted]" em vez do nome.
          </span>
        </span>
      </label>
      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="settings = null">Cancelar</button>
        <button class="vc-btn" type="button" @click="saveSettings">Salvar</button>
      </template>
    </ModalDialog>

    <!-- ---------------------------------------------------------- comments -->
    <ModalDialog v-if="commenting" :title="'Comentários de ' + commenting.item.name" @close="commenting = null">
      <p v-if="!comments.length" class="vc-faint" style="margin: 0">Nenhum comentário ainda.</p>
      <article v-for="comment in comments" :key="comment.commentId" class="cloud__comment">
        <div class="vc-row vc-row--between">
          <strong class="vc-small">{{ comment.authorName }}</strong>
          <span class="vc-faint">{{ formatWhen(comment.createdAt) }}</span>
        </div>
        <p style="margin: 4px 0 0">{{ comment.content }}</p>
        <button v-if="comment.authorId === auth.getId" class="vc-btn vc-btn--ghost vc-btn--small"
                style="margin-top: 6px" type="button" @click="removeComment(comment)">
          Remover
        </button>
      </article>

      <hr class="vc-divider" />
      <div class="vc-field">
        <label class="vc-label" for="newComment">Novo comentário</label>
        <textarea id="newComment" class="vc-textarea" v-model="newComment"
                  placeholder="Escreva algo sobre este item."></textarea>
      </div>
      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="commenting = null">Fechar</button>
        <button class="vc-btn" type="button" :disabled="!newComment.trim()" @click="addComment">Comentar</button>
      </template>
    </ModalDialog>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import TabBar from '@/components/TabBar.vue';
import AlertBanner from '@/components/AlertBanner.vue';
import PanelCard from '@/components/PanelCard.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import EmptyState from '@/components/EmptyState.vue';
import { authStore } from '@/store/auth.js';
import { cloud, divisions, tenants } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

/*
 * The file manager.
 *
 * Items the user cannot open still appear on the grid, locked, because the server sends
 * them with access NONE. Opening one lands on the "solicitar acesso" screen instead of
 * an error, which is what the denied branch of the template draws.
 */
const auth = authStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const tab = ref('files');
const tabs = [
  { key: 'files', label: 'Arquivos' },
  { key: 'shared', label: 'Compartilhados comigo', to: { name: 'sharedWithMe' } },
  { key: 'requests', label: 'Pedidos de acesso', to: { name: 'accessRequests' } },
];

const content = ref({});
const newFolderName = ref('');
const uploading = ref(false);
const uploadProgress = ref(0);

const accessRequest = reactive({ message: '', requestedLevel: 'VIEW' });

const sharing = ref(null);
const shares = ref([]);
const divisionList = ref([]);
const tenantList = ref([]);
const newShare = reactive({
  granteeType: 'USER', granteeUsername: '', granteeDivisionId: null,
  granteeTenantId: null, accessLevel: 'VIEW',
});

const settings = ref(null);
const settingsForm = reactive({ name: '', visibility: 'INHERIT', hiddenTitle: false });

const commenting = ref(null);
const comments = ref([]);
const newComment = ref('');

const isRoot = computed(() => !content.value.folder?.parentId);
const isEmpty = computed(
  () => !content.value.denied && !(content.value.folders || []).length && !(content.value.files || []).length,
);

onMounted(load);
watch(() => route.params.id, load);
watch(() => auth.activeTenantId, () => {
  if (route.name === 'cloud') load();
  else router.push({ name: 'cloud' });
});

async function load() {
  try {
    const folderId = route.params.id || (await rootId());
    if (!folderId) return;
    if (!route.params.id) {
      router.replace({ name: 'cloudFolder', params: { id: folderId } });
      return;
    }
    const { data } = await cloud.folder(folderId);
    content.value = data;
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao abrir a pasta'));
    content.value = {};
  }
}

/** Root folder of the team currently open, used when no folder is on the URL. */
async function rootId() {
  if (!auth.activeTenantId) return null;
  try {
    const { data } = await cloud.root(auth.activeTenantId);
    return data.id;
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao abrir os arquivos da equipe'));
    return null;
  }
}

function openFolder(folder) {
  router.push({ name: 'cloudFolder', params: { id: folder.id } });
}

function goUp() {
  const parentId = content.value.folder?.parentId;
  if (parentId) {
    router.push({ name: 'cloudFolder', params: { id: parentId } });
  } else {
    router.push({ name: 'cloud' });
  }
}

async function createFolder() {
  try {
    await cloud.createFolder({ name: newFolderName.value, parentFolderId: content.value.folder.id });
    newFolderName.value = '';
    await load();
    toast.success('Pasta criada!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao criar pasta'));
  }
}

async function removeFolder(folder) {
  if (!window.confirm('Remover a pasta ' + folder.name + ' e tudo dentro dela?')) return;
  try {
    await cloud.removeFolder(folder.id);
    await load();
    toast.info('Pasta removida.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao remover pasta'));
  }
}

async function upload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  uploading.value = true;
  uploadProgress.value = 0;
  try {
    await cloud.upload(content.value.folder.id, file, (progress) => {
      if (progress.total) {
        uploadProgress.value = Math.round((progress.loaded / progress.total) * 100);
      }
    });
    await load();
    toast.success('Upload concluído!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao enviar arquivo'));
  } finally {
    uploading.value = false;
    event.target.value = '';
  }
}

async function openFile(file) {
  if (file.access === 'NONE') {
    await requestFileAccess(file);
    return;
  }
  toast.info('Solicitando o arquivo ao servidor...');
  try {
    const response = await cloud.download(file.fileId);
    const contentType = response.headers['content-type'] || 'application/octet-stream';
    const url = window.URL.createObjectURL(new Blob([response.data], { type: contentType }));

    const openable = ['image/', 'application/pdf', 'video/', 'audio/', 'text/'];
    if (openable.some((prefix) => contentType.startsWith(prefix))) {
      window.open(url, '_blank');
      return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.download = file.originalName || file.name || 'arquivo';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao baixar arquivo'));
  }
}

async function removeFile(file) {
  if (!window.confirm('Remover o arquivo ' + file.name + '?')) return;
  try {
    await cloud.removeFile(file.fileId);
    await load();
    toast.info('Arquivo removido.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao remover arquivo'));
  }
}

/* ------------------------------------------------------------ access requests */

async function requestAccess() {
  try {
    await cloud.requestFolderAccess(content.value.folder.id, { ...accessRequest });
    await load();
    toast.success('Pedido enviado! Quem pode liberar foi notificado.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao enviar pedido'));
  }
}

async function requestFileAccess(file) {
  try {
    await cloud.requestFileAccess(file.fileId, { requestedLevel: 'VIEW' });
    toast.success('Pedido de acesso enviado!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao enviar pedido'));
  }
}

/* -------------------------------------------------------------------- shares */

function canManageItem(item) {
  return item.access === 'MANAGE';
}

function canEditItem(item) {
  return item.access === 'MANAGE' || item.access === 'EDIT';
}

async function openShares(kind, item) {
  sharing.value = { kind, item };
  Object.assign(newShare, {
    granteeType: 'USER', granteeUsername: '', granteeDivisionId: null,
    granteeTenantId: null, accessLevel: 'VIEW',
  });
  await Promise.all([loadShares(), loadShareTargets()]);
}

async function loadShares() {
  try {
    const { data } = sharing.value.kind === 'folder'
      ? await cloud.folderShares(sharing.value.item.id)
      : await cloud.fileShares(sharing.value.item.fileId);
    shares.value = data;
  } catch (error) {
    shares.value = [];
  }
}

async function loadShareTargets() {
  try {
    const { data } = await divisions.list(auth.activeTenantId);
    divisionList.value = data;
  } catch (error) {
    divisionList.value = [];
  }
  try {
    const { data } = await tenants.list();
    tenantList.value = data;
  } catch (error) {
    tenantList.value = [];
  }
}

async function addShare() {
  try {
    const body = { ...newShare };
    if (sharing.value.kind === 'folder') {
      await cloud.shareFolder(sharing.value.item.id, body);
    } else {
      await cloud.shareFile(sharing.value.item.fileId, body);
    }
    await loadShares();
    toast.success('Compartilhado!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao compartilhar'));
  }
}

async function removeShare(share) {
  try {
    await cloud.removeShare(share.shareId);
    await loadShares();
    toast.info('Compartilhamento removido.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao remover compartilhamento'));
  }
}

/* ------------------------------------------------------------------ settings */

function openFolderSettings() {
  openItemSettings('folder', content.value.folder);
}

function openItemSettings(kind, item) {
  settings.value = { kind, item };
  settingsForm.name = item.name;
  settingsForm.visibility = item.visibility || 'INHERIT';
  settingsForm.hiddenTitle = !!item.hiddenTitle;
}

async function saveSettings() {
  try {
    if (settings.value.kind === 'folder') {
      await cloud.updateFolder(settings.value.item.id, {
        name: settingsForm.name,
        visibility: settingsForm.visibility,
        hiddenTitle: settingsForm.hiddenTitle,
      });
    } else {
      await cloud.updateFile(settings.value.item.fileId, {
        name: settingsForm.name,
        hiddenTitle: settingsForm.hiddenTitle,
      });
    }
    settings.value = null;
    await load();
    toast.success('Alterações salvas!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao salvar alterações'));
  }
}

/* ------------------------------------------------------------------ comments */

async function openComments(kind, item) {
  if (!item) return;
  commenting.value = { kind, item };
  newComment.value = '';
  await loadComments();
}

async function loadComments() {
  try {
    const { data } = commenting.value.kind === 'folder'
      ? await cloud.folderComments(commenting.value.item.id)
      : await cloud.fileComments(commenting.value.item.fileId);
    comments.value = data;
  } catch (error) {
    comments.value = [];
  }
}

async function addComment() {
  try {
    if (commenting.value.kind === 'folder') {
      await cloud.commentFolder(commenting.value.item.id, newComment.value);
    } else {
      await cloud.commentFile(commenting.value.item.fileId, newComment.value);
    }
    newComment.value = '';
    await loadComments();
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao comentar'));
  }
}

async function removeComment(comment) {
  try {
    await cloud.removeComment(comment.commentId);
    await loadComments();
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao remover comentário'));
  }
}

/* -------------------------------------------------------------------- labels */

function accessLabel(level) {
  return {
    NONE: 'Sem acesso',
    VIEW: 'Ver e baixar',
    EDIT: 'Ver, enviar e alterar',
    MANAGE: 'Gerenciar e compartilhar',
  }[level] || level;
}

function granteeLabel(type) {
  return { USER: 'pessoa', DIVISION: 'divisão', TENANT: 'equipe' }[type] || type;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

function formatWhen(value) {
  return value ? new Date(value).toLocaleString('pt-BR') : '';
}
</script>

<style scoped>
.cloud__path {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 0.9rem;
}

.cloud__crumb {
  color: var(--vc-text-muted);
  text-decoration: none;
}

.cloud__crumb:hover {
  color: var(--vc-purple-strong);
  text-decoration: underline;
}

.cloud__crumb:last-of-type {
  color: var(--vc-text);
  font-weight: 600;
}

.cloud__sep {
  color: var(--vc-border-strong);
}

.cloud__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 12px;
}

.cloud__item {
  background: var(--vc-surface);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius);
  box-shadow: var(--vc-shadow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: border-color 0.12s ease, box-shadow 0.12s ease;
}

.cloud__item:hover {
  border-color: var(--vc-purple-border);
  box-shadow: var(--vc-shadow-lg);
}

.cloud__item.is-locked {
  background: var(--vc-surface-muted);
  border-style: dashed;
}

.cloud__item--back {
  cursor: pointer;
  align-items: center;
  justify-content: center;
  padding: 20px 10px;
  border-style: dashed;
  font: inherit;
  color: var(--vc-text-muted);
}

.cloud__open {
  border: none;
  background: none;
  font: inherit;
  cursor: pointer;
  padding: 18px 12px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
  width: 100%;
}

.cloud__icon {
  font-size: 26px;
  line-height: 1;
}

.cloud__name {
  font-size: 0.9rem;
  font-weight: 500;
  word-break: break-word;
}

.cloud__actions {
  display: flex;
  border-top: 1px solid var(--vc-border);
}

.cloud__action {
  flex: 1;
  border: none;
  background: none;
  font: inherit;
  font-size: 0.74rem;
  padding: 6px 2px;
  cursor: pointer;
  color: var(--vc-text-muted);
  border-right: 1px solid var(--vc-border);
}

.cloud__action:last-child {
  border-right: none;
}

.cloud__action:hover {
  background: var(--vc-purple-soft);
  color: var(--vc-purple-strong);
}

.cloud__action.is-danger:hover {
  background: var(--vc-danger-bg);
  color: var(--vc-danger-text);
}

.cloud__comment {
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius);
  padding: 10px 12px;
  background: var(--vc-surface);
}
</style>
