<template>
  <main class="vc-page vc-page--wide">
    <div class="vc-stack">
      <div class="vc-row vc-row--between">
        <h1 class="vc-title vc-title--underlined">Usuários da plataforma</h1>
        <div class="vc-row">
          <router-link class="vc-btn vc-btn--ghost" :to="{ name: 'adminTenants' }">Equipes</router-link>
          <button class="vc-btn vc-btn--ghost" type="button" :disabled="loading" @click="load">
            <AppIcon name="refresh" :size="16" />
            Atualizar
          </button>
        </div>
      </div>

      <AlertBanner variant="info" title="Todas as contas, de todas as equipes." aside="Permissões TENANT_*">
        Aqui a equipe aberta não importa: a lista cruza a plataforma inteira. Desativar uma conta barra o
        próximo login — o token em uso ainda vale por até duas horas —, e apagar tira a pessoa de todas as
        equipes e remove tudo o que aponta para ela.
      </AlertBanner>

      <div class="users__toolbar">
        <label class="vc-input-group users__search">
          <AppIcon name="search" :size="16" />
          <input class="vc-input" type="search" v-model="search" placeholder="Nome, usuário ou e-mail"
                 aria-label="Buscar usuário" />
        </label>
        <div class="users__filters" role="group" aria-label="Filtro">
          <button v-for="option in FILTERS" :key="option.key" type="button"
                  :class="['vc-chip', 'vc-chip--button', filter === option.key ? 'vc-chip--purple' : '']"
                  :aria-pressed="filter === option.key ? 'true' : 'false'"
                  @click="filter = option.key">
            {{ option.label }}
            <span class="users__count">{{ counts[option.key] }}</span>
          </button>
        </div>
      </div>

      <div class="vc-table-wrap">
        <table class="vc-table">
          <thead>
            <tr><th>Pessoa</th><th>Situação</th><th>Equipes</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="row in filtered" :key="row.user.userId" :class="{ 'is-inactive': !isActive(row.user) }">
              <td>
                <div class="users__person">
                  <span class="vc-avatar users__avatar" aria-hidden="true">{{ initials(row.user) }}</span>
                  <div class="users__text">
                    <strong><PersonLink :user-id="row.user.userId" :name="displayName(row.user)" /></strong>
                    <span class="vc-faint">
                      @{{ row.user.username }}<template v-if="row.user.email"> · {{ row.user.email }}</template>
                    </span>
                  </div>
                </div>
              </td>
              <td>
                <div class="users__badges">
                  <span class="vc-badge" :class="isActive(row.user) ? 'vc-badge--on' : 'vc-badge--off'">
                    {{ isActive(row.user) ? 'Ativo' : 'Desativado' }}
                  </span>
                  <span v-if="row.user.mustChangePassword" class="vc-chip vc-chip--warning"
                        title="Ainda entra com a senha de uso único e escolhe a própria no primeiro login.">
                    senha provisória
                  </span>
                  <span v-if="isPlatformAdmin(row)" class="vc-chip vc-chip--danger"
                        title="Membro da equipe administradora.">
                    plataforma
                  </span>
                </div>
              </td>
              <td>
                <div v-if="row.memberships.length" class="users__chips">
                  <span v-for="membership in row.memberships" :key="membership.tenantId"
                        :class="['vc-chip', 'users__team', dimmed(membership) ? 'is-dim' : '']"
                        :title="membershipTitle(membership)">
                    <span class="vc-dot" :style="{ background: membership.tenantColor || '#8864AE' }"></span>
                    {{ membership.tenantName }}
                    <span class="users__role">{{ membership.roleLabel }}</span>
                  </span>
                </div>
                <span v-else class="vc-faint">sem equipe</span>
              </td>
              <td class="users__actions">
                <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="open(row)">
                  {{ canManage ? 'Gerenciar' : 'Detalhes' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <EmptyState v-if="!loading && !filtered.length"
                    :title="list.length ? 'Ninguém com esse filtro' : 'Nenhum usuário encontrado'">
          <template v-if="list.length">Troque o filtro ou limpe a busca.</template>
          <template v-else>Tente outro nome, usuário ou e-mail.</template>
        </EmptyState>
      </div>
    </div>

    <!-- ------------------------------------------------------------ person -->
    <ModalDialog v-if="selected" wide :title="displayName(selected.user)" @close="close">
      <div class="users__head">
        <span class="vc-avatar users__avatar users__avatar--big" aria-hidden="true">{{ initials(selected.user) }}</span>
        <div class="users__headtext">
          <div class="users__badges">
            <span class="vc-badge" :class="isActive(selected.user) ? 'vc-badge--on' : 'vc-badge--off'">
              {{ isActive(selected.user) ? 'Ativo' : 'Desativado' }}
            </span>
            <span v-if="selected.user.mustChangePassword" class="vc-chip vc-chip--warning">senha provisória</span>
            <span v-if="isPlatformAdmin(selected)" class="vc-chip vc-chip--danger">administra a plataforma</span>
            <span v-if="isMe(selected.user)" class="vc-chip">você</span>
          </div>
          <p class="vc-faint users__details">
            @{{ selected.user.username }}
            <template v-if="selected.user.email"> · {{ selected.user.email }}</template>
            <template v-if="selected.user.birthDate"> · nasc. {{ formatDate(selected.user.birthDate) }}</template>
            <template v-if="selected.user.course"> · {{ selected.user.course }}</template>
            <template v-if="selected.user.schoolClass"> · turma {{ selected.user.schoolClass }}</template>
          </p>
        </div>
      </div>

      <div v-if="canManage" class="vc-row users__row-actions">
        <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="editing ? (editing = false) : startEdit()">
          <AppIcon name="edit" :size="14" />
          {{ editing ? 'Cancelar edição' : 'Editar dados' }}
        </button>
        <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" :disabled="busy" @click="resetPassword">
          <AppIcon name="key" :size="14" />
          Redefinir senha
        </button>
        <button v-if="!isMe(selected.user)" class="vc-btn vc-btn--ghost vc-btn--small" type="button"
                :disabled="busy" @click="toggleActive">
          <AppIcon name="power" :size="14" />
          {{ isActive(selected.user) ? 'Desativar' : 'Reativar' }}
        </button>
        <span class="vc-spacer"></span>
        <button v-if="!isMe(selected.user)" class="vc-btn vc-btn--danger vc-btn--small" type="button"
                :disabled="busy" @click="deleteAccount">
          <AppIcon name="trash" :size="14" />
          Apagar conta
        </button>
      </div>

      <form v-if="editing" class="users__form" @submit.prevent="saveUser">
        <div class="vc-grid">
          <div class="vc-field">
            <label class="vc-label" for="editName">Nome</label>
            <input id="editName" class="vc-input" type="text" v-model="form.name" required />
          </div>
          <div class="vc-field">
            <label class="vc-label" for="editUsername">Usuário</label>
            <input id="editUsername" class="vc-input" type="text" v-model="form.username" required />
          </div>
          <div class="vc-field">
            <label class="vc-label" for="editEmail">E-mail</label>
            <input id="editEmail" class="vc-input" type="email" v-model="form.email" />
          </div>
          <div class="vc-field">
            <label class="vc-label" for="editBirth">Nascimento</label>
            <input id="editBirth" class="vc-input" type="date" v-model="form.birthDate" />
          </div>
          <div class="vc-field">
            <label class="vc-label" for="editCourse">Curso</label>
            <input id="editCourse" class="vc-input" type="text" v-model="form.course" />
          </div>
          <div class="vc-field">
            <label class="vc-label" for="editClass">Turma</label>
            <input id="editClass" class="vc-input" type="text" v-model="form.schoolClass" />
          </div>
        </div>
        <div class="vc-row" style="justify-content: flex-end">
          <button class="vc-btn vc-btn--small" type="submit" :disabled="busy">Salvar dados</button>
        </div>
      </form>

      <div class="vc-divider"></div>

      <SectionTitle lead="Equipes da" title="pessoa">
        <template #actions>
          <button v-if="canManage && !adding" class="vc-btn vc-btn--small" type="button" @click="startAdd">
            <AppIcon name="plus" :size="14" />
            Adicionar a equipe
          </button>
        </template>
      </SectionTitle>

      <form v-if="adding" class="users__add" @submit.prevent="addToTeam">
        <div class="vc-field">
          <label class="vc-label" for="addTeam">Equipe</label>
          <select id="addTeam" class="vc-select" v-model="addForm.tenantId" required>
            <option value="">Escolha uma equipe</option>
            <option v-for="team in availableTeams" :key="team.tenantId" :value="team.tenantId">
              {{ teamLabel(team) }}
            </option>
          </select>
          <span v-if="addingToSystem" class="vc-warning-text vc-small">
            A equipe administradora concede permissões sobre a plataforma inteira.
          </span>
        </div>
        <div class="vc-field">
          <label class="vc-label" for="addRole">Cargo</label>
          <select id="addRole" class="vc-select" v-model="addForm.role">
            <option v-for="role in roles" :key="role.name" :value="role.name">{{ role.label }}</option>
          </select>
          <span class="vc-faint">{{ roleHint(addForm.role) }}</span>
        </div>
        <div class="users__add-actions">
          <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="adding = false">Cancelar</button>
          <button class="vc-btn vc-btn--small" type="submit" :disabled="!addForm.tenantId || busy">Adicionar</button>
        </div>
      </form>

      <div v-if="selected.memberships.length" class="vc-list users__memberships">
        <div v-for="membership in selected.memberships" :key="membership.tenantId"
             :class="['vc-list__item', 'vc-list__item--plain', dimmed(membership) ? 'is-dim' : '']">
          <span class="vc-dot" :style="{ background: membership.tenantColor || '#8864AE' }"></span>
          <div class="vc-list__text">
            <strong>
              {{ membership.tenantName }}
              <span v-if="membership.teamNumber" class="vc-faint">nº {{ membership.teamNumber }}</span>
            </strong>
            <span>
              <template v-if="membership.systemTenant">equipe administradora · </template>
              <template v-if="!membership.tenantActive">equipe desativada · </template>
              <template v-if="!membership.active">membro suspenso · </template>
              <template v-if="membership.joinedAt">desde {{ formatDate(membership.joinedAt) }}</template>
              <template v-else>membro</template>
            </span>
          </div>
          <div class="vc-list__aside users__membership-actions">
            <select v-if="canManage" class="vc-select users__role-select" :value="membership.role"
                    :disabled="busy" :aria-label="'Cargo em ' + membership.tenantName"
                    @change="changeRole(membership, $event.target.value)">
              <option v-for="role in roles" :key="role.name" :value="role.name">{{ role.label }}</option>
            </select>
            <span v-else class="vc-badge vc-badge--purple">{{ membership.roleLabel }}</span>
            <button v-if="canManage" class="vc-btn vc-btn--danger vc-btn--small" type="button"
                    :disabled="busy" @click="removeMembership(membership)">
              Remover
            </button>
          </div>
        </div>
      </div>
      <EmptyState v-else title="Sem equipe">
        Essa conta existe, mas não está em equipe nenhuma — quem entra assim cai na sala de espera.
      </EmptyState>

      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="close">Fechar</button>
      </template>
    </ModalDialog>

    <!-- --------------------------------------------------- one-time password -->
    <ModalDialog v-if="reset" title="Senha provisória" @close="reset = null">
      <AlertBanner variant="warning" icon="key" title="Copie agora: ela não aparece de novo.">
        {{ reset.name || reset.username }} entra com essa senha uma única vez e escolhe a própria na
        primeira tela. Se for entregar em mãos, anote num papel — nada de mandar por mensagem.
      </AlertBanner>
      <div class="vc-field">
        <label class="vc-label" for="resetUsername">Usuário</label>
        <div class="vc-input-group">
          <input id="resetUsername" class="vc-input" type="text" readonly :value="reset.username" />
          <button class="vc-btn vc-btn--icon" type="button" title="Copiar" @click="copy(reset.username)">
            <AppIcon name="copy" :size="16" />
          </button>
        </div>
      </div>
      <div class="vc-field">
        <label class="vc-label" for="resetPassword">Senha de uso único</label>
        <div class="vc-input-group">
          <input id="resetPassword" class="vc-input users__password" type="text" readonly :value="reset.password" />
          <button class="vc-btn vc-btn--icon" type="button" title="Copiar" @click="copy(reset.password)">
            <AppIcon name="copy" :size="16" />
          </button>
        </div>
      </div>
      <template #footer>
        <button class="vc-btn" type="button" @click="reset = null">Já copiei</button>
      </template>
    </ModalDialog>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'vue-toastification';
import AlertBanner from '@/components/AlertBanner.vue';
import PersonLink from '@/components/PersonLink.vue';
import AppIcon from '@/components/AppIcon.vue';
import EmptyState from '@/components/EmptyState.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import { authStore } from '@/store/auth.js';
import { catalogs, platform, tenants, users } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

/*
 * Every account of the platform, from the administrator team.
 *
 * The list crosses the tenant boundary on purpose: it is the one place where somebody sees which
 * teams a person is in, hands them a new one-time password, or deactivates the account. Nothing
 * here depends on the team open — the routes are the /platform ones, gated by the permissions of
 * the administrator tenant. Reading needs TENANT_VIEW_ALL; every button needs TENANT_UPDATE.
 */
const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'password', label: 'Senha provisória' },
  { key: 'inactive', label: 'Desativados' },
  { key: 'noTeam', label: 'Sem equipe' },
  { key: 'platform', label: 'Administradores' },
];
const SEARCH_DELAY_MS = 350;

