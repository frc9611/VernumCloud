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
      <AlertBanner variant="warning" icon="lock" :title="'Sem acesso a ' + (content.folder?.name || 'esta pasta')"
                   aside="Você pode solicitar acesso">
        Esta pasta existe, mas ainda não foi liberada para você.
      </AlertBanner>

      <PanelCard title="Solicitar acesso" icon="key">
        <p v-if="content.myAccessRequest">
          Seu pedido está <strong>{{ content.myAccessRequest.statusLabel }}</strong> desde
          {{ formatDateTime(content.myAccessRequest.createdAt) }}. Quem pode liberar já foi notificado.
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
      <!-- path + view mode -->
      <div class="vc-row">
        <button v-if="!isRoot" class="vc-btn vc-btn--ghost vc-btn--small" type="button"
                title="Pasta acima" @click="goUp">
          <AppIcon name="back" :size="15" />
        </button>

        <nav class="cloud__path">
          <template v-for="(item, index) in content.path || []" :key="item.id">
            <button
              type="button"
              :class="['cloud__crumb', index === (content.path || []).length - 1 ? 'is-current' : '',
                       dropCrumbId === item.id ? 'is-drop' : '']"
              @click="openFolderId(item.id)"
              @dragover="onCrumbDragOver($event, item)"
              @dragleave="dropCrumbId = null"
              @drop="onCrumbDrop($event, item)"
            >
              <AppIcon v-if="index === 0" name="home" :size="14" />
              {{ item.name }}
            </button>
            <AppIcon v-if="index < (content.path || []).length - 1" name="chevronRight" :size="13"
                     class="cloud__sep" />
          </template>
        </nav>

        <span class="vc-spacer"></span>

        <div class="cloud__modes">
          <button type="button" :class="['cloud__mode', view === 'grid' ? 'is-on' : '']"
                  title="Ver em grade" @click="setView('grid')">
            <AppIcon name="grip" :size="15" />
          </button>
          <button type="button" :class="['cloud__mode', view === 'list' ? 'is-on' : '']"
                  title="Ver em lista" @click="setView('list')">
            <AppIcon name="menu" :size="15" />
          </button>
        </div>
      </div>

      <!-- actions -->
      <div class="vc-row">
        <label v-if="content.canUpload" class="vc-btn">
          <AppIcon name="upload" :size="16" />
          Enviar arquivos
          <input type="file" multiple style="display: none" @change="pickFiles" />
        </label>
        <button v-if="content.canUpload" class="vc-btn vc-btn--outline" type="button" @click="startNewFolder">
          <AppIcon name="plus" :size="15" />
          Nova pasta
        </button>
        <button v-if="content.canUpload" class="vc-btn vc-btn--outline" type="button" @click="newTextFile">
          <AppIcon name="file" :size="15" />
          Novo texto
        </button>

        <span class="vc-spacer"></span>

        <div class="vc-input-group cloud__search">
          <AppIcon name="search" :size="15" />
          <input class="vc-input" type="search" v-model="search" placeholder="Buscar nesta pasta..." />
        </div>
        <select class="vc-select cloud__sort" v-model="sort.key" aria-label="Ordenar por">
          <option value="name">Nome</option>
          <option value="date">Data</option>
          <option value="size">Tamanho</option>
        </select>
        <button class="vc-btn vc-btn--ghost vc-btn--small" type="button"
                :title="sort.dir === 'asc' ? 'Crescente' : 'Decrescente'" @click="toggleDirection">
          <AppIcon :name="sort.dir === 'asc' ? 'chevronUp' : 'chevronDown'" :size="15" />
        </button>
        <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="trashOpen = true">
          <AppIcon name="trash" :size="15" />
          Lixeira
          <span v-if="trash.length" class="vc-badge vc-badge--purple">{{ trash.length }}</span>
        </button>
      </div>

      <!-- what is about to be deleted, while it can still come back -->
      <AlertBanner v-if="pendingTrash.length" variant="warning" icon="trash"
                   :title="pendingTrash.length + ' item(ns) indo para a lixeira'"
                   :aside="undoSeconds + ' s'">
        <button class="vc-chip vc-chip--button" type="button" @click="restoreAll">Desfazer</button>
        <button class="vc-chip vc-chip--button" type="button" @click="trashOpen = true">Ver lixeira</button>
      </AlertBanner>

      <!-- what is going up -->
      <div v-if="uploads.length" class="cloud__uploads">
        <div class="vc-row vc-row--between">
          <strong class="vc-small">Enviando</strong>
          <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="uploads = []">Limpar</button>
        </div>
        <div v-for="row in uploads" :key="row.id" class="cloud__upload">
          <span class="cloud__upload-name">{{ row.name }}</span>
          <span class="vc-faint">{{ formatSize(row.size) }}</span>
          <div class="vc-bar" :class="uploadBarClass(row)">
            <span :style="{ width: row.percent + '%' }"></span>
          </div>
          <span :class="['vc-small', row.status === 'FAILED' || row.status === 'REJECTED' ? 'vc-danger-text' : 'vc-faint']">
            {{ uploadStatus(row) }}
          </span>
        </div>
      </div>

      <!-- what is selected -->
      <div v-if="selected.length" class="cloud__selection">
        <strong class="vc-small">{{ selected.length }} selecionado(s)</strong>
        <span class="vc-faint">{{ formatSize(selectionBytes) }}</span>
        <span class="vc-spacer"></span>
        <button v-for="action in selectionActions" :key="action.key" type="button"
                :class="['vc-btn', 'vc-btn--small', action.danger ? 'vc-btn--danger' : 'vc-btn--outline']"
                @click="runAction(action.key)">
          <AppIcon :name="action.icon" :size="14" />
          {{ action.label }}
        </button>
        <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="clearSelection">Limpar</button>
      </div>

      <div class="cloud__layout">
        <section
          :class="['cloud__listing', dropInside ? 'is-dropping' : '']"
          @click.self="clearSelection"
          @contextmenu.prevent="openMenu($event, null)"
          @dragenter="onListingDragEnter"
          @dragover="onListingDragOver"
          @dragleave="onListingDragLeave"
          @drop="onListingDrop"
        >
          <div v-if="dropInside" class="cloud__dropzone">
            <AppIcon name="upload" :size="18" />
            <strong>Solte aqui para enviar para "{{ content.folder?.name }}"</strong>
            <span class="vc-faint">ou solte em cima de uma pasta · até {{ MAX_UPLOAD_LABEL }} por arquivo</span>
          </div>

          <template v-for="section in sections" :key="section.key">
            <div v-if="section.title" class="cloud__section">
              <AppIcon :name="section.icon" :size="15" />
              <strong>{{ section.title }}</strong>
              <span class="vc-faint">{{ section.hint }}</span>
            </div>

            <div :class="view === 'grid' ? 'cloud__grid' : 'cloud__list'">
              <div
                v-for="entry in section.entries"
                :key="entry.key"
                :class="[
                  'cloud__item',
                  isSelected(entry.key) ? 'is-selected' : '',
                  entry.locked ? 'is-locked' : '',
                  dropFolderKey === entry.key ? 'is-drop' : '',
                ]"
                :style="entry.item.divisionColor ? { borderLeftColor: entry.item.divisionColor } : null"
                :draggable="renaming?.key !== entry.key"
                tabindex="0"
                @click="onItemClick($event, entry)"
                @dblclick="openEntry(entry)"
                @contextmenu.prevent.stop="openMenu($event, entry)"
                @dragstart="onItemDragStart($event, entry)"
                @dragend="dragging = []"
                @dragover="onItemDragOver($event, entry)"
                @dragleave="dropFolderKey = null"
                @drop="onItemDrop($event, entry)"
              >
                <AppIcon
                  class="cloud__item-icon"
                  :name="entry.icon"
                  :size="view === 'grid' ? 26 : 18"
                  :stroke="1.7"
                  :style="entry.item.divisionColor ? { color: entry.item.divisionColor } : null"
                />

                <div class="cloud__item-body">
                  <input
                    v-if="renaming?.key === entry.key"
                    :ref="focusRename"
                    class="vc-input cloud__rename"
                    type="text"
                    v-model="renaming.value"
                    @click.stop
                    @dblclick.stop
                    @keydown.enter.prevent="commitRename"
                    @keydown.esc.prevent="renaming = null"
                    @blur="commitRename"
                  />
                  <span v-else class="cloud__item-name" :title="entry.name">{{ entry.name }}</span>

                  <div class="cloud__item-tags">
                    <span v-if="entry.item.divisionId" class="vc-chip" :style="divisionChipStyle(entry.item)">
                      {{ entry.item.divisionName || 'divisão' }}
                    </span>
                    <span v-else-if="entry.item.icon === 'plane'" class="vc-chip vc-chip--info">viagem</span>
                    <span v-else-if="entry.item.visibility === 'RESTRICTED'" class="vc-chip vc-chip--warning">
                      restrita
                    </span>
                    <span v-if="entry.kind?.tag" :class="['vc-chip', entry.kind.chip]">{{ entry.kind.label }}</span>
                    <span v-if="entry.locked" class="vc-chip">sem acesso</span>
                  </div>
                </div>

                <div class="cloud__item-meta">
                  <span>{{ entry.isFolder ? 'Pasta' : formatSize(entry.item.sizeBytes) }}</span>
                  <span v-if="entry.item.createdAt">{{ formatDate(entry.item.createdAt) }}</span>
                </div>
              </div>

              <!-- the new folder is typed where it will appear -->
              <div v-if="section.key === 'items' && creating !== null" class="cloud__item is-new">
                <AppIcon class="cloud__item-icon" name="folder" :size="view === 'grid' ? 26 : 18" :stroke="1.7" />
                <div class="cloud__item-body">
                  <input
                    :ref="focusRename"
                    class="vc-input cloud__rename"
                    type="text"
                    v-model="creating"
                    placeholder="Nome da pasta"
                    @keydown.enter.prevent="createFolder"
                    @keydown.esc.prevent="creating = null"
                    @blur="createFolder"
                  />
                </div>
                <div class="cloud__item-meta"></div>
              </div>
            </div>
          </template>

          <p v-if="!loaded" class="vc-faint" style="padding: 18px 4px">Carregando a pasta...</p>

          <EmptyState v-else-if="failed" title="Não deu para abrir esta pasta">
            O endereço pode estar errado, a pasta pode ter sido removida ou pode ser de outra equipe.
            <template #actions>
              <button class="vc-btn vc-btn--outline" type="button" @click="load()">Tentar de novo</button>
              <router-link class="vc-btn vc-btn--ghost" :to="{ name: 'cloud' }">Ir para a raiz da equipe</router-link>
            </template>
          </EmptyState>

          <EmptyState v-else-if="!entries.length && search" title="Nada com esse nome nesta pasta">
            A busca olha só o que está aqui dentro: entre na pasta para procurar lá.
            <template #actions>
              <button class="vc-btn vc-btn--outline" type="button" @click="search = ''">Limpar busca</button>
            </template>
          </EmptyState>

          <EmptyState v-else-if="!entries.length && creating === null" title="Esta pasta está vazia">
            Arraste arquivos de qualquer lugar para cá, ou crie uma pasta para separar por assunto.
            Clique com o botão direito para ver tudo o que dá para fazer, e lembre: {{ MAX_UPLOAD_LABEL }}
            por arquivo.
            <template v-if="content.canUpload" #actions>
              <label class="vc-btn">
                <AppIcon name="upload" :size="15" />
                Enviar arquivos
                <input type="file" multiple style="display: none" @change="pickFiles" />
              </label>
              <button class="vc-btn vc-btn--outline" type="button" @click="startNewFolder">Criar pasta</button>
            </template>
          </EmptyState>
        </section>

        <CloudPreview
          :entry="panelEntry"
          :actions="panelActions"
          :selection-count="selected.length"
          :selection-bytes="selectionBytes"
          @action="runAction"
          @shown="refocusSelection"
        />
      </div>
    </div>

    <!-- ---------------------------------------------------------- lixeira -->
    <ModalDialog v-if="trashOpen" title="Lixeira" @close="trashOpen = false">
      <p class="vc-faint" style="margin-top: 0">
        O que você apaga fica aqui alguns segundos antes de ir para o servidor: enquanto estiver
        "aguardando", um clique em restaurar traz de volta sem nada ter acontecido. Depois disso a
        remoção é do servidor, e só quem cuida dele consegue recuperar.
      </p>
      <EmptyState v-if="!trash.length" title="Lixeira vazia">
        Nada foi apagado nesta sessão.
      </EmptyState>
      <div v-else class="vc-list">
        <div v-for="row in trash" :key="row.id" class="vc-list__item vc-list__item--plain">
          <AppIcon :name="row.isFolder ? 'folder' : 'file'" :size="16" />
          <div class="vc-list__text">
            <strong>{{ row.name }}</strong>
            <span>{{ row.folderName }} · {{ formatAgo(row.at) }} · {{ trashStatus(row) }}</span>
          </div>
          <div class="vc-list__aside">
            <button v-if="row.status === 'PENDING'" class="vc-btn vc-btn--small" type="button"
                    @click="restore(row)">
              Restaurar
            </button>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="trashOpen = false">Fechar</button>
      </template>
    </ModalDialog>

    <!-- ---------------------------------------------------------- confirmar -->
    <ModalDialog v-if="confirming" :title="confirming.title" @close="confirming = null">
      <p style="margin: 0; white-space: pre-line">{{ confirming.message }}</p>
      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="confirming = null">Cancelar</button>
        <button :class="['vc-btn', confirming.danger ? 'vc-btn--danger' : '']" type="button" @click="acceptConfirm">
          {{ confirming.label }}
        </button>
      </template>
    </ModalDialog>

    <!-- -------------------------------------------------------------- mover -->
    <ModalDialog v-if="moving" title="Mover para" @close="moving = null">
      <p class="vc-faint" style="margin-top: 0">
        Dá para arrastar direto para a pasta também, aqui na tela ou no caminho lá em cima.
      </p>
      <EmptyState v-if="!moveTargets.length" title="Nenhum destino por perto">
        Só dá para mover para uma pasta do caminho ou para uma pasta desta aqui.
      </EmptyState>
      <div v-else class="vc-list">
        <button v-for="target in moveTargets" :key="target.id" type="button" class="vc-list__item"
                @click="chooseMoveTarget(target)">
          <AppIcon :name="target.divisionId ? 'divisions' : 'folder'" :size="16"
                   :style="target.divisionColor ? { color: target.divisionColor } : null" />
          <div class="vc-list__text">
            <strong>{{ target.name }}</strong>
            <span>{{ target.hint }}</span>
          </div>
        </button>
      </div>
      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="moving = null">Cancelar</button>
      </template>
    </ModalDialog>

    <!-- ------------------------------------------------------------ shares -->
    <CloudShareDialog v-if="sharing" :kind="sharing.kind" :item="sharing.item" @close="sharing = null" />

    <!-- ---------------------------------------------------------- settings -->
    <ModalDialog v-if="settings" :title="'Configurar ' + settings.item.name" @close="settings = null">
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

    <!-- ------------------------------------------------------ text editor -->
    <ModalDialog v-if="editor" wide :title="editor.creating ? 'Novo arquivo' : 'Editar ' + editor.name"
                 @close="editor = null">
      <div v-if="editor.creating" class="vc-field">
        <label class="vc-label" for="editorName">Nome</label>
        <input id="editorName" class="vc-input" type="text" v-model="editor.name" placeholder="anotacoes.md" />
        <span class="vc-faint">Sem extensão vira .txt. Também aceita .md, .csv e .json.</span>
      </div>
      <div class="vc-field">
        <label class="vc-label" for="editorContent">Conteúdo</label>
        <textarea id="editorContent" class="vc-textarea cloud__editor" v-model="editor.content"></textarea>
      </div>
      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="editor = null">Cancelar</button>
        <button class="vc-btn" type="button" :disabled="editor.saving" @click="saveTextFile">Salvar</button>
      </template>
    </ModalDialog>

    <!-- ---------------------------------------------------------- comments -->
    <CloudCommentsDialog v-if="commenting" :kind="commenting.kind" :item="commenting.item"
                         @close="commenting = null" />

    <CloudContextMenu
      v-if="menu"
      :x="menu.x"
      :y="menu.y"
      :title="menu.title"
      :actions="menu.actions"
      @pick="pickFromMenu"
      @close="menu = null"
    />
  </main>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import TabBar from '@/components/TabBar.vue';
