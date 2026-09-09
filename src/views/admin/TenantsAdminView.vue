<template>
  <main class="vc-page vc-page--wide">
    <div class="vc-stack">
      <div class="vc-row vc-row--between">
        <h1 class="vc-title vc-title--underlined">Equipes da plataforma</h1>
        <div class="vc-row">
          <router-link class="vc-btn vc-btn--ghost" :to="{ name: 'adminUsers' }">Usuários</router-link>
          <button v-if="auth.canPlatform('TENANT_CREATE')" class="vc-btn" type="button" @click="openCreate">
            Nova equipe
          </button>
        </div>
      </div>

      <AlertBanner variant="info" title="Somente a equipe administradora." aside="Permissões TENANT_*">
        Criar e alterar equipes só funciona para quem é membro da Administração Vernum. Membros e recursos
        de qualquer equipe são cuidados daqui, mesmo de uma da qual você não faz parte.
      </AlertBanner>

      <div class="vc-table-wrap">
        <table class="vc-table">
          <thead>
            <tr>
              <th>Equipe</th><th>Nome de sistema</th><th>Categoria</th><th>Recursos</th>
              <th>Membros</th><th>Divisões</th><th>Situação</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tenant in list" :key="tenant.tenantId" :class="{ 'is-inactive': tenant.active === false }">
              <td>
                <div class="tenants__name">
                  <span class="vc-dot" :style="{ background: tenant.color || '#8864AE' }"></span>
                  <strong>{{ tenant.visibleName }}</strong>
                  <span v-if="tenant.systemTenant" class="vc-badge vc-badge--purple">sistema</span>
                  <span v-if="isMine(tenant)" class="vc-chip tenants__mine" :title="'Você é ' + myRole(tenant)">
                    {{ myRole(tenant) }}
                  </span>
                  <a v-if="hasPublicPage(tenant)" class="tenants__link" :href="publicPageHref(tenant)"
                     target="_blank" rel="noopener" title="Abrir a página pública da equipe">
                    <AppIcon name="link" :size="14" />
                  </a>
                </div>
              </td>
              <td class="vc-mono">{{ tenant.slug }}</td>
              <td>
                {{ tenant.competitionCategory === 'NONE' ? '—' : tenant.competitionCategoryLabel }}
                <div v-if="tenant.teamNumber" class="vc-faint tenants__sub">nº {{ tenant.teamNumber }}</div>
              </td>
              <td>
                <button class="vc-chip vc-chip--button" type="button"
                        :title="(tenant.enabledFeatures || []).join(', ')" @click="openFeatures(tenant)">
                  <AppIcon name="sliders" :size="13" />
                  {{ (tenant.enabledFeatures || []).length }} ligados
                </button>
                <div class="vc-faint tenants__sub">{{ tenant.featureProfileLabel }}</div>
              </td>
              <td>
                <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="openMembers(tenant)">
                  <AppIcon name="users" :size="13" />
                  {{ tenant.memberCount ?? '—' }}
                </button>
              </td>
              <td>{{ tenant.divisionCount ?? '—' }}</td>
              <td>
                <span class="vc-badge" :class="tenant.active !== false ? 'vc-badge--on' : 'vc-badge--off'">
                  {{ tenant.active !== false ? 'Ativa' : 'Inativa' }}
                </span>
              </td>
              <td class="tenants__actions">
                <button v-if="canManage" class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="openEdit(tenant)">
                  Editar
                </button>
                <button v-if="canManage && !tenant.systemTenant" class="vc-btn vc-btn--ghost vc-btn--small"
                        type="button" :disabled="busy" @click="toggleActive(tenant)">
                  {{ tenant.active !== false ? 'Desativar' : 'Reativar' }}
                </button>
                <button v-if="isMine(tenant)" class="vc-btn vc-btn--ghost vc-btn--small" type="button"
                        title="Trocar para essa equipe" @click="openTeam(tenant)">
                  Abrir
                </button>
                <button v-else-if="canManage" class="vc-btn vc-btn--outline vc-btn--small" type="button"
                        :disabled="busy" title="Você entra como proprietário" @click="joinTeam(tenant)">
                  Entrar na equipe
                </button>
                <button v-if="auth.canPlatform('TENANT_DELETE') && !tenant.systemTenant"
                        class="vc-btn vc-btn--danger vc-btn--small" type="button" @click="remove(tenant)">
                  Remover
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <EmptyState v-if="!list.length" title="Nenhuma equipe">Crie a primeira equipe da plataforma.</EmptyState>
      </div>
    </div>

    <!-- ------------------------------------------------------- create / edit -->
    <ModalDialog v-if="editing" :title="form.tenantId ? 'Editar equipe' : 'Nova equipe'" @close="editing = false">
      <div class="vc-field">
        <label class="vc-label" for="visibleName">Nome visível</label>
        <input id="visibleName" class="vc-input" type="text" v-model="form.visibleName" placeholder="CyberRain" />
      </div>
      <div class="vc-field" v-if="!form.tenantId">
        <label class="vc-label" for="slug">Nome de sistema</label>
        <input id="slug" class="vc-input" type="text" v-model="form.slug" placeholder="cyberrain-9611" />
        <span class="vc-faint">Deixe em branco para gerar a partir do nome visível.</span>
      </div>
      <div class="vc-field">
        <label class="vc-label" for="teamNumber">Número da equipe</label>
        <input id="teamNumber" class="vc-input" type="text" v-model="form.teamNumber" placeholder="9611" />
      </div>
      <div class="vc-field">
        <label class="vc-label" for="color">Cor</label>
        <input id="color" class="vc-input" type="color" v-model="form.color" />
      </div>
      <div class="vc-field">
        <label class="vc-label" for="competition">Categoria de competição</label>
        <select id="competition" class="vc-select" v-model="form.competitionCategory">
          <option v-for="option in categories" :key="option.name" :value="option.name">
            {{ option.label }} — {{ option.performanceStyleLabel }}
          </option>
        </select>
        <span class="vc-faint">
          Decide a forma do módulo de performance. "Nenhuma" para uma equipe que não compete.
        </span>
      </div>
      <div class="vc-field" v-if="!form.tenantId">
        <label class="vc-label" for="profile">Perfil de recursos</label>
        <select id="profile" class="vc-select" v-model="form.featureProfile">
          <option v-for="option in applicableProfiles" :key="option.name" :value="option.name">
            {{ option.label }} — {{ option.features.length }} recursos
          </option>
        </select>
        <span class="vc-faint">
          {{ applicableProfiles.find((p) => p.name === form.featureProfile)?.description }}
          Os interruptores mudam depois em "Recursos", na linha da equipe.
        </span>
      </div>
      <div v-if="form.tenantId" class="vc-field">
        <label class="vc-label" for="room">Sala</label>
        <select id="room" class="vc-select" v-model="form.roomId">
          <option :value="0">Nenhuma</option>
          <option v-for="room in rooms" :key="room.roomId" :value="room.roomId">{{ room.name }}</option>
        </select>
        <span class="vc-faint">
          Equipes da mesma sala nunca deixam alguém marcar presença em duas ao mesmo tempo.
          <router-link :to="{ name: 'adminRooms' }">Gerenciar salas</router-link>
        </span>
      </div>
      <div v-if="form.tenantId" class="vc-grid">
        <div class="vc-field">
          <label class="vc-label" for="threshold">Alerta de frequência abaixo de (%)</label>
          <input id="threshold" class="vc-input" type="number" min="0" max="100"
                 v-model.number="form.attendanceThreshold" />
          <span class="vc-faint">Quem fica abaixo disso aparece no painel da equipe.</span>
        </div>
        <div class="vc-field">
          <label class="vc-label" for="reminder">Lembrete de demanda (dias antes)</label>
          <input id="reminder" class="vc-input" type="number" min="0" max="60" v-model.number="form.reminderDays" />
          <span class="vc-faint">O aviso diário alcança as que vencem nesse prazo e as atrasadas.</span>
        </div>
      </div>
      <div class="vc-field">
        <label class="vc-label" for="description">Descrição</label>
        <textarea id="description" class="vc-textarea" v-model="form.description"></textarea>
      </div>
      <div class="vc-field" v-if="!form.tenantId">
        <label class="vc-label" for="owner">Proprietário (username)</label>
        <input id="owner" class="vc-input" type="text" v-model="form.ownerUsername" />
        <span class="vc-faint">Em branco: você mesmo fica como proprietário.</span>
      </div>
      <label v-if="form.tenantId" class="vc-checkbox">
        <input type="checkbox" v-model="form.active" />
        Equipe ativa
      </label>
      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="editing = false">Cancelar</button>
        <button class="vc-btn" type="button" :disabled="busy" @click="save">Salvar</button>
      </template>
    </ModalDialog>

    <!-- ------------------------------------------------------------- members -->
    <ModalDialog v-if="membersOf" wide :title="'Membros de ' + membersOf.visibleName" @close="closeMembers">
      <div class="vc-row vc-row--between">
        <label class="vc-input-group tenants__search">
          <AppIcon name="search" :size="16" />
          <input class="vc-input" type="search" v-model="memberSearch" placeholder="Nome, usuário ou cargo"
                 aria-label="Filtrar membros" />
        </label>
        <button v-if="canManage && !addingMember" class="vc-btn vc-btn--small" type="button" @click="startAddMember">
          <AppIcon name="userPlus" :size="14" />
          Adicionar membro
        </button>
      </div>

      <form v-if="addingMember" class="tenants__add" @submit.prevent="addMember">
        <div class="vc-field">
          <label class="vc-label" for="candidateSearch">Buscar usuário da plataforma</label>
          <div class="vc-input-group">
            <input id="candidateSearch" class="vc-input" type="text" v-model="candidateSearch"
                   placeholder="Nome, usuário ou e-mail" />
            <button class="vc-btn vc-btn--ghost" type="button" @click="loadCandidates">Buscar</button>
          </div>
        </div>
        <div class="vc-grid">
          <div class="vc-field">
            <label class="vc-label" for="candidate">Pessoa</label>
            <select id="candidate" class="vc-select" v-model="newMember.userId" required>
              <option value="">Escolha uma pessoa</option>
              <option v-for="candidate in candidates" :key="candidate.userId" :value="candidate.userId">
                {{ candidate.name || candidate.username }} ({{ candidate.username }})
              </option>
            </select>
            <span v-if="!candidates.length" class="vc-faint">Ninguém fora da equipe com essa busca.</span>
          </div>
          <div class="vc-field">
            <label class="vc-label" for="newRole">Cargo na equipe</label>
            <select id="newRole" class="vc-select" v-model="newMember.role">
              <option v-for="role in roles" :key="role.name" :value="role.name">{{ role.label }}</option>
            </select>
            <span class="vc-faint">{{ roleHint(newMember.role) }}</span>
          </div>
        </div>
        <div class="tenants__add-actions">
          <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="addingMember = false">Cancelar</button>
          <button class="vc-btn vc-btn--small" type="submit" :disabled="!newMember.userId || busy">Adicionar</button>
        </div>
      </form>

      <div class="vc-table-wrap">
        <table class="vc-table tenants__members">
          <thead>
            <tr><th>Nome</th><th>Usuário</th><th>Cargo</th><th>Situação</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="member in filteredMembers" :key="member.membershipId">
              <td>
                {{ member.user.name || member.user.username }}
                <span v-if="member.user.userId === auth.user?.userId" class="vc-faint">(você)</span>
              </td>
              <td class="vc-faint">{{ member.user.username }}</td>
              <td>
                <select v-if="canManage" class="vc-select tenants__role" :value="member.role" :disabled="busy"
                        :aria-label="'Cargo de ' + (member.user.name || member.user.username)"
                        @change="changeRole(member, $event.target.value)">
                  <option v-for="role in roles" :key="role.name" :value="role.name">{{ role.label }}</option>
                </select>
                <span v-else class="vc-badge vc-badge--purple">{{ member.roleLabel }}</span>
              </td>
              <td>
                <span class="vc-badge" :class="member.active ? 'vc-badge--on' : 'vc-badge--off'">
                  {{ member.active ? 'Ativo' : 'Suspenso' }}
                </span>
                <span v-if="member.user.active === false" class="vc-chip vc-chip--danger tenants__flag"
                      title="A conta da pessoa está desativada na plataforma.">conta desativada</span>
              </td>
              <td class="tenants__actions">
                <template v-if="canManage">
                  <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" :disabled="busy"
                          @click="toggleMember(member)">
                    {{ member.active ? 'Suspender' : 'Reativar' }}
                  </button>
                  <button class="vc-btn vc-btn--danger vc-btn--small" type="button" :disabled="busy"
                          @click="removeMember(member)">
                    Remover
                  </button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
        <EmptyState v-if="membersLoaded && !filteredMembers.length" title="Nenhum membro">
          <template v-if="members.length">Ninguém com essa busca.</template>
          <template v-else>A equipe ainda não tem ninguém.</template>
        </EmptyState>
      </div>
      <p class="vc-faint tenants__note">
        Um cargo de Proprietário pode ser dado daqui. A equipe precisa manter pelo menos um proprietário
        ativo — o servidor recusa tirar ou suspender o último.
      </p>

      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="closeMembers">Fechar</button>
      </template>
    </ModalDialog>

    <!-- ------------------------------------------------------------ features -->
    <ModalDialog v-if="featuresOf" wide :title="'Recursos de ' + featuresOf.visibleName" @close="closeFeatures">
      <AlertBanner variant="warning" title="Desligar um recurso tira a permissão de todo mundo da equipe."
                   :aside="featureState?.profileLabel || ''">
        Não é só esconder um menu: as permissões do recurso somem de cada pessoa. Religar devolve tudo —
        nada é apagado.
      </AlertBanner>

      <div class="vc-row tenants__profiles">
        <span class="vc-small">Perfis padrão:</span>
        <button v-for="profile in applicableProfiles" :key="profile.name" type="button"
                :class="['vc-chip', 'vc-chip--button', profile.name === featureState?.profile ? 'vc-chip--purple' : '']"
                :disabled="!canManage || busy || profile.name === featureState?.profile"
                :title="profile.description"
                @click="applyProfile(profile)">
          {{ profile.label }}
          <span class="vc-faint">{{ profile.features.length }}</span>
        </button>
        <span v-if="featureState?.custom" class="vc-chip vc-chip--info">personalizado</span>
      </div>

      <div class="tenants__switches">
        <div v-for="feature in featureCatalog" :key="feature.name" class="vc-switch">
          <div class="vc-switch__body">
            <strong>{{ feature.label }}</strong>
            <p>{{ feature.description }}</p>
            <p class="vc-switch__perms">Permissões: {{ feature.permissions.join(', ') }}</p>
          </div>
          <button type="button" :class="['vc-switch__toggle', enabled[feature.name] ? 'is-on' : '']"
                  :aria-pressed="enabled[feature.name] ? 'true' : 'false'" :disabled="!canManage || busy"
                  @click="toggleFeature(feature.name)">
            <AppIcon :name="enabled[feature.name] ? 'toggleOn' : 'toggleOff'" :size="18" />
            {{ enabled[feature.name] ? 'Ligado' : 'Desligado' }}
          </button>
        </div>
      </div>

      <template #footer>
        <span v-if="featuresDirty" class="vc-chip vc-chip--warning">alterações não salvas</span>
        <span class="vc-spacer"></span>
        <button v-if="featuresDirty" class="vc-btn vc-btn--ghost" type="button" @click="loadFeatures(featuresOf)">
          Descartar
        </button>
        <button class="vc-btn vc-btn--ghost" type="button" @click="closeFeatures">Fechar</button>
        <button v-if="canManage" class="vc-btn" type="button" :disabled="!featuresDirty || busy" @click="saveFeatures">
          {{ busy ? 'Salvando...' : 'Salvar interruptores' }}
        </button>
      </template>
    </ModalDialog>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AlertBanner from '@/components/AlertBanner.vue';