const auth = authStore();
const route = useRoute();
const toast = useToast();

const list = ref([]);
const loading = ref(false);
const search = ref('');
const filter = ref(route.query.filtro === 'senha' ? 'password' : 'all');

const roles = ref([]);
const teams = ref([]);

const selected = ref(null);
const busy = ref(false);
const editing = ref(false);
const form = reactive({ name: '', username: '', email: '', birthDate: '', course: '', schoolClass: '' });
const adding = ref(false);
const addForm = reactive({ tenantId: '', role: 'MEMBER' });
const reset = ref(null);

const canManage = computed(() => auth.canPlatform('TENANT_UPDATE'));

const filtered = computed(() => list.value.filter((row) => matches(row, filter.value)));
const counts = computed(() => {
  const result = {};
  FILTERS.forEach((option) => {
    result[option.key] = list.value.filter((row) => matches(row, option.key)).length;
  });
  return result;
});

/* Teams the person is not in yet, active ones first, the administrator one labelled. */
const availableTeams = computed(() => {
  if (!selected.value) return [];
  const already = new Set(selected.value.memberships.map((membership) => membership.tenantId));
  return teams.value
    .filter((team) => !already.has(team.tenantId))
    .sort((a, b) => Number(b.active !== false) - Number(a.active !== false)
      || a.visibleName.localeCompare(b.visibleName));
});
const addingToSystem = computed(
  () => !!teams.value.find((team) => team.tenantId === addForm.tenantId)?.systemTenant,
);