import AlertBanner from '@/components/AlertBanner.vue';
import PanelCard from '@/components/PanelCard.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import EmptyState from '@/components/EmptyState.vue';
import AppIcon from '@/components/AppIcon.vue';
import CloudPreview from './CloudPreview.vue';
import CloudContextMenu from './CloudContextMenu.vue';
import CloudShareDialog from './CloudShareDialog.vue';
import CloudCommentsDialog from './CloudCommentsDialog.vue';
import { authStore } from '@/store/auth.js';
import { preferencesStore } from '@/store/preferences.js';
import { cloud } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';
import { formatAgo, formatDate, formatDateTime, parseServer } from '@/services/time.js';
import {
  MAX_UPLOAD_LABEL,
  compareEntries,
  fileKind,
  formatSize,
  isEditableText,
  normalizeText,
  uploadRejection,
} from './cloudFiles.js';

/*
 * The file manager.
 *
 * It is used by people crossing a workshop with a laptop under one arm, so everything has two ways
 * in: the toolbar and the right button, the mouse and the keyboard, a click and a drag. What the
 * screen can decide on its own it decides here — the 20 MB of an upload is refused before a single
 * byte leaves, and an "apagar" waits a few seconds in the lixeira before the server hears about it.
 *
 * What the screen never decides is who may do what: every item arrives with its own `access`, an
 * item nobody may open still comes listed with access NONE so the pedido de acesso can be offered,
 * and the actions below only ever hide what the server would refuse anyway.
 *
 * Two things the server does not have yet and the screen works around, both noted for whoever picks
 * them up: there is no route that changes the folder of a file (mover is done by copying and is only
 * offered when nothing would be lost), and there is no lixeira on the server (delete is final, so
 * the one here holds the request instead of holding the file).
 */