import AppIcon from '@/components/AppIcon.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import EmptyState from '@/components/EmptyState.vue';
import { authStore } from '@/store/auth.js';
import { catalogs, features as featuresApi, platform, rooms as roomsApi, tenants } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

/*
 * Platform level screen: the tenants themselves, and — through the /platform routes — the members
 * and the feature switches of any of them, whether or not the administrator is a member. Reading
 * needs TENANT_VIEW_ALL; every action needs TENANT_UPDATE (removing a team, TENANT_DELETE).
 */
const auth = authStore();
const router = useRouter();
const toast = useToast();

const list = ref([]);
const categories = ref([]);
const profiles = ref([]);
const roles = ref([]);
const rooms = ref([]);
const busy = ref(false);

const canManage = computed(() => auth.canPlatform('TENANT_UPDATE'));
const applicableProfiles = computed(() => profiles.value.filter((profile) => profile.applicable));

/* ------------------------------------------------------------ edit form */

const editing = ref(false);
const form = reactive(blankForm());

function blankForm() {
  return {
    tenantId: null, slug: '', visibleName: '', teamNumber: '', color: '#8864AE',
    description: '', ownerUsername: '', active: true,
    competitionCategory: 'NONE', featureProfile: 'COMPLETE',
    attendanceThreshold: 75, reminderDays: 2, roomId: 0,
  };
}

