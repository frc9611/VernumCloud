<template>
  <ModalDialog wide :title="'Compartilhar ' + item.name" @close="$emit('close')">
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
            <td style="text-align: right; white-space: nowrap">
              <!-- Taking an access away is not undone by anything, so it is asked twice -->
              <template v-if="removingId === share.shareId">
                <span class="vc-small vc-danger-text" style="margin-right: 6px">Tirar o acesso?</span>
                <button class="vc-btn vc-btn--danger vc-btn--small" type="button" @click="removeShare(share)">
                  Remover
                </button>
                <button class="vc-btn vc-btn--ghost vc-btn--small" style="margin-left: 6px" type="button"
                        @click="removingId = null">
                  Cancelar
                </button>
              </template>
              <button v-else class="vc-btn vc-btn--danger vc-btn--small" type="button"
                      @click="removingId = share.shareId">
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
      <label class="vc-label" for="shareSearch">Compartilhar com</label>

      <div v-if="chosen" class="cloud-share__chosen">
        <AppIcon :name="targetIcon(chosen)" :size="16" :style="chosen.color ? { color: chosen.color } : null" />
        <strong>{{ chosen.label }}</strong>
        <span class="vc-faint">{{ chosen.hint }}</span>
        <span v-if="chosen.external" class="vc-chip vc-chip--warning">externo</span>
        <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="clearTarget">Trocar</button>
      </div>

      <template v-else>
        <input id="shareSearch" class="vc-input" type="text" autocomplete="off" v-model="search"
               placeholder="Nome de uma pessoa, de uma divisão ou de uma equipe..." @input="searchTargets" />
        <div v-if="targets.length" class="cloud-share__suggest">
          <button v-for="target in targets" :key="target.granteeType + target.id" type="button"
                  class="cloud-share__item" @click="chosen = target">
            <AppIcon :name="targetIcon(target)" :size="15" :style="target.color ? { color: target.color } : null" />
            <span class="cloud-share__label">{{ target.label }}</span>
            <span class="vc-faint">{{ target.hint }}</span>
            <span v-if="target.external" class="vc-chip vc-chip--warning">externo</span>
          </button>
        </div>
        <span v-else class="vc-faint">Nenhum destino com esse nome.</span>
      </template>
    </div>

    <div class="vc-field">
      <label class="vc-label" for="accessLevel">Nível de acesso</label>
      <select id="accessLevel" class="vc-select" v-model="level">
        <option value="VIEW">Ver e baixar</option>
        <option value="EDIT">Ver, enviar e alterar</option>
        <option value="MANAGE">Gerenciar e compartilhar</option>
      </select>
    </div>

    <template #footer>
      <button class="vc-btn vc-btn--ghost" type="button" @click="$emit('close')">Fechar</button>
      <button class="vc-btn" type="button" :disabled="!chosen" @click="addShare">Compartilhar</button>
    </template>
  </ModalDialog>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useToast } from 'vue-toastification';
import ModalDialog from '@/components/ModalDialog.vue';
import AppIcon from '@/components/AppIcon.vue';
import { cloud } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

/*
 * Who reaches one folder or one file, and the field that adds somebody.
 *
 * The server answers who the caller may share with — members of the team, its divisions and, only
 * for whoever can share externally, people and teams from outside. Asking it instead of listing
 * everything keeps the field from suggesting a destination the server would refuse.
 */
const props = defineProps({
  kind: { type: String, required: true },
  item: { type: Object, required: true },
});

defineEmits(['close']);

const toast = useToast();
const shares = ref([]);
const targets = ref([]);
const search = ref('');
const chosen = ref(null);
const level = ref('VIEW');
const removingId = ref(null);
let timer = null;

onMounted(() => Promise.all([loadShares(), loadTargets()]));

//The debounce outlives the dialog otherwise, and fires one more search into a closed screen
onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
  timer = null;
});

async function loadShares() {
  try {
    const { data } = props.kind === 'folder'
      ? await cloud.folderShares(props.item.id)
      : await cloud.fileShares(props.item.fileId);
    shares.value = data;
  } catch (error) {
    shares.value = [];
  }
  removingId.value = null;
}

async function loadTargets() {
  try {
    const { data } = props.kind === 'folder'
      ? await cloud.folderShareTargets(props.item.id, search.value)
      : await cloud.fileShareTargets(props.item.fileId, search.value);
    targets.value = data;
  } catch (error) {
    targets.value = [];
  }
}

/** Waits for the typing to stop before asking the server again. */
function searchTargets() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(loadTargets, 180);
}

function clearTarget() {
  chosen.value = null;
  search.value = '';
  loadTargets();
}

async function addShare() {
  if (!chosen.value) return;
  const target = chosen.value;
  const body = { granteeType: target.granteeType, accessLevel: level.value };
  if (target.granteeType === 'USER') body.granteeUserId = target.id;
  if (target.granteeType === 'DIVISION') body.granteeDivisionId = Number(target.id);
  if (target.granteeType === 'TENANT') body.granteeTenantId = Number(target.id);
  try {
    if (props.kind === 'folder') await cloud.shareFolder(props.item.id, body);
    else await cloud.shareFile(props.item.fileId, body);
    clearTarget();
    await loadShares();
    toast.success('Compartilhado!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao compartilhar'));
  }
}

async function removeShare(share) {
  removingId.value = null;
  try {
    await cloud.removeShare(share.shareId);
    await loadShares();
    toast.info('Compartilhamento removido.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao remover compartilhamento'));
  }
}

function targetIcon(target) {
  return { USER: 'users', DIVISION: 'divisions', TENANT: 'shield' }[target.granteeType] || 'users';
}

function accessLabel(value) {
  return {
    NONE: 'Sem acesso',
    VIEW: 'Ver e baixar',
    EDIT: 'Ver, enviar e alterar',
    MANAGE: 'Gerenciar e compartilhar',
  }[value] || value;
}

function granteeLabel(type) {
  return { USER: 'pessoa', DIVISION: 'divisão', TENANT: 'equipe' }[type] || type;
}
</script>

<style scoped>
.cloud-share__suggest {
  margin-top: 6px;
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius);
  background: var(--vc-surface);
  max-height: 230px;
  overflow-y: auto;
}

.cloud-share__item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: none;
  border-bottom: 1px solid var(--vc-border);
  background: none;
  font: inherit;
  text-align: left;
  padding: 8px 10px;
  cursor: pointer;
}

.cloud-share__item:last-child {
  border-bottom: none;
}

.cloud-share__item:hover {
  background: var(--vc-purple-soft);
}

.cloud-share__label {
  font-weight: 500;
}

.cloud-share__chosen {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  border: 1px solid var(--vc-purple-border);
  border-radius: var(--vc-radius);
  background: var(--vc-purple-soft);
  padding: 8px 10px;
}
</style>