let searchTimer = null;

onMounted(async () => {
  await Promise.all([load(), loadCatalogs()]);
});
onBeforeUnmount(() => clearTimeout(searchTimer));

//The server searches name, username and e-mail; the box only waits for the person to stop typing
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(load, SEARCH_DELAY_MS);
});

/* -------------------------------------------------------------- loading */

async function load() {
  loading.value = true;
  try {
    const { data } = await platform.users(search.value.trim());
    list.value = data;
    //The row open in the modal has to show what the server holds now
    if (selected.value) {
      const fresh = data.find((row) => row.user.userId === selected.value.user.userId);
      selected.value = fresh || null;
    }
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar usuários'));
  } finally {
    loading.value = false;
  }
}

async function loadCatalogs() {
  try {
    const [roleList, teamList] = await Promise.all([catalogs.membershipRoles(), tenants.list()]);
    roles.value = roleList.data;
    teams.value = teamList.data;
  } catch (error) {
    roles.value = [];
    teams.value = [];
  }
}

function matches(row, key) {
  switch (key) {
    case 'password': return !!row.user.mustChangePassword;
    case 'inactive': return !isActive(row.user);
    case 'noTeam': return !row.memberships.length;
    case 'platform': return isPlatformAdmin(row);
    default: return true;
  }
}