/* --------------------------------------------------------------- members */

const membersOf = ref(null);
const members = ref([]);
const membersLoaded = ref(false);
const memberSearch = ref('');
const addingMember = ref(false);
const candidates = ref([]);
const candidateSearch = ref('');
const newMember = reactive({ userId: '', role: 'MEMBER' });

const filteredMembers = computed(() => {
  const term = memberSearch.value.trim().toLowerCase();
  if (!term) return members.value;
  return members.value.filter((member) =>
    [member.user.name, member.user.username, member.roleLabel]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(term)),
  );
});

/* -------------------------------------------------------------- features */

const featuresOf = ref(null);
const featureCatalog = ref([]);
const featureState = ref(null);
const enabled = reactive({});
const saved = reactive({});

const featuresDirty = computed(() => featureCatalog.value.some((f) => enabled[f.name] !== saved[f.name]));

onMounted(load);

async function load() {
  try {
    const { data } = await tenants.list();
    list.value = data;
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar equipes'));
  }
  try {
    const [categoryList, profileList, roleList] = await Promise.all([
      catalogs.competitionCategories(),
      catalogs.featureProfiles(),
      catalogs.membershipRoles(),
    ]);
    categories.value = categoryList.data;
    profiles.value = profileList.data;
    roles.value = roleList.data;
  } catch (error) {
    categories.value = [];
    profiles.value = [];
    roles.value = [];
  }
  try {
    const { data } = await roomsApi.list();
    rooms.value = data;
  } catch (error) {
    rooms.value = [];
  }
}