const auth = authStore();
const prefs = preferencesStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const VIEW_KEY = 'cloud.view';
/** How long an "apagar" waits before the server hears about it. Long enough to catch a wrong Delete. */
const UNDO_MS = 8000;

const tab = ref('files');
const tabs = [
  { key: 'files', label: 'Arquivos' },
  { key: 'shared', label: 'Compartilhados comigo', to: { name: 'sharedWithMe' } },
  { key: 'requests', label: 'Pedidos de acesso', to: { name: 'accessRequests' } },
];

const content = ref({});
/** False until the folder on the URL has answered once: an unread folder is not an empty folder. */
const loaded = ref(false);
/** True when that answer was a refusal: a folder that would not open is not an empty folder either. */
const failed = ref(false);
const view = ref(prefs.getSetting(VIEW_KEY, 'grid') === 'list' ? 'list' : 'grid');
const search = ref('');
const sort = reactive({ key: 'name', dir: 'asc' });

const selected = ref([]);
const anchor = ref('');
const renaming = ref(null);
const creating = ref(null);

const uploads = ref([]);
let nextRowId = 0;

const trash = ref([]);
const trashOpen = ref(false);
const now = ref(Date.now());
let ticker = null;
let leaving = false;

const dragging = ref([]);
const dropFolderKey = ref(null);
const dropCrumbId = ref(null);
const dropInside = ref(false);
let dragDepth = 0;

const menu = ref(null);
const confirming = ref(null);
const moving = ref(null);

const accessRequest = reactive({ message: '', requestedLevel: 'VIEW' });

const sharing = ref(null);

const editor = ref(null);

const settings = ref(null);
const settingsForm = reactive({ visibility: 'INHERIT', hiddenTitle: false });

const commenting = ref(null);

const isRoot = computed(() => !content.value.folder?.parentId);
const dialogOpen = computed(
  () => !!(trashOpen.value || confirming.value || moving.value || sharing.value
    || settings.value || editor.value || commenting.value),
);

/* -------------------------------------------------------------- the listing */

/** One row of the listing, folder or file, with everything the template asks twice already resolved. */
function toEntry(item, isFolder) {
  const locked = item.access === 'NONE';
  const kind = isFolder ? null : fileKind(item);
  return {
    key: isFolder ? 'folder-' + item.id : 'file-' + item.fileId,
    isFolder,
    item,
    kind,
    locked,
    name: item.name,
    icon: locked ? 'lock' : isFolder ? (item.divisionId ? 'divisions' : item.icon || 'folder') : kind.icon,
    sortDate: parseServer(item.createdAt)?.getTime() || 0,
    sortSize: isFolder ? 0 : item.sizeBytes || 0,
  };
}

const entries = computed(() => {
  const term = normalizeText(search.value);
  const rows = [];
  (content.value.folders || []).forEach((folder) => rows.push(toEntry(folder, true)));
  (content.value.files || []).forEach((file) => rows.push(toEntry(file, false)));
  return rows
    .filter((entry) => !pendingKeys.value.has(entry.key))
    .filter((entry) => !term || normalizeText(entry.name).includes(term))
    .sort((first, second) => compareEntries(first, second, sort.key, sort.dir));
});