/* --------------------------------------------------------------- helpers */

/** `active` is null on rows older than the flag, and null means active. */
function isActive(user) {
  return user.active !== false;
}

function isMe(user) {
  return user.userId === auth.user?.userId;
}

function isPlatformAdmin(row) {
  return row.memberships.some((membership) => membership.systemTenant && membership.active);
}

function dimmed(membership) {
  return !membership.tenantActive || !membership.active;
}

function membershipTitle(membership) {
  const parts = [membership.roleLabel + ' em ' + membership.tenantName];
  if (membership.systemTenant) parts.push('equipe administradora');
  if (!membership.tenantActive) parts.push('equipe desativada');
  if (!membership.active) parts.push('membro suspenso');
  return parts.join(' · ');
}

function displayName(user) {
  return user.name?.trim() || user.username;
}

function initials(user) {
  const words = displayName(user).split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : words[0]?.slice(0, 2) || '?';
  return letters.toUpperCase();
}

/** 'YYYY-MM-DD' or an ISO date-time to the Brazilian day. */
function formatDate(value) {
  if (!value) return '';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

function teamLabel(team) {
  let label = team.visibleName;
  if (team.teamNumber) label += ' (nº ' + team.teamNumber + ')';
  if (team.systemTenant) label += ' — administradora da plataforma';
  if (team.active === false) label += ' — inativa';
  return label;
}

function roleHint(roleName) {
  const role = roles.value.find((item) => item.name === roleName);
  if (!role) return '';
  if (!role.defaultPermissions?.length) return 'Nenhuma permissão por padrão: vê apenas o que for compartilhado.';
  return role.defaultPermissions.length + ' permissões por padrão.';
}

async function copy(value) {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    toast.success('Copiado!');
  } catch (error) {
    toast.warning('Copie manualmente: ' + value);
  }
}

