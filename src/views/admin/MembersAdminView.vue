<template>
  <main class="vc-page vc-page--wide">
    <div class="vc-stack">
      <div class="vc-row vc-row--between">
        <h1 class="vc-title vc-title--underlined">Membros de {{ auth.activeTenantName }}</h1>
        <div class="vc-row">
          <router-link v-if="auth.can('MEMBER_INVITE')" class="vc-btn vc-btn--ghost" :to="{ name: 'createUser' }">
            Cadastrar novo usuário
          </router-link>
          <button v-if="auth.can('MEMBER_INVITE')" class="vc-btn" type="button" @click="openInvite">
            Adicionar membro
          </button>
        </div>
      </div>

      <input class="vc-input" type="text" placeholder="Buscar por nome, usuário ou cargo" v-model="search" />

      <div class="vc-table-wrap">
        <table class="vc-table">
          <thead>
            <tr>
              <th>Nome</th><th>Usuário</th><th>Cargo na equipe</th><th>Divisões</th>
              <th>Permissões</th><th>Situação</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="member in filtered" :key="member.membershipId">
              <td>{{ member.user.name }}</td>
              <td class="vc-faint">{{ member.user.username }}</td>
              <td>
                <select
                  v-if="auth.can('MEMBER_UPDATE')"
                  class="vc-select"
                  style="max-width: 165px"
                  :value="member.role"
                  @change="changeRole(member, $event.target.value)"
                >
                  <option v-for="role in roles" :key="role.name" :value="role.name">{{ role.label }}</option>
                </select>
                <span v-else class="vc-badge vc-badge--purple">{{ member.roleLabel }}</span>
              </td>
              <td>
                <span v-for="division in member.divisions" :key="division.divisionMembershipId" class="vc-chip" style="margin: 2px">
                  {{ division.divisionVisibleName }}
                </span>
                <span v-if="!member.divisions.length" class="vc-faint">—</span>
              </td>
              <td>
                <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="openPermissions(member)">
                  {{ member.permissions.length }} permissões
                </button>
              </td>
              <td>
                <span class="vc-badge" :class="member.active ? 'vc-badge--on' : 'vc-badge--off'">
                  {{ member.active ? 'Ativo' : 'Suspenso' }}
                </span>
              </td>
              <td style="text-align: right; white-space: nowrap">
                <button v-if="auth.can('MEMBER_UPDATE')" class="vc-btn vc-btn--ghost vc-btn--small"
                        type="button" @click="toggleActive(member)">
                  {{ member.active ? 'Suspender' : 'Reativar' }}
                </button>
                <button v-if="auth.can('MEMBER_REMOVE')" class="vc-btn vc-btn--danger vc-btn--small"
                        style="margin-left: 6px" type="button" @click="remove(member)">
                  Remover
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <EmptyState v-if="!filtered.length" title="Nenhum membro">Adicione pessoas à equipe.</EmptyState>
      </div>
    </div>

    <!-- --------------------------------------------------------- invite -->
    <ModalDialog v-if="inviting" title="Adicionar membro à equipe" @close="inviting = false">
      <div class="vc-field">
        <label class="vc-label" for="search">Buscar usuário da plataforma</label>
        <div class="vc-input-group">
          <input id="search" class="vc-input" type="text" v-model="candidateSearch" placeholder="Nome ou usuário" />
          <button class="vc-btn vc-btn--ghost" type="button" @click="loadCandidates">Buscar</button>
        </div>
      </div>
      <div class="vc-field">
        <label class="vc-label" for="candidate">Pessoa</label>
        <select id="candidate" class="vc-select" v-model="invite.userId">
          <option value="">Escolha uma pessoa</option>
          <option v-for="candidate in candidates" :key="candidate.userId" :value="candidate.userId">
            {{ candidate.name }} ({{ candidate.username }})
          </option>
        </select>
      </div>
      <div class="vc-field">
        <label class="vc-label" for="role">Cargo na equipe</label>
        <select id="role" class="vc-select" v-model="invite.role">
          <option v-for="role in roles" :key="role.name" :value="role.name">{{ role.label }}</option>
        </select>
        <span class="vc-faint">{{ roleHint(invite.role) }}</span>
      </div>
      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="inviting = false">Cancelar</button>
        <button class="vc-btn" type="button" :disabled="!invite.userId" @click="addMember">Adicionar</button>
      </template>
    </ModalDialog>

    <!-- ---------------------------------------------------- permissions -->
    <ModalDialog v-if="editingPermissions" wide
                 :title="'Permissões de ' + editingPermissions.user.name" @close="editingPermissions = null">
      <p class="vc-faint" style="margin: 0">
        O cargo <strong>{{ editingPermissions.roleLabel }}</strong> já concede as permissões marcadas em
        cinza. As marcadas aqui são concedidas individualmente, além do cargo.
      </p>

      <div v-for="group in permissionGroups" :key="group.scope" class="vc-stack" style="gap: 8px">
        <strong class="vc-small">{{ group.title }}</strong>
        <p v-if="group.scope === 'PLATFORM' && !editingPermissions.tenant.systemTenant" class="vc-faint" style="margin: 0">
          Só existem na equipe administradora.
        </p>
        <div v-else class="permission-grid">
          <label
            v-for="permission in group.items"
            :key="permission.name"
            class="vc-checkbox"
            :title="permission.name"
          >
            <input
              type="checkbox"
              :disabled="!auth.can('PERMISSION_MANAGE') || fromRole(permission.name)"
              :checked="selectedPermissions.includes(permission.name) || fromRole(permission.name)"
              @change="togglePermission(permission.name, $event.target.checked)"
            />
            <span>
              {{ permission.label }}
              <span class="vc-faint" style="display: block">{{ permission.name }}</span>
            </span>
          </label>
        </div>
      </div>

      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="editingPermissions = null">Fechar</button>
        <button v-if="auth.can('PERMISSION_MANAGE')" class="vc-btn" type="button" @click="savePermissions">
          Salvar permissões
        </button>
      </template>
    </ModalDialog>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import ModalDialog from '@/components/ModalDialog.vue';