/*
 * The folders of the divisions come first and on their own: the server keeps one per division and
 * follows the tree of divisions with it, so they are not folders somebody made and cannot be
 * renamed, moved or removed from here — saying that with a heading costs less than a tooltip.
 */
const sections = computed(() => {
  const divisions = entries.value.filter((entry) => entry.isFolder && entry.item.divisionId);
  const rest = entries.value.filter((entry) => !(entry.isFolder && entry.item.divisionId));
  const groups = [];
  if (divisions.length) {
    groups.push({
      key: 'divisions',
      title: 'Divisões',
      icon: 'divisions',
      hint: 'uma pasta por divisão, aberta para quem está nela',
      entries: divisions,
    });
  }
  groups.push({
    key: 'items',
    title: divisions.length ? 'Pastas e arquivos' : '',
    icon: 'folder',
    hint: '',
    entries: rest,
  });
  return groups.filter((group) => group.entries.length || group.key === 'items');
});

/** The listing in the order it is drawn, which is the order a Shift click walks through. */
const flatEntries = computed(() => sections.value.flatMap((group) => group.entries));

const selectedEntries = computed(() => flatEntries.value.filter((entry) => selected.value.includes(entry.key)));
const selectionBytes = computed(
  () => selectedEntries.value.reduce((total, entry) => total + (entry.item.sizeBytes || 0), 0),
);

/** With nothing selected the panel talks about the folder that is open, never about nothing. */
const panelEntry = computed(() => {
  if (selected.value.length === 1) return selectedEntries.value[0] || null;
  if (selected.value.length > 1) return null;
  return content.value.folder ? toEntry(content.value.folder, true) : null;
});

const panelActions = computed(() => actionsFor(selectedEntries.value));
const selectionActions = computed(() => actionsFor(selectedEntries.value).filter((action) => action.batch));

/* ------------------------------------------------------------------ loading */

onMounted(() => {
  load();
  window.addEventListener('keydown', onKeydown);
  document.addEventListener('visibilitychange', onHidden);
});

onBeforeUnmount(() => {
  leaving = true;
  window.removeEventListener('keydown', onKeydown);
  document.removeEventListener('visibilitychange', onHidden);
  stopTicker();
  flushTrash();
});

watch(() => route.params.id, () => {
  clearSelection();
  search.value = '';
  creating.value = null;
  renaming.value = null;
  loaded.value = false;
  failed.value = false;
  load();
});

watch(() => prefs.getSetting(VIEW_KEY, 'grid'), (stored) => {
  view.value = stored === 'list' ? 'list' : 'grid';
});

watch(() => auth.activeTenantId, () => {
  if (route.name === 'cloud') load();
  else router.push({ name: 'cloud' });
});