/* --------------------------------------------------------------- helpers */

function isMine(tenant) {
  return !!auth.membershipOn(tenant.tenantId);
}

function myRole(tenant) {
  return auth.membershipOn(tenant.tenantId)?.roleLabel || '';
}

/* TenantDto does not say whether the page is published; the feature being on is the best hint there is. */
function hasPublicPage(tenant) {
  return !tenant.systemTenant && (tenant.enabledFeatures || []).includes('LANDING_PAGE');
}

function publicPageHref(tenant) {
  return router.resolve({ name: 'teamPage', params: { slug: tenant.slug } }).href;
}

function roleHint(roleName) {
  const role = roles.value.find((item) => item.name === roleName);
  if (!role) return '';
  if (!role.defaultPermissions?.length) return 'Nenhuma permissão por padrão: vê apenas o que for compartilhado.';
  return role.defaultPermissions.length + ' permissões por padrão.';
}

/** Reloads the table and, when the change reached the administrator's own session, the session too. */
async function refresh({ me = false } = {}) {
  await load();
  if (me) await auth.loadMe();
}

/* ---------------------------------------------------------------- tenant */

function openCreate() {
  Object.assign(form, blankForm());
  editing.value = true;
}

function openEdit(tenant) {
  Object.assign(form, blankForm(), {
    tenantId: tenant.tenantId,
    slug: tenant.slug,
    visibleName: tenant.visibleName,
    teamNumber: tenant.teamNumber || '',
    color: tenant.color || '#8864AE',
    description: tenant.description || '',
    active: tenant.active !== false,
    competitionCategory: tenant.competitionCategory || 'NONE',
    attendanceThreshold: tenant.attendanceThreshold ?? 75,
    reminderDays: tenant.reminderDays ?? 2,
    roomId: tenant.roomId || 0,
  });
  editing.value = true;
}