/** The session only has to be reloaded when the change touched the person logged in. */
async function refreshAfter(userId) {
  await load();
  if (userId === auth.user?.userId) {
    await auth.loadMe();
  }
}

/* ---------------------------------------------------------------- person */

function open(row) {
  selected.value = row;
  editing.value = false;
  adding.value = false;
}

function close() {
  selected.value = null;
  editing.value = false;
  adding.value = false;
}

function startEdit() {
  const user = selected.value.user;
  Object.assign(form, {
    name: user.name || '',
    username: user.username || '',
    email: user.email || '',
    birthDate: user.birthDate || '',
    course: user.course || '',
    schoolClass: user.schoolClass || '',
  });
  editing.value = true;
}

async function saveUser() {
  const user = selected.value.user;
  const name = form.name.trim();
  const username = form.username.trim();
  if (!name || !username) {
    toast.error('Nome e usuário não podem ficar em branco.');
    return;
  }
  busy.value = true;
  try {
    //PUT /users/{id} leaves a null field alone, so a blank one keeps what the account has
    await users.update(user.userId, {
      name,
      username,
      email: form.email.trim() || null,
      birthDate: form.birthDate || null,
      course: form.course.trim() || null,
      schoolClass: form.schoolClass.trim() || null,
    });
    editing.value = false;
    await refreshAfter(user.userId);
    toast.success('Dados salvos!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao salvar os dados'));
  } finally {
    busy.value = false;
  }
}

async function resetPassword() {
  const user = selected.value.user;
  if (!window.confirm(`Redefinir a senha de ${displayName(user)}? A senha atual deixa de valer agora.`)) return;
  busy.value = true;
  try {
    const { data } = await platform.resetPassword(user.userId);
    //Shown once: the server does not keep the plain text and neither does this screen
    reset.value = data;
    await refreshAfter(user.userId);
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao redefinir a senha'));
  } finally {
    busy.value = false;
  }
}

async function toggleActive() {
  const user = selected.value.user;
  const activate = !isActive(user);
  if (!activate && !window.confirm(
    `Desativar a conta de ${displayName(user)}? A pessoa não consegue mais entrar; as equipes dela ficam como estão.`,
  )) return;
  busy.value = true;
  try {
    await platform.setActive(user.userId, activate);
    await refreshAfter(user.userId);
    toast.success(activate ? 'Conta reativada.' : 'Conta desativada.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao alterar a conta'));
  } finally {
    busy.value = false;
  }
}