async function load(keepSelection) {
  try {
    const folderId = route.params.id || (await rootId());
    if (!folderId) {
      loaded.value = true;
      return;
    }
    if (!route.params.id) {
      //The redirect changes route.params.id, and the watcher above loads again with it
      router.replace({ name: 'cloudFolder', params: { id: folderId } });
      return;
    }
    const { data } = await cloud.folder(folderId);
    content.value = data;
    failed.value = false;
    if (!keepSelection) selected.value = [];
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao abrir a pasta'));
    content.value = {};
    failed.value = true;
  } finally {
    if (route.params.id) loaded.value = true;
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

function openFolderId(folderId) {
  if (folderId === content.value.folder?.id) return;
  router.push({ name: 'cloudFolder', params: { id: folderId } });
}

function goUp() {
  const parentId = content.value.folder?.parentId;
  if (parentId) router.push({ name: 'cloudFolder', params: { id: parentId } });
  else router.push({ name: 'cloud' });
}

function setView(mode) {
  view.value = mode;
  prefs.setSetting(VIEW_KEY, mode);
}

function toggleDirection() {
  sort.dir = sort.dir === 'asc' ? 'desc' : 'asc';
}

/* ---------------------------------------------------------------- selection */

function isSelected(key) {
  return selected.value.includes(key);
}

function clearSelection() {
  selected.value = [];
  anchor.value = '';
}

function onItemClick(event, entry) {
  if (renaming.value?.key === entry.key) return;
  if (event.shiftKey && anchor.value) {
    const keys = flatEntries.value.map((row) => row.key);
    const from = keys.indexOf(anchor.value);
    const to = keys.indexOf(entry.key);
    if (from >= 0 && to >= 0) {
      selected.value = keys.slice(Math.min(from, to), Math.max(from, to) + 1);
      return;
    }
  }
  if (event.ctrlKey || event.metaKey) {
    selected.value = isSelected(entry.key)
      ? selected.value.filter((key) => key !== entry.key)
      : [...selected.value, entry.key];
    anchor.value = entry.key;
    return;
  }
  selected.value = [entry.key];
  anchor.value = entry.key;
}

function selectAll() {
  selected.value = flatEntries.value.map((entry) => entry.key);
}

/* ----------------------------------------------------------------- keyboard */

function onKeydown(event) {
  if (dialogOpen.value || content.value.denied) return;
  const target = event.target;
  const tag = (target?.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return;
  //With the right button menu open the keyboard belongs to it, and Escape is what closes it
  if (menu.value && event.key !== 'Escape') return;

  if (event.key === 'Escape') {
    clearSelection();
    menu.value = null;
    creating.value = null;
  } else if (event.key === 'Delete') {
    if (selectedEntries.value.length) askRemove(selectedEntries.value);
  } else if (event.key === 'F2') {
    event.preventDefault();
    if (selectedEntries.value.length === 1) startRename(selectedEntries.value[0]);
  } else if (event.key === 'Enter') {
    if (selectedEntries.value.length === 1) openEntry(selectedEntries.value[0]);
  } else if (event.key === 'a' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    selectAll();
  }
}

/* ------------------------------------------------------------------ actions */

/*
 * The one list of actions. The panel on the right, the bar of the selection and the right button
 * menu all read it, so nothing is ever reachable one way and missing another. `batch` marks what
 * makes sense over more than one item at a time.
 */
function actionsFor(chosen) {
  const actions = [];
  const folder = content.value.folder;

  if (!chosen.length) {
    if (folder && !content.value.denied) {
      actions.push({ key: 'comments', label: 'Comentários', icon: 'comment' });
      if (folder.access === 'MANAGE') actions.push({ key: 'shares', label: 'Acesso', icon: 'share' });
      if (content.value.canManage && !isRoot.value) {
        actions.push({ key: 'settings', label: 'Configurar', icon: 'sliders' });
      }
      if (content.value.canUpload) {
        actions.push({ key: 'newFolder', label: 'Nova pasta', icon: 'plus' });
      }
    }
    return actions;
  }

  if (chosen.length === 1) {
    const entry = chosen[0];
    const item = entry.item;
    if (entry.locked) {
      return [{ key: 'requestAccess', label: 'Solicitar acesso', icon: 'key' }];
    }
    actions.push({ key: 'open', label: 'Abrir', icon: entry.isFolder ? 'folder' : 'eye' });
    if (!entry.isFolder) actions.push({ key: 'download', label: 'Baixar', icon: 'download', batch: true });
    if (!entry.isFolder && isEditableText(item) && canEdit(item)) {
      actions.push({ key: 'editText', label: 'Editar texto', icon: 'edit' });
    }
    if (canRename(entry)) actions.push({ key: 'rename', label: 'Renomear', icon: 'edit' });
    if (canMove(entry)) actions.push({ key: 'move', label: 'Mover', icon: 'back', batch: true });
    actions.push({ key: 'comments', label: 'Comentários', icon: 'comment' });
    if (item.access === 'MANAGE') {
      actions.push({ key: 'shares', label: 'Acesso', icon: 'share' });
      if (!(entry.isFolder && item.systemFolder)) {
        actions.push({ key: 'settings', label: 'Configurar', icon: 'sliders' });
      }
    }
    if (canDelete(entry)) actions.push({ key: 'remove', label: 'Apagar', icon: 'trash', danger: true, batch: true });
    return actions;
  }

  if (chosen.some((entry) => !entry.isFolder && !entry.locked)) {
    actions.push({ key: 'download', label: 'Baixar', icon: 'download', batch: true });
  }
  if (chosen.some(canMove)) actions.push({ key: 'move', label: 'Mover', icon: 'back', batch: true });
  if (chosen.some(canDelete)) {
    actions.push({ key: 'remove', label: 'Apagar', icon: 'trash', danger: true, batch: true });
  }
  return actions;
}

function canEdit(item) {
  return item.access === 'EDIT' || item.access === 'MANAGE';
}

function canDelete(entry) {
  if (entry.isFolder) return entry.item.access === 'MANAGE' && !entry.item.systemFolder;
  return canEdit(entry.item);
}

function canRename(entry) {
  //Both renames need MANAGE on the server, and the folder of a division follows the division's name
  if (entry.item.access !== 'MANAGE') return false;
  return !(entry.isFolder && entry.item.systemFolder);
}

/** Only a file, and only when the copy that stands for a move would lose nothing. See moveFiles. */
function canMove(entry) {
  return !entry.isFolder && entry.item.access === 'MANAGE';
}

function runAction(key) {
  const chosen = selectedEntries.value;
  const single = chosen.length === 1 ? chosen[0] : null;
  switch (key) {
    case 'open': if (single) openEntry(single); break;
    case 'download': downloadEntries(chosen); break;
    case 'editText': if (single) editTextFile(single.item); break;
    case 'rename': if (single) startRename(single); break;
    case 'move': openMovePicker(chosen); break;
    case 'comments': openComments(single); break;
    case 'shares': openShares(single); break;
    case 'settings': openSettings(single); break;
    case 'remove': askRemove(chosen); break;
    case 'requestAccess': if (single) requestItemAccess(single); break;
    case 'newFolder': startNewFolder(); break;
    default: break;
  }
}

/* -------------------------------------------------------------- context menu */

function openMenu(event, entry) {
  if (entry && !isSelected(entry.key)) {
    selected.value = [entry.key];
    anchor.value = entry.key;
  }
  if (!entry) clearSelection();
  //The selection only settles on the next tick, and the menu draws what is selected
  nextTick(() => {
    const chosen = selectedEntries.value;
    const actions = actionsFor(chosen);
    if (!actions.length) return;
    menu.value = {
      x: event.clientX,
      y: event.clientY,
      title: chosen.length > 1 ? chosen.length + ' itens' : (chosen[0]?.name || content.value.folder?.name || ''),
      actions,
    };
  });
}

function pickFromMenu(key) {
  menu.value = null;
  runAction(key);
}

/* ------------------------------------------------------------------ opening */

function openEntry(entry) {
  if (entry.isFolder) {
    openFolderId(entry.item.id);
    return;
  }
  if (entry.locked) {
    requestItemAccess(entry);
    return;
  }
  openFile(entry.item);
}

async function openFile(file) {
  toast.info('Solicitando o arquivo ao servidor...');
  try {
    const response = await cloud.download(file.fileId);
    const contentType = response.headers['content-type'] || 'application/octet-stream';
    const url = window.URL.createObjectURL(new Blob([response.data], { type: contentType }));

    const openable = ['image/', 'application/pdf', 'video/', 'audio/', 'text/'];
    if (openable.some((prefix) => contentType.startsWith(prefix))) {
      window.open(url, '_blank');
      //The tab that was just opened is still reading from the url, so it is only dropped later
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
      return;
    }
    saveBlob(url, file.originalName || file.name || 'arquivo');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao baixar arquivo'));
  }
}

/** Downloads one after the other: a browser cancels a burst of simultaneous saves. */
async function downloadEntries(chosen) {
  const files = chosen.filter((entry) => !entry.isFolder && !entry.locked);
  if (!files.length) {
    toast.info('Só dá para baixar arquivos, uma pasta de cada vez não.');
    return;
  }
  for (const entry of files) {
    try {
      const response = await cloud.download(entry.item.fileId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      saveBlob(url, entry.item.originalName || entry.name);
    } catch (error) {
      toast.error(apiMessage(error, 'Erro ao baixar ' + entry.name));
    }
  }
}

/*
 * The url is dropped later, never right after the click: only Chrome reads it synchronously, and
 * revoking it on the same line cancels the save on Firefox and Safari before a byte is written.
 */
function saveBlob(url, name) {
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
}

/* ------------------------------------------------------------------ uploads */

function pickFiles(event) {
  queueUploads(Array.from(event.target.files || []), content.value.folder?.id);
  event.target.value = '';
}

/*
 * The 20 MB are checked here, one file at a time, before anything is sent: the server takes the
 * whole body before it can refuse, so a file over the limit would cost the upload twice — once
 * climbing and once being told no.
 */
function queueUploads(files, folderId) {
  if (!folderId) return;
  if (!files.length) return;
  files.forEach((file) => {
    const rejection = uploadRejection(file);
    const row = reactive({
      id: ++nextRowId,
      name: file.name,
      size: file.size,
      percent: rejection ? 100 : 0,
      status: rejection ? 'REJECTED' : 'SENDING',
      error: rejection || '',
    });
    uploads.value.push(row);
    if (rejection) {
      toast.error(rejection);
      return;
    }
    sendUpload(row, file, folderId);
  });
}

async function sendUpload(row, file, folderId) {
  try {
    await cloud.upload(folderId, file, (progress) => {
      if (progress.total) row.percent = Math.round((progress.loaded / progress.total) * 100);
    });
    row.percent = 100;
    row.status = 'DONE';
    window.setTimeout(() => {
      uploads.value = uploads.value.filter((item) => item.id !== row.id);
    }, 4000);
  } catch (error) {
    row.status = 'FAILED';
    row.error = apiMessage(error, 'Erro ao enviar');
    toast.error(row.name + ': ' + row.error);
  } finally {
    //One reload for the whole batch, and only when the last one lands
    if (!uploads.value.some((item) => item.status === 'SENDING')) await load(true);
  }
}

function uploadStatus(row) {
  if (row.status === 'REJECTED' || row.status === 'FAILED') return row.error;
  if (row.status === 'DONE') return 'enviado';
  return row.percent + '%';
}

function uploadBarClass(row) {
  if (row.status === 'REJECTED' || row.status === 'FAILED') return 'vc-bar--danger';
  if (row.status === 'DONE') return 'vc-bar--success';
  return '';
}

/* --------------------------------------------------------------- drag & drop */

const DRAG_TYPE = 'application/x-vernum-cloud';

function hasFiles(event) {
  return Array.from(event.dataTransfer?.types || []).includes('Files');
}

function isInternalDrag(event) {
  return Array.from(event.dataTransfer?.types || []).includes(DRAG_TYPE);
}

function onItemDragStart(event, entry) {
  //Dragging something outside the selection makes it the selection, like every file manager
  if (!isSelected(entry.key)) {
    selected.value = [entry.key];
    anchor.value = entry.key;
  }
  dragging.value = [...selected.value];
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData(DRAG_TYPE, dragging.value.join(','));
  event.dataTransfer.setData('text/plain', entry.name);
}

function draggedEntries() {
  return flatEntries.value.filter((entry) => dragging.value.includes(entry.key));
}

function onItemDragOver(event, entry) {
  if (!entry.isFolder || entry.locked) return;
  if (dragging.value.includes(entry.key)) return;
  if (!hasFiles(event) && !isInternalDrag(event)) return;
  if (!canEdit(entry.item)) return;
  event.preventDefault();
  event.stopPropagation();
  dropFolderKey.value = entry.key;
}

function onItemDrop(event, entry) {
  if (dropFolderKey.value !== entry.key) return;
  event.preventDefault();
  event.stopPropagation();
  dropFolderKey.value = null;
  dropInside.value = false;
  dragDepth = 0;
  if (hasFiles(event)) {
    queueUploads(Array.from(event.dataTransfer.files || []), entry.item.id);
    return;
  }
  askMove(draggedEntries(), entry.item);
}

function onCrumbDragOver(event, item) {
  if (item.id === content.value.folder?.id) return;
  if (!isInternalDrag(event) && !hasFiles(event)) return;
  if (!canEdit(item)) return;
  event.preventDefault();
  dropCrumbId.value = item.id;
}

function onCrumbDrop(event, item) {
  if (dropCrumbId.value !== item.id) return;
  event.preventDefault();
  dropCrumbId.value = null;
  if (hasFiles(event)) {
    queueUploads(Array.from(event.dataTransfer.files || []), item.id);
    return;
  }
  askMove(draggedEntries(), item);
}

function onListingDragEnter(event) {
  if (!hasFiles(event) || !content.value.canUpload) return;
  dragDepth += 1;
  dropInside.value = true;
}

function onListingDragOver(event) {
  if (!hasFiles(event) || !content.value.canUpload) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
}

function onListingDragLeave() {
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) dropInside.value = false;
}

function onListingDrop(event) {
  dragDepth = 0;
  dropInside.value = false;
  if (!hasFiles(event)) return;
  event.preventDefault();
  if (!content.value.canUpload) {
    toast.error('Você não pode enviar arquivos para esta pasta.');
    return;
  }
  queueUploads(Array.from(event.dataTransfer.files || []), content.value.folder?.id);
}

/* --------------------------------------------------------------------- move */

/** Where a move can land from here: the folders on the way in, and the folders in sight. */
const moveTargets = computed(() => {
  const list = [];
  const path = content.value.path || [];
  path.slice(0, -1).forEach((item) => {
    if (canEdit(item)) list.push({ ...item, hint: 'no caminho' });
  });
  (content.value.folders || []).forEach((folder) => {
    if (canEdit(folder) && !selected.value.includes('folder-' + folder.id)) {
      list.push({ ...folder, hint: 'aqui dentro' });
    }
  });
  return list;
});

function openMovePicker(chosen) {
  const movable = chosen.filter(canMove);
  if (!movable.length) {
    toast.info('Só dá para mover arquivo que você gerencia. Pasta, o servidor ainda não move.');
    return;
  }
  moving.value = { entries: movable };
}

function chooseMoveTarget(target) {
  const chosen = moving.value?.entries || [];
  moving.value = null;
  askMove(chosen, target);
}

function askMove(chosen, target) {
  if (!chosen.length || !target || target.id === content.value.folder?.id) return;
  const folders = chosen.filter((entry) => entry.isFolder);
  const files = chosen.filter((entry) => !entry.isFolder);
  if (folders.length) {
    toast.info('Mover pasta ainda não dá: o servidor não tem rota que troque a pasta de lugar.');
  }
  const movable = files.filter(canMove);
  if (files.length && !movable.length) {
    toast.info('Mover um arquivo pede o nível "gerenciar" nele.');
    return;
  }
  if (!movable.length) return;

  confirming.value = {
    title: 'Mover para ' + target.name,
    message: `${movable.length} arquivo(s) vão para "${target.name}".\n\n`
      + 'O servidor ainda não tem uma rota que troque a pasta de um arquivo, então mover aqui é '
      + 'copiar para o destino e apagar o original: o arquivo passa a ser seu e a data de criação '
      + 'vira agora. Nada que tenha comentário ou compartilhamento é movido, para não perder nada '
      + 'pelo caminho.',
    label: 'Mover',
    run: () => moveFiles(movable, target),
  };
}

/*
 * A move, with the routes that exist.
 *
 * Upload first and delete after, never the other way round: the worst a failure can do is leave a
 * copy behind, and a copy is something somebody can see and remove. A file the server refuses to
 * delete — the document of a trip is one — has its copy taken back, so the refusal costs nothing.
 *
 * Comments and shares belong to the row, not to the bytes, and copying the bytes leaves them
 * behind. Rather than lose them quietly the move is refused for anything that carries them.
 */
async function moveFiles(chosen, target) {
  let moved = 0;
  for (const entry of chosen) {
    const file = entry.item;
    const row = reactive({ id: ++nextRowId, name: file.name, size: file.sizeBytes, percent: 0, status: 'SENDING', error: '' });
    uploads.value.push(row);
    try {
      const [itsComments, itsShares] = await Promise.all([
        cloud.fileComments(file.fileId),
        cloud.fileShares(file.fileId),
      ]);
      if (itsComments.data.length || itsShares.data.length) {
        row.status = 'FAILED';
        row.error = 'tem comentário ou compartilhamento: mover perderia isso';
        continue;
      }

      const response = await cloud.download(file.fileId);
      const copy = new File([response.data], file.originalName || file.name, {
        type: file.contentType || 'application/octet-stream',
      });
      const created = await cloud.upload(target.id, copy, (progress) => {
        if (progress.total) row.percent = Math.round((progress.loaded / progress.total) * 100);
      });
      if (created.data.name !== file.name || file.hiddenTitle) {
        await cloud.updateFile(created.data.fileId, { name: file.name, hiddenTitle: !!file.hiddenTitle });
      }
      try {
        await cloud.removeFile(file.fileId);
      } catch (error) {
        await cloud.removeFile(created.data.fileId);
        throw error;
      }
      row.status = 'DONE';
      row.percent = 100;
      moved += 1;
    } catch (error) {
      row.status = 'FAILED';
      row.error = apiMessage(error, 'erro ao mover');
      toast.error(file.name + ': ' + row.error);
    }
  }
  clearSelection();
  await load();
  if (moved) toast.success(moved + ' arquivo(s) em ' + target.name + '.');
}

/* ------------------------------------------------------------------ lixeira */

const pendingTrash = computed(() => trash.value.filter((row) => row.status === 'PENDING'));
const pendingKeys = computed(() => new Set(pendingTrash.value.map((row) => row.key)));
const undoSeconds = computed(() => {
  const deadline = Math.max(...pendingTrash.value.map((row) => row.deadline), 0);
  return Math.max(0, Math.ceil((deadline - now.value) / 1000));
});

function askRemove(chosen) {
  const deletable = chosen.filter(canDelete);
  if (!deletable.length) {
    toast.info('Nada aqui é seu para apagar.');
    return;
  }
  const folders = deletable.filter((entry) => entry.isFolder).length;
  confirming.value = {
    title: deletable.length === 1 ? 'Apagar ' + deletable[0].name : 'Apagar ' + deletable.length + ' itens',
    message: (folders ? 'Uma pasta leva junto tudo o que está dentro dela.\n\n' : '')
      + `Vai para a lixeira e você tem ${UNDO_MS / 1000} segundos para trazer de volta. `
      + 'Passando disso, quem apaga é o servidor e não tem mais volta por aqui.',
    label: 'Apagar',
    danger: true,
    run: () => scheduleRemoval(deletable),
  };
}

function scheduleRemoval(chosen) {
  chosen.forEach((entry) => {
    const row = reactive({
      id: ++nextRowId,
      key: entry.key,
      isFolder: entry.isFolder,
      item: entry.item,
      name: entry.name,
      folderName: content.value.folder?.name || '',
      at: new Date(),
      deadline: Date.now() + UNDO_MS,
      status: 'PENDING',
      error: '',
      timer: null,
    });
    row.timer = window.setTimeout(() => flushRemoval(row), UNDO_MS);
    trash.value.unshift(row);
  });
  clearSelection();
  startTicker();
}

async function flushRemoval(row) {
  if (row.status !== 'PENDING') return;
  window.clearTimeout(row.timer);
  row.timer = null;
  row.status = 'REMOVING';
  try {
    if (row.isFolder) await cloud.removeFolder(row.item.id);
    else await cloud.removeFile(row.item.fileId);
    row.status = 'DONE';
  } catch (error) {
    row.status = 'FAILED';
    row.error = apiMessage(error, 'Erro ao apagar');
    toast.error(row.name + ': ' + row.error);
  }
  if (!pendingTrash.value.length) stopTicker();
  if (!leaving) await load(true);
}

function restore(row) {
  if (row.status !== 'PENDING') return;
  window.clearTimeout(row.timer);
  trash.value = trash.value.filter((item) => item.id !== row.id);
  if (!pendingTrash.value.length) stopTicker();
  toast.info(row.name + ' está de volta.');
}

function restoreAll() {
  [...pendingTrash.value].forEach(restore);
}

/*
 * A tab closed inside the undo window would leave the delete unsent — the item stays, which is the
 * harmless way to be wrong, but it is still a surprise. Hiding the tab is the last moment a browser
 * gives, so that is when what is waiting is sent.
 */
function onHidden() {
  if (document.visibilityState === 'hidden') flushTrash();
}

function flushTrash() {
  [...pendingTrash.value].forEach(flushRemoval);
}

function trashStatus(row) {
  return {
    PENDING: 'aguardando, dá para restaurar',
    REMOVING: 'removendo...',
    DONE: 'removido no servidor',
    FAILED: row.error,
  }[row.status] || row.status;
}

function startTicker() {
  if (ticker) return;
  ticker = window.setInterval(() => {
    now.value = Date.now();
  }, 500);
}

function stopTicker() {
  if (!ticker) return;
  window.clearInterval(ticker);
  ticker = null;
}

/* ----------------------------------------------------------------- renaming */

/*
 * A function ref runs again on every patch, and focusing and selecting on every one of them made
 * each letter typed replace the whole name. Only the first sight of a field counts.
 */
let focusedField = null;

/*
 * The PDF viewer of the browser grabs the focus as soon as it draws, and a Delete typed after that
 * goes to the plugin instead of the screen. Handing the focus back to the item keeps the keyboard
 * working with a PDF on the panel.
 */
function refocusSelection() {
  window.setTimeout(() => {
    const element = document.querySelector('.cloud__item.is-selected');
    if (element) element.focus({ preventScroll: true });
  }, 150);
}

function focusRename(element) {
  if (!element) {
    focusedField = null;
    return;
  }
  if (focusedField === element) return;
  focusedField = element;
  element.focus();
  if (element.select) element.select();
}

function startRename(entry) {
  if (!canRename(entry)) {
    toast.info(entry.isFolder && entry.item.systemFolder
      ? 'A pasta da divisão segue o nome da divisão.'
      : 'Renomear pede o nível "gerenciar" no item.');
    return;
  }
  renaming.value = { key: entry.key, value: entry.name, entry };
}

async function commitRename() {
  const current = renaming.value;
  if (!current) return;
  renaming.value = null;
  const name = (current.value || '').trim();
  if (!name || name === current.entry.name) return;
  try {
    if (current.entry.isFolder) await cloud.updateFolder(current.entry.item.id, { name });
    else await cloud.updateFile(current.entry.item.fileId, { name });
    await load(true);
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao renomear'));
  }
}

/* ------------------------------------------------------------------ folders */

function startNewFolder() {
  if (!content.value.canUpload) {
    toast.info('Você não pode criar pastas aqui.');
    return;
  }
  creating.value = '';
}

async function createFolder() {
  const name = (creating.value || '').trim();
  creating.value = null;
  if (!name) return;
  try {
    await cloud.createFolder({ name, parentFolderId: content.value.folder.id });
    await load(true);
    toast.success('Pasta criada!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao criar pasta'));
  }
}

/* ---------------------------------------------------------------- text files */

function newTextFile() {
  editor.value = { creating: true, name: '', content: '', saving: false };
}

async function editTextFile(file) {
  try {
    const { data } = await cloud.fileContent(file.fileId);
    editor.value = { creating: false, fileId: file.fileId, name: data.name, content: data.content, saving: false };
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao abrir o arquivo'));
  }
}

async function saveTextFile() {
  const current = editor.value;
  current.saving = true;
  try {
    if (current.creating) {
      await cloud.createTextFile({
        name: current.name,
        folderId: content.value.folder.id,
        content: current.content,
      });
    } else {
      await cloud.saveFileContent(current.fileId, current.content);
    }
    editor.value = null;
    await load(true);
    toast.success('Arquivo salvo!');
  } catch (error) {
    current.saving = false;
    toast.error(apiMessage(error, 'Erro ao salvar o arquivo'));
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

async function requestItemAccess(entry) {
  if (entry.isFolder) {
    //The folder screen is where the pedido is written, and it already knows what to ask
    openFolderId(entry.item.id);
    return;
  }
  try {
    await cloud.requestFileAccess(entry.item.fileId, { requestedLevel: 'VIEW' });
    toast.success('Pedido de acesso enviado!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao enviar pedido'));
  }
}

/* -------------------------------------------------------------------- shares */

function openShares(entry) {
  const target = entry || (content.value.folder ? toEntry(content.value.folder, true) : null);
  if (!target) return;
  sharing.value = { kind: target.isFolder ? 'folder' : 'file', item: target.item };
}

/* ------------------------------------------------------------------ settings */

function openSettings(entry) {
  const target = entry || (content.value.folder ? toEntry(content.value.folder, true) : null);
  if (!target) return;
  settings.value = { kind: target.isFolder ? 'folder' : 'file', item: target.item };
  settingsForm.visibility = target.item.visibility || 'INHERIT';
  settingsForm.hiddenTitle = !!target.item.hiddenTitle;
}

async function saveSettings() {
  try {
    if (settings.value.kind === 'folder') {
      await cloud.updateFolder(settings.value.item.id, {
        visibility: settingsForm.visibility,
        hiddenTitle: settingsForm.hiddenTitle,
      });
    } else {
      await cloud.updateFile(settings.value.item.fileId, { hiddenTitle: settingsForm.hiddenTitle });
    }
    settings.value = null;
    await load(true);
    toast.success('Alterações salvas!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao salvar alterações'));
  }
}

/* ------------------------------------------------------------------ comments */

function openComments(entry) {
  const target = entry || (content.value.folder ? toEntry(content.value.folder, true) : null);
  if (!target) return;
  commenting.value = { kind: target.isFolder ? 'folder' : 'file', item: target.item };
}

/* -------------------------------------------------------------------- labels */

function acceptConfirm() {
  const action = confirming.value;
  confirming.value = null;
  if (action?.run) action.run();
}

/** The color of the division tints the chip, and it is data, not theme, so it goes inline. */
function divisionChipStyle(item) {
  if (!item.divisionColor) return null;
  return { borderColor: item.divisionColor, color: item.divisionColor };
}

function accessLabel(level) {
  return {
    NONE: 'Sem acesso',
    VIEW: 'Ver e baixar',
    EDIT: 'Ver, enviar e alterar',
    MANAGE: 'Gerenciar e compartilhar',
  }[level] || level;
}
</script>

<style scoped>
/* ------------------------------------------------------------------- path */

.cloud__path {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  min-width: 0;
}

.cloud__crumb {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid transparent;
  background: none;
  font: inherit;
  font-size: 0.9rem;
  color: var(--vc-text-muted);
  padding: 3px 8px;
  border-radius: 6px;
  cursor: pointer;
}

.cloud__crumb:hover {
  background: var(--vc-purple-soft);
  color: var(--vc-purple-strong);
}

.cloud__crumb.is-current {
  color: var(--vc-text);
  font-weight: 600;
}

.cloud__crumb.is-drop {
  border-color: var(--vc-purple);
  background: var(--vc-purple-soft);
}

.cloud__sep {
  color: var(--vc-border-strong);
}

/* ---------------------------------------------------------------- toolbar */

.cloud__modes {
  display: flex;
  border: 1px solid var(--vc-border-strong);
  border-radius: var(--vc-radius);
  overflow: hidden;
}

.cloud__mode {
  border: none;
  background: var(--vc-surface);
  color: var(--vc-text-muted);
  padding: 6px 10px;
  cursor: pointer;
  display: flex;
}

.cloud__mode.is-on {
  background: var(--vc-purple);
  color: var(--vc-on-accent);
}

.cloud__search {
  flex: 0 1 240px;
  align-items: center;
  gap: 6px;
  color: var(--vc-text-faint);
}

.cloud__sort {
  max-width: 130px;
}

/* ---------------------------------------------------------------- uploads */

.cloud__uploads,
.cloud__selection {
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius);
  background: var(--vc-surface);
  padding: 10px 12px;
}

.cloud__uploads {
  display: grid;
  gap: 8px;
}

.cloud__upload {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(80px, 160px) auto;
  align-items: center;
  gap: 10px;
  font-size: 0.85rem;
}

.cloud__upload-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.cloud__selection {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  border-color: var(--vc-purple-border);
  background: var(--vc-purple-soft);
}

/* ---------------------------------------------------------------- listing */

.cloud__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 18px;
  align-items: start;
}