async function save() {
  busy.value = true;
  try {
    if (form.tenantId) {
      await tenants.update(form.tenantId, {
        visibleName: form.visibleName,
        teamNumber: form.teamNumber,
        color: form.color,
        description: form.description,
        active: form.active,
        competitionCategory: form.competitionCategory,
        attendanceThreshold: form.attendanceThreshold,
        reminderDays: form.reminderDays,
        roomId: form.roomId,
      });
    } else {
      await tenants.create({
        slug: form.slug,
        visibleName: form.visibleName,
        teamNumber: form.teamNumber,
        color: form.color,
        description: form.description,
        ownerUsername: form.ownerUsername || null,
        competitionCategory: form.competitionCategory,
        featureProfile: form.featureProfile,
      });
    }
    editing.value = false;
    await refresh({ me: true });
    toast.success('Equipe salva!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao salvar equipe'));
  } finally {
    busy.value = false;
  }
}

async function toggleActive(tenant) {
  const activate = tenant.active === false;
  if (!activate && !window.confirm(
    `Desativar ${tenant.visibleName}? Ninguém abre a equipe enquanto ela estiver inativa; nada é apagado.`,
  )) return;
  busy.value = true;
  try {
    await tenants.update(tenant.tenantId, { active: activate });
    await refresh({ me: isMine(tenant) });
    toast.success(activate ? 'Equipe reativada.' : 'Equipe desativada.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao alterar a equipe'));
  } finally {
    busy.value = false;
  }
}