async function deleteAccount() {
  const user = selected.value.user;
  const name = displayName(user);
  if (!window.confirm(
    `Apagar a conta de ${name}? A pessoa sai de todas as equipes e tudo o que aponta para ela vai junto. Não dá para desfazer.`,
  )) return;
  const typed = window.prompt(`Para confirmar, digite o usuário: ${user.username}`);
  if (typed === null) return;
  if (typed.trim() !== user.username) {
    toast.warning('O usuário digitado não confere; nada foi apagado.');
    return;
  }
  busy.value = true;
  try {
    await platform.deleteUser(user.userId);
    close();
    await load();
    toast.info(`A conta de ${name} foi apagada.`);
  } catch (error) {
    //The 422 names the team that still needs another owner: worth showing as it came
    toast.error(apiMessage(error, 'Erro ao apagar a conta'));
  } finally {
    busy.value = false;
  }
}

/* ----------------------------------------------------------- memberships */

function startAdd() {
  addForm.tenantId = '';
  addForm.role = 'MEMBER';
  adding.value = true;
}

async function addToTeam() {
  const user = selected.value.user;
  const team = teams.value.find((item) => item.tenantId === addForm.tenantId);
  if (team?.systemTenant && !window.confirm(
    `Colocar ${displayName(user)} na equipe administradora? A pessoa passa a administrar a plataforma inteira.`,
  )) return;
  busy.value = true;
  try {
    await platform.addMember(addForm.tenantId, { userId: user.userId, role: addForm.role });
    adding.value = false;
    await refreshAfter(user.userId);
    toast.success(`${displayName(user)} entrou em ${team?.visibleName || 'equipe'}.`);
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao adicionar à equipe'));
  } finally {
    busy.value = false;
  }
}

async function changeRole(membership, role) {
  const user = selected.value.user;
  busy.value = true;
  try {
    await platform.updateMember(membership.tenantId, user.userId, { role });
    await refreshAfter(user.userId);
    toast.success('Cargo atualizado!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao mudar o cargo'));
    //Puts the select back on what the server holds
    await load();
  } finally {
    busy.value = false;
  }
}

async function removeMembership(membership) {
  const user = selected.value.user;
  if (!window.confirm(`Tirar ${displayName(user)} de ${membership.tenantName}?`)) return;
  busy.value = true;
  try {
    await platform.removeMember(membership.tenantId, user.userId);
    await refreshAfter(user.userId);
    toast.info(`${displayName(user)} saiu de ${membership.tenantName}.`);
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao remover da equipe'));
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.users__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
}

.users__search {
  flex: 1 1 260px;
  max-width: 420px;
  color: var(--vc-text-faint);
}

.users__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.users__count {
  font-size: 0.72rem;
  opacity: 0.75;
}

.users__person {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.users__avatar {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--vc-purple-strong);
  background: var(--vc-purple-soft);
}

.users__avatar--big {
  width: 46px;
  height: 46px;
  font-size: 1rem;
}

.users__text {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.users__text strong {
  font-size: 0.92rem;
}

.users__badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.users__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  max-width: 560px;
}

.users__team {
  gap: 5px;
  padding: 2px 8px;
  font-size: 0.76rem;
}

.users__team .vc-dot {
  width: 7px;
  height: 7px;
}

.users__role {
  color: var(--vc-text-faint);
}

/* A membership in a deactivated team, or a suspended one: still there, clearly not in force. */
.is-dim {
  opacity: 0.55;
  border-style: dashed;
}

.users__actions {
  text-align: right;
  white-space: nowrap;
}

tr.is-inactive td {
  color: var(--vc-text-muted);
}

.users__head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.users__headtext {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.users__details {
  margin: 0;
}

.users__row-actions {
  gap: 6px;
}

.users__form,
.users__add {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius);
  background: var(--vc-surface-muted);
}

.users__add-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.users__memberships {
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius);
  overflow: hidden;
}

.users__memberships .vc-list__item.is-dim {
  border-style: solid;
}

.users__membership-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.users__role-select {
  max-width: 160px;
  padding-top: 4px;
  padding-bottom: 4px;
  font-size: 0.85rem;
}

.users__password {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 1.15rem;
  letter-spacing: 0.04em;
}
</style>