@media (max-width: 980px) {
  .cloud__layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

.cloud__listing {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 260px;
  min-width: 0;
  border: 1px dashed transparent;
  border-radius: var(--vc-radius-lg);
  padding: 4px;
}

.cloud__listing.is-dropping {
  border-color: var(--vc-purple);
  background: var(--vc-purple-soft);
}

.cloud__dropzone {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  pointer-events: none;
  padding: 10px 12px;
  color: var(--vc-purple-strong);
  background: var(--vc-purple-soft);
  border: 1px dashed var(--vc-purple);
  border-radius: var(--vc-radius);
}

.cloud__section {
  display: flex;
  align-items: baseline;
  gap: 8px;
  color: var(--vc-text-muted);
  font-size: 0.9rem;
  border-bottom: 1px solid var(--vc-border);
  padding-bottom: 6px;
}

.cloud__section strong {
  color: var(--vc-text);
}

.cloud__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
}

.cloud__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cloud__item {
  background: var(--vc-surface);
  border: 1px solid var(--vc-border);
  border-left: 3px solid var(--vc-border);
  border-radius: var(--vc-radius);
  cursor: pointer;
  min-width: 0;
  user-select: none;
  transition: border-color 0.12s ease, background 0.12s ease;
}

.cloud__item:hover,
.cloud__item:focus-visible {
  border-color: var(--vc-purple-border);
  outline: none;
}