async function remove(tenant) {
  if (!window.confirm('Remover a equipe ' + tenant.visibleName + '?')) return;
  try {
    await tenants.remove(tenant.tenantId);
    await refresh({ me: true });
    toast.info('Equipe removida.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao remover equipe'));
  }
}

/* The documented way in: the administrator adds themself as owner and the team opens like any other. */
async function joinTeam(tenant) {
  if (!window.confirm(`Entrar em ${tenant.visibleName} como proprietário?`)) return;
  busy.value = true;
  try {
    await platform.addMember(tenant.tenantId, { userId: auth.user.userId, role: 'OWNER' });
    await refresh({ me: true });
    toast.success(`Você agora é proprietário de ${tenant.visibleName}.`);
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao entrar na equipe'));
  } finally {
    busy.value = false;
  }
}

function openTeam(tenant) {
  auth.setActiveTenant(tenant.tenantId);
  router.push({ name: 'home' });
}

/* --------------------------------------------------------------- members */

async function openMembers(tenant) {
  membersOf.value = tenant;
  members.value = [];
  membersLoaded.value = false;
  memberSearch.value = '';
  addingMember.value = false;
  await loadMembers();
}

function closeMembers() {
  membersOf.value = null;
  addingMember.value = false;
}

async function loadMembers() {
  if (!membersOf.value) return;
  try {
    const { data } = await platform.members(membersOf.value.tenantId);
    members.value = data;
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar membros'));
  } finally {
    membersLoaded.value = true;
  }
}

async function startAddMember() {
  newMember.userId = '';
  newMember.role = 'MEMBER';
  candidateSearch.value = '';
  addingMember.value = true;
  await loadCandidates();
}

/* Everyone of the platform who is not in the team yet — the /platform list, because /candidates needs membership. */
async function loadCandidates() {
  try {
    const { data } = await platform.users(candidateSearch.value.trim());
    const inTeam = new Set(members.value.map((member) => member.user.userId));
    candidates.value = data
      .map((row) => row.user)
      .filter((user) => !inTeam.has(user.userId) && user.active !== false);
  } catch (error) {
    candidates.value = [];
  }
}

/** Members changed: the table count and, if the person is the administrator, the session. */
async function afterMemberChange(userId) {
  await loadMembers();
  await refresh({ me: userId === auth.user?.userId });
}

async function addMember() {
  const tenant = membersOf.value;
  busy.value = true;
  try {
    await platform.addMember(tenant.tenantId, { userId: newMember.userId, role: newMember.role });
    addingMember.value = false;
    await afterMemberChange(newMember.userId);
    toast.success('Membro adicionado!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao adicionar membro'));
  } finally {
    busy.value = false;
  }
}

async function changeRole(member, role) {
  busy.value = true;
  try {
    await platform.updateMember(membersOf.value.tenantId, member.user.userId, { role });
    await afterMemberChange(member.user.userId);
    toast.success('Cargo atualizado!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao atualizar cargo'));
    await loadMembers();
  } finally {
    busy.value = false;
  }
}