import EmptyState from '@/components/EmptyState.vue';
import { authStore } from '@/store/auth.js';
import { catalogs, tenants } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

/*
 * Members of the team: cargo, individual permissions and who is suspended.
 *
 * Permissions granted by the cargo are shown checked and disabled, so it is clear which
 * ones come from the preset and which ones were given to that person alone.
 */
const auth = authStore();
const toast = useToast();

const members = ref([]);
const roles = ref([]);
const permissions = ref([]);
const search = ref('');

const inviting = ref(false);
const candidates = ref([]);
const candidateSearch = ref('');
const invite = reactive({ userId: '', role: 'MEMBER' });

const editingPermissions = ref(null);
const selectedPermissions = ref([]);

const permissionGroups = computed(() => [
  { scope: 'TENANT', title: 'Permissões da equipe', items: permissions.value.filter((item) => item.scope === 'TENANT') },
  { scope: 'PLATFORM', title: 'Permissões da plataforma', items: permissions.value.filter((item) => item.scope === 'PLATFORM') },
]);

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return members.value;
  return members.value.filter((member) =>
    [member.user.name, member.user.username, member.roleLabel]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(term)),
  );
});

onMounted(async () => {
  await Promise.all([load(), loadCatalogs()]);
});
watch(() => auth.activeTenantId, load);

async function load() {
  if (!auth.activeTenantId) return;
  try {
    const { data } = await tenants.members(auth.activeTenantId);
    members.value = data;
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar membros'));
  }
}

async function loadCatalogs() {
  try {
    const [rolesResponse, permissionsResponse] = await Promise.all([
      catalogs.membershipRoles(),
      catalogs.permissions(),
    ]);
    roles.value = rolesResponse.data;
    permissions.value = permissionsResponse.data;
  } catch (error) {
    roles.value = [];
    permissions.value = [];
  }
}

function roleHint(roleName) {
  const role = roles.value.find((item) => item.name === roleName);
  if (!role) return '';
  if (!role.defaultPermissions.length) return 'Nenhuma permissão por padrão: vê apenas o que for compartilhado.';
  return role.defaultPermissions.length + ' permissões por padrão.';
}

async function openInvite() {
  inviting.value = true;
  invite.userId = '';
  invite.role = 'MEMBER';
  candidateSearch.value = '';
  await loadCandidates();
}

async function loadCandidates() {
  try {
    const { data } = await tenants.candidates(auth.activeTenantId, candidateSearch.value);
    candidates.value = data;
  } catch (error) {
    candidates.value = [];
  }
}

async function addMember() {
  try {
    await tenants.addMember(auth.activeTenantId, { userId: invite.userId, role: invite.role });
    inviting.value = false;
    await load();
    toast.success('Membro adicionado!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao adicionar membro'));
  }
}

async function changeRole(member, role) {
  try {
    await tenants.updateMember(auth.activeTenantId, member.user.userId, { role });
    await load();
    toast.success('Cargo atualizado!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao atualizar cargo'));
    await load();
  }
}

async function toggleActive(member) {
  try {
    await tenants.updateMember(auth.activeTenantId, member.user.userId, { active: !member.active });
    await load();
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao alterar situação'));
  }
}

async function remove(member) {
  if (!window.confirm('Remover ' + member.user.name + ' da equipe?')) return;
  try {
    await tenants.removeMember(auth.activeTenantId, member.user.userId);
    await load();
    toast.info('Membro removido.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao remover membro'));
  }
}

function openPermissions(member) {
  editingPermissions.value = member;
  selectedPermissions.value = [...member.extraPermissions];
}

/** True when the cargo already grants the permission, so it cannot be unchecked. */
function fromRole(permissionName) {
  const role = roles.value.find((item) => item.name === editingPermissions.value?.role);
  return !!role?.defaultPermissions.includes(permissionName);
}

function togglePermission(permissionName, checked) {
  if (fromRole(permissionName)) return;
  if (checked) {
    if (!selectedPermissions.value.includes(permissionName)) {
      selectedPermissions.value.push(permissionName);
    }
  } else {
    selectedPermissions.value = selectedPermissions.value.filter((item) => item !== permissionName);
  }
}

async function savePermissions() {
  try {
    await tenants.updateMember(auth.activeTenantId, editingPermissions.value.user.userId, {
      extraPermissions: selectedPermissions.value,
    });
    editingPermissions.value = null;
    await load();
    await auth.loadMe();
    toast.success('Permissões salvas!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao salvar permissões'));
  }
}
</script>

<style scoped>
.permission-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 8px 14px;
}
</style>