.cloud__item.is-selected {
  border-color: var(--vc-purple);
  background: var(--vc-purple-soft);
}

.cloud__item.is-drop {
  border-color: var(--vc-purple);
  border-style: dashed;
  background: var(--vc-purple-soft);
}

.cloud__item.is-locked {
  background: var(--vc-surface-muted);
  border-style: dashed;
}

.cloud__item.is-locked .cloud__item-icon {
  color: var(--vc-text-faint);
}

.cloud__item-icon {
  color: var(--vc-purple);
}

.cloud__item-name {
  font-size: 0.88rem;
  font-weight: 500;
  /* A name with no spaces has to break somewhere, or one card pushes the whole row wide */
  overflow-wrap: anywhere;
}

.cloud__item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.cloud__item-tags .vc-chip {
  font-size: 0.7rem;
  padding: 1px 7px;
}

.cloud__item-meta {
  display: flex;
  gap: 8px;
  color: var(--vc-text-faint);
  font-size: 0.75rem;
  white-space: nowrap;
}

.cloud__rename {
  padding: 3px 6px;
  font-size: 0.85rem;
}

/* The two shapes of the same item: a card on the grid, a line on the list. */
.cloud__grid .cloud__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding: 14px 10px 10px;
}

.cloud__grid .cloud__item-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
  min-width: 0;
}

/*
 * Three lines and no more. A grid row is as tall as its tallest card, so one file named by a script
 * used to leave four empty cards the height of the screen beside it. The whole name is in the title.
 */
.cloud__grid .cloud__item-name {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cloud__list .cloud__item {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
}

.cloud__list .cloud__item-body {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.cloud__list .cloud__item-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cloud__item.is-new {
  border-color: var(--vc-purple-border);
  border-style: dashed;
}

/* ----------------------------------------------------------------- dialogs */







.cloud__editor {
  min-height: 320px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85rem;
}

</style>