async function toggleMember(member) {
  busy.value = true;
  try {
    await platform.updateMember(membersOf.value.tenantId, member.user.userId, { active: !member.active });
    await afterMemberChange(member.user.userId);
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao alterar situação'));
  } finally {
    busy.value = false;
  }
}

async function removeMember(member) {
  const name = member.user.name || member.user.username;
  if (!window.confirm(`Remover ${name} de ${membersOf.value.visibleName}?`)) return;
  busy.value = true;
  try {
    await platform.removeMember(membersOf.value.tenantId, member.user.userId);
    await afterMemberChange(member.user.userId);
    toast.info('Membro removido.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao remover membro'));
  } finally {
    busy.value = false;
  }
}

/* -------------------------------------------------------------- features */

async function openFeatures(tenant) {
  featuresOf.value = tenant;
  await loadFeatures(tenant);
}

function closeFeatures() {
  featuresOf.value = null;
}

async function loadFeatures(tenant) {
  try {
    const [catalog, current] = await Promise.all([catalogs.features(), featuresApi.state(tenant.tenantId)]);
    featureCatalog.value = catalog.data;
    absorb(current.data);
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar os recursos da equipe'));
  }
}

function absorb(state) {
  featureState.value = state;
  state.features.forEach((feature) => {
    enabled[feature.name] = feature.enabled;
    saved[feature.name] = feature.enabled;
  });
}

function toggleFeature(name) {
  enabled[name] = !enabled[name];
}

/* Applies the preset straight away: it is a single, named decision, not a draft. */
async function applyProfile(profile) {
  const tenant = featuresOf.value;
  if (!window.confirm(`Aplicar o perfil ${profile.label} em ${tenant.visibleName}? Isso reescreve todos os interruptores.`)) return;
  busy.value = true;
  try {
    const { data } = await featuresApi.update(tenant.tenantId, { profile: profile.name });
    absorb(data);
    await refresh({ me: isMine(tenant) });
    toast.success(`Perfil ${profile.label} aplicado.`);
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao aplicar o perfil'));
  } finally {
    busy.value = false;
  }
}

async function saveFeatures() {
  const tenant = featuresOf.value;
  busy.value = true;
  try {
    const body = { enabled: {} };
    featureCatalog.value.forEach((feature) => {
      if (enabled[feature.name] !== saved[feature.name]) {
        body.enabled[feature.name] = enabled[feature.name];
      }
    });
    const { data } = await featuresApi.update(tenant.tenantId, body);
    absorb(data);
    //If the administrator is in that team, their own permissions just changed
    await refresh({ me: isMine(tenant) });
    toast.success('Recursos atualizados!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao salvar os recursos'));
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.tenants__name {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.tenants__name strong {
  white-space: nowrap;
}

.tenants__mine {
  padding: 1px 7px;
  font-size: 0.72rem;
}

.tenants__link {
  display: inline-flex;
  color: var(--vc-text-faint);
}

.tenants__link:hover {
  color: var(--vc-purple-strong);
}

.tenants__sub {
  font-size: 0.74rem;
}

.tenants__actions {
  text-align: right;
  white-space: nowrap;
}

.tenants__actions .vc-btn + .vc-btn {
  margin-left: 6px;
}

tr.is-inactive td {
  color: var(--vc-text-muted);
}

.tenants__search {
  flex: 1 1 240px;
  max-width: 360px;
  color: var(--vc-text-faint);
}

.tenants__add {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius);
  background: var(--vc-surface-muted);
}

.tenants__add-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* Five columns in a 760px modal: tighter cells so the actions never scroll out of sight. */
.tenants__members th,
.tenants__members td {
  padding-left: 8px;
  padding-right: 8px;
}

.tenants__role {
  min-width: 130px;
  padding-top: 4px;
  padding-bottom: 4px;
  font-size: 0.85rem;
}

.tenants__flag {
  margin-left: 6px;
  padding: 1px 7px;
  font-size: 0.72rem;
}

.tenants__note {
  margin: 0;
}

.tenants__profiles {
  gap: 6px;
}

.tenants__profiles .vc-chip--button:disabled {
  cursor: default;
}

.tenants__switches {
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius);
  padding: 0 14px;
}
</style>
