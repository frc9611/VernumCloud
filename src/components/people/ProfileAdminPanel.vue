<template>
  <section class="vc-card padmin">
    <header class="vc-card__header vc-card__header--muted">
      <AppIcon name="shield" :size="16" />
      <span>Administrar esta pessoa</span>
      <span class="vc-spacer"></span>
      <span class="vc-faint padmin__hint">Só quem pode agir sobre ela vê este painel.</span>
    </header>

    <div class="vc-card__body">
      <div class="vc-row padmin__actions">
        <button v-if="profile.canGrantBadges" class="vc-btn vc-btn--small" type="button" @click="openBadge">
          <AppIcon name="badge" :size="14" />
          Conceder badge
        </button>
        <button v-if="profile.canAddAffiliation" class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="openAffiliation(null)">
          <AppIcon name="history" :size="14" />
          Adicionar afiliação passada
        </button>
        <button v-if="canAddToTeam" class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="openTeam">
          <AppIcon name="userPlus" :size="14" />
          Adicionar a uma equipe
        </button>
        <button v-if="eventTeams.length" class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="openEvent">
          <AppIcon name="calendar" :size="14" />
          Registrar em evento
        </button>
      </div>

      <!-- ------------------------------------------------ memberships CRUD -->
      <div v-if="manageableMemberships.length" class="vc-stack" style="gap: 6px">
        <strong class="vc-small">Equipes da pessoa</strong>
        <div v-for="membership in manageableMemberships" :key="membership.tenantId" class="padmin__membership">
          <span class="vc-dot" :style="{ background: membership.color || 'var(--vc-purple)' }"></span>
          <span class="padmin__team">
            {{ membership.tenantName }}
            <span v-if="membership.teamNumber" class="vc-faint">#{{ membership.teamNumber }}</span>
          </span>
          <select
            class="vc-select padmin__role"
            :value="membership.role"
            :disabled="busy"
            :aria-label="'Cargo em ' + membership.tenantName"
            @change="changeRole(membership, $event.target.value)"
          >
            <option v-for="role in roles" :key="role.name" :value="role.name">{{ role.label }}</option>
          </select>
          <button class="vc-btn vc-btn--danger vc-btn--small" type="button" :disabled="busy" @click="removeFrom(membership)">
            Remover
          </button>
        </div>
      </div>
      <p v-else-if="canAddToTeam" class="vc-faint" style="margin: 0">
        A pessoa não está em nenhuma equipe que você administre.
      </p>
    </div>

    <!-- ---------------------------------------------------------- grant badge -->
    <ModalDialog v-if="badgeOpen" :title="'Conceder badge a ' + profile.name" @close="badgeOpen = false">
      <div class="vc-field">
        <label class="vc-label" for="badge-kind">Tipo</label>
        <select id="badge-kind" class="vc-select" v-model="badgeForm.kind">
          <option value="CUSTOM">Badge</option>
          <option value="ALUMNI">Alumni</option>
        </select>
        <span class="vc-faint">Badges de evento e de prêmio são gerados pelo próprio evento.</span>
      </div>
      <div class="vc-field">
        <label class="vc-label" for="badge-title">Título</label>
        <input id="badge-title" class="vc-input" type="text" v-model="badgeForm.title" maxlength="160"
               :placeholder="badgeForm.kind === 'ALUMNI' ? 'Alumni CyberRain 2020–2024' : 'Mentor voluntário 2024'" />
      </div>
      <div class="vc-field">
        <label class="vc-label" for="badge-description">Descrição</label>
        <textarea id="badge-description" class="vc-textarea" rows="2" maxlength="500" v-model="badgeForm.description"
                  placeholder="Por que esta pessoa recebe o badge."></textarea>
      </div>
      <div class="padmin__fields">
        <div class="vc-field">
          <label class="vc-label" for="badge-icon">Ícone</label>
          <select id="badge-icon" class="vc-select" v-model="badgeForm.icon">
            <option v-for="choice in iconChoices" :key="choice.value" :value="choice.value">{{ choice.label }}</option>
          </select>
        </div>
        <div class="vc-field">
          <label class="vc-label" for="badge-color">Cor</label>
          <div class="vc-input-group">
            <input id="badge-color" class="vc-input" type="color" v-model="badgeForm.color" :disabled="!badgeForm.useColor" />
            <label class="vc-checkbox" style="white-space: nowrap">
              <input type="checkbox" v-model="badgeForm.useColor" />
              cor própria
            </label>
          </div>
          <span class="vc-faint">Sem cor própria, o badge usa a cor da equipe que emite.</span>
        </div>
      </div>
      <div class="vc-field">
        <label class="vc-label" for="badge-issuer">Emitido por</label>
        <select id="badge-issuer" class="vc-select" v-model="badgeForm.tenantId">
          <option v-if="profile.viewerPlatformAdmin" value="">pela plataforma</option>
          <option v-for="team in profile.grantableTenants" :key="team.tenantId" :value="String(team.tenantId)">
            {{ team.name }}<template v-if="team.teamNumber"> #{{ team.teamNumber }}</template>
          </option>
        </select>
      </div>
      <div class="vc-row" style="align-items: center; gap: 10px">
        <span class="vc-faint">Prévia:</span>
        <BadgeChip :badge="badgePreview" :color="badgePreviewColor" />
      </div>
      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="badgeOpen = false">Cancelar</button>
        <button class="vc-btn" type="button" :disabled="busy || !badgeForm.title.trim()" @click="grantBadge">Conceder</button>
      </template>
    </ModalDialog>

    <!-- ----------------------------------------------------------- affiliation -->
    <ModalDialog v-if="affiliationOpen" :title="affiliationForm.affiliationId ? 'Editar afiliação' : 'Adicionar afiliação passada'"
                 @close="affiliationOpen = false">
      <p v-if="affiliationForm.source === 'LEFT_TEAM'" class="vc-callout" style="margin: 0">
        <strong>Saída registrada pelo sistema:</strong> só o cargo e a observação podem ser editados.
      </p>

      <template v-if="!affiliationForm.affiliationId">
        <div class="vc-row" role="radiogroup" aria-label="Tipo de equipe">
          <button type="button" role="radio" :aria-checked="affiliationForm.mode === 'platform'"
                  :class="['vc-chip', 'vc-chip--button', affiliationForm.mode === 'platform' ? 'vc-chip--purple' : '']"
                  @click="affiliationForm.mode = 'platform'">Equipe da plataforma</button>
          <button v-if="profile.viewerPlatformAdmin" type="button" role="radio" :aria-checked="affiliationForm.mode === 'outside'"
                  :class="['vc-chip', 'vc-chip--button', affiliationForm.mode === 'outside' ? 'vc-chip--purple' : '']"
                  @click="affiliationForm.mode = 'outside'">Equipe de fora</button>
        </div>
        <div v-if="affiliationForm.mode === 'platform'" class="vc-field">
          <label class="vc-label" for="aff-tenant">Equipe</label>
          <select id="aff-tenant" class="vc-select" v-model="affiliationForm.tenantId">
            <option value="">Escolha a equipe</option>
            <option v-for="team in affiliationTeams" :key="team.tenantId" :value="String(team.tenantId)">
              {{ team.name }}<template v-if="team.teamNumber"> #{{ team.teamNumber }}</template>
            </option>
          </select>
        </div>
      </template>
      <p v-else class="vc-muted" style="margin: 0">
        <span class="vc-dot" :style="{ background: affiliationForm.color || 'var(--vc-text-faint)' }"></span>
        {{ affiliationForm.teamLabel }}
      </p>

      <div v-if="affiliationForm.mode === 'outside' && affiliationForm.source !== 'LEFT_TEAM'" class="padmin__fields">
        <div class="vc-field">
          <label class="vc-label" for="aff-team-name">Nome da equipe</label>
          <input id="aff-team-name" class="vc-input" type="text" maxlength="160" v-model="affiliationForm.teamName" placeholder="Equipe de fora da plataforma" />
        </div>
        <div class="vc-field">
          <label class="vc-label" for="aff-team-number">Número</label>
          <input id="aff-team-number" class="vc-input" type="text" maxlength="20" v-model="affiliationForm.teamNumber" placeholder="1234" />
        </div>
      </div>

      <div class="vc-field">
        <label class="vc-label" for="aff-role">Cargo ou papel</label>
        <input id="aff-role" class="vc-input" type="text" maxlength="120" v-model="affiliationForm.roleLabel" placeholder="Membro, Capitã, Técnico..." />
      </div>
      <div class="padmin__fields">
        <div class="vc-field">
          <label class="vc-label" for="aff-start">Início</label>
          <input id="aff-start" class="vc-input" type="date" v-model="affiliationForm.startDate" :disabled="affiliationForm.source === 'LEFT_TEAM'" />
        </div>
        <div class="vc-field">
          <label class="vc-label" for="aff-end">Fim</label>
          <input id="aff-end" class="vc-input" type="date" v-model="affiliationForm.endDate" :disabled="affiliationForm.source === 'LEFT_TEAM'" />
        </div>
      </div>
      <div class="vc-field">
        <label class="vc-label" for="aff-note">Observação</label>
        <textarea id="aff-note" class="vc-textarea" rows="2" maxlength="500" v-model="affiliationForm.note"
                  placeholder="O que vale lembrar dessa passagem."></textarea>
      </div>
      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="affiliationOpen = false">Cancelar</button>
        <button class="vc-btn" type="button" :disabled="busy || !affiliationValid" @click="saveAffiliation">
          {{ affiliationForm.affiliationId ? 'Salvar' : 'Adicionar' }}
        </button>
      </template>
    </ModalDialog>

    <!-- ----------------------------------------------------------- add to team -->
    <ModalDialog v-if="teamOpen" :title="'Adicionar ' + profile.name + ' a uma equipe'" @close="teamOpen = false">
      <div class="vc-field">
        <label class="vc-label" for="team-tenant">Equipe</label>
        <select id="team-tenant" class="vc-select" v-model="teamForm.tenantId">
          <option value="">Escolha a equipe</option>
          <option v-for="team in teamsToAdd" :key="team.tenantId" :value="String(team.tenantId)">
            {{ team.name }}<template v-if="team.teamNumber"> #{{ team.teamNumber }}</template>
          </option>
        </select>
        <span v-if="!teamsToAdd.length" class="vc-faint">A pessoa já está em todas as equipes que você administra.</span>
      </div>
      <div class="vc-field">
        <label class="vc-label" for="team-role">Cargo na equipe</label>
        <select id="team-role" class="vc-select" v-model="teamForm.role">
          <option v-for="role in roles" :key="role.name" :value="role.name">{{ role.label }}</option>
        </select>
      </div>
      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="teamOpen = false">Cancelar</button>
        <button class="vc-btn" type="button" :disabled="busy || !teamForm.tenantId" @click="addToTeam">Adicionar</button>
      </template>
    </ModalDialog>

    <!-- ------------------------------------------------------- register in event -->
    <ModalDialog v-if="eventOpen" :title="'Registrar ' + profile.name + ' em um evento'" @close="eventOpen = false">
      <div class="vc-field">
        <label class="vc-label" for="event-tenant">Equipe</label>
        <select id="event-tenant" class="vc-select" v-model="eventForm.tenantId" @change="loadEvents">
          <option v-for="team in eventTeams" :key="team.tenantId" :value="String(team.tenantId)">{{ team.name }}</option>
        </select>
      </div>
      <div class="vc-field">
        <label class="vc-label" for="event-id">Evento</label>
        <select id="event-id" class="vc-select" v-model="eventForm.eventId" :disabled="loadingEvents">
          <option value="">{{ loadingEvents ? 'Carregando...' : 'Escolha o evento' }}</option>
          <option v-for="event in eventOptions" :key="event.eventId" :value="String(event.eventId)">
            {{ event.name }} · {{ formatDate(event.startDate) }}
          </option>
        </select>
        <span v-if="!loadingEvents && !eventOptions.length" class="vc-faint">
          Essa equipe ainda não registrou nenhum evento.
          <router-link v-if="Number(eventForm.tenantId) === auth.activeTenantId" :to="{ name: 'adminEvents' }">Registrar um evento</router-link>
        </span>
      </div>
      <div class="vc-field">
        <label class="vc-label" for="event-role">Papel no evento</label>
        <input id="event-role" class="vc-input" type="text" maxlength="120" v-model="eventForm.roleLabel" placeholder="piloto, pit, técnica..." />
      </div>
      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="eventOpen = false">Cancelar</button>
        <button class="vc-btn" type="button" :disabled="busy || !eventForm.eventId" @click="registerInEvent">Registrar</button>
      </template>
    </ModalDialog>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useToast } from 'vue-toastification';
import AppIcon from '@/components/AppIcon.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import { authStore } from '@/store/auth.js';
import { catalogs, events as eventsApi, people, platform, tenants as tenantsApi } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';
import BadgeChip from './BadgeChip.vue';
import { BADGE_ICON_CHOICES, formatDate, teamLabel } from './profileText.js';

/*
 * What an administrator does to a person from their profile: badges by hand, past affiliations,
 * the teams they are in (add, change cargo, remove) and registering them in an event.
 *
 * Nothing here has a route of its own. Memberships go through the same calls as the members screen
 * — `tenants.*Member` when the viewer administers that team, `platform.*Member` when they act as
 * platform administrator — and the profile DTO says what the viewer may do (`canGrantBadges`,
 * `canAddAffiliation`, `manageableTenants`, `viewerPlatformAdmin`). The panel shows only what was
 * granted; the server is the one that refuses.
 */
const props = defineProps({
  profile: { type: Object, required: true },
});
const emit = defineEmits(['changed']);

const auth = authStore();
const toast = useToast();

const busy = ref(false);
const roles = ref([]);
const allTenants = ref([]);
const iconChoices = BADGE_ICON_CHOICES;

/* ------------------------------------------------------------- reach */

function isManageable(tenantId) {
  return props.profile.manageableTenants.some((team) => team.tenantId === tenantId);
}

/** The members screen of the team when the viewer administers it; the platform routes otherwise. */
function membersApi(tenantId) {
  return isManageable(tenantId) ? tenantsApi : platform;
}

const canAddToTeam = computed(() => props.profile.viewerPlatformAdmin || props.profile.manageableTenants.length > 0);

const manageableMemberships = computed(() =>
  props.profile.memberships.filter((membership) => props.profile.viewerPlatformAdmin || isManageable(membership.tenantId)),
);

/** Teams the viewer may add the person to or record an affiliation with: {tenantId, name, teamNumber}. */
const reachableTeams = computed(() => {
  if (props.profile.viewerPlatformAdmin) {
    return allTenants.value
      .filter((tenant) => !tenant.systemTenant)
      .map((tenant) => ({ tenantId: tenant.tenantId, name: tenant.visibleName, teamNumber: tenant.teamNumber }));
  }
  return props.profile.manageableTenants;
});

const teamsToAdd = computed(() => {
  const already = new Set(props.profile.memberships.map((membership) => membership.tenantId));
  return reachableTeams.value.filter((team) => !already.has(team.tenantId));
});

const affiliationTeams = computed(() => reachableTeams.value);

/** The viewer's EVENT_MANAGE teams that the person is or was in — the ones the server accepts. */
const eventTeams = computed(() => {
  const related = new Set([
    ...props.profile.memberships.map((membership) => membership.tenantId),
    ...props.profile.affiliations.map((affiliation) => affiliation.tenantId).filter(Boolean),
  ]);
  return auth.memberships
    .filter((membership) => {
      const tenantId = membership.tenant?.tenantId;
      return related.has(tenantId) && auth.permissionsOn(tenantId).includes('EVENT_MANAGE');
    })
    .map((membership) => ({ tenantId: membership.tenant.tenantId, name: membership.tenant.visibleName }));
});

onMounted(async () => {
  try {
    const { data } = await catalogs.membershipRoles();
    roles.value = data;
  } catch (error) {
    roles.value = [];
  }
  if (props.profile.viewerPlatformAdmin) {
    try {
      const { data } = await tenantsApi.list();
      allTenants.value = data;
    } catch (error) {
      allTenants.value = [];
    }
  }
});

/* ------------------------------------------------------------ badges */

const badgeOpen = ref(false);
const badgeForm = reactive({ kind: 'CUSTOM', title: '', description: '', icon: 'badge', color: '#8864ae', useColor: false, tenantId: '' });

const badgePreview = computed(() => ({
  kind: badgeForm.kind,
  kindLabel: badgeForm.kind === 'ALUMNI' ? 'Alumni' : 'Badge',
  title: badgeForm.title.trim() || 'Título do badge',
  description: badgeForm.description,
  icon: badgeForm.icon,
}));
const badgePreviewColor = computed(() => {
  if (badgeForm.useColor) return badgeForm.color;
  const team = props.profile.grantableTenants.find((item) => String(item.tenantId) === badgeForm.tenantId);
  return team?.color || 'var(--vc-purple)';
});

function openBadge() {
  badgeForm.kind = 'CUSTOM';
  badgeForm.title = '';
  badgeForm.description = '';
  badgeForm.icon = 'badge';
  badgeForm.useColor = false;
  //Platform first when the viewer has it; else the first team that may issue
  badgeForm.tenantId = props.profile.viewerPlatformAdmin || !props.profile.grantableTenants.length
    ? ''
    : String(props.profile.grantableTenants[0].tenantId);
  badgeOpen.value = true;
}

async function grantBadge() {
  busy.value = true;
  try {
    await people.grantBadge(props.profile.userId, {
      kind: badgeForm.kind,
      title: badgeForm.title.trim(),
      description: badgeForm.description.trim() || null,
      color: badgeForm.useColor ? badgeForm.color : null,
      icon: badgeForm.icon || null,
      tenantId: badgeForm.tenantId ? Number(badgeForm.tenantId) : null,
    });
    badgeOpen.value = false;
    toast.success('Badge concedido!');
    emit('changed', {});
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível conceder o badge.'));
  } finally {
    busy.value = false;
  }
}

/* ------------------------------------------------------ affiliations */

const affiliationOpen = ref(false);
const affiliationForm = reactive({
  affiliationId: null, source: 'MANUAL', mode: 'platform', tenantId: '', teamName: '', teamNumber: '',
  teamLabel: '', color: '', roleLabel: '', startDate: '', endDate: '', note: '',
});

const affiliationValid = computed(() => {
  if (affiliationForm.affiliationId) return true;
  if (affiliationForm.mode === 'platform') return !!affiliationForm.tenantId;
  return !!affiliationForm.teamName.trim();
});

/** Opens the form empty (null) or filled with an existing affiliation. Also called by the timeline. */
function openAffiliation(affiliation) {
  affiliationForm.affiliationId = affiliation?.affiliationId || null;
  affiliationForm.source = affiliation?.source || 'MANUAL';
  affiliationForm.mode = affiliation ? (affiliation.tenantId ? 'platform' : 'outside') : 'platform';
  affiliationForm.tenantId = affiliation?.tenantId ? String(affiliation.tenantId) : '';
  affiliationForm.teamName = affiliation?.teamName || '';
  affiliationForm.teamNumber = affiliation?.teamNumber || '';
  affiliationForm.teamLabel = affiliation ? teamLabel(affiliation.teamName, affiliation.teamNumber) : '';
  affiliationForm.color = affiliation?.color || '';
  affiliationForm.roleLabel = affiliation?.roleLabel || '';
  affiliationForm.startDate = affiliation?.startDate || '';
  affiliationForm.endDate = affiliation?.endDate || '';
  affiliationForm.note = affiliation?.note || '';
  affiliationOpen.value = true;
}

async function saveAffiliation() {
  busy.value = true;
  try {
    if (affiliationForm.affiliationId) {
      //"" clears a text; a date left empty is kept (the server has no "clear" for dates)
      const body = { roleLabel: affiliationForm.roleLabel.trim(), note: affiliationForm.note.trim() };
      if (affiliationForm.source !== 'LEFT_TEAM') {
        body.startDate = affiliationForm.startDate || null;
        body.endDate = affiliationForm.endDate || null;
        if (affiliationForm.mode === 'outside') {
          body.teamName = affiliationForm.teamName.trim() || null;
          body.teamNumber = affiliationForm.teamNumber.trim();
        }
      }
      await people.updateAffiliation(affiliationForm.affiliationId, body);
      toast.success('Afiliação atualizada.');
    } else {
      const body = {
        roleLabel: affiliationForm.roleLabel.trim() || null,
        startDate: affiliationForm.startDate || null,
        endDate: affiliationForm.endDate || null,
        note: affiliationForm.note.trim() || null,
      };
      if (affiliationForm.mode === 'platform') {
        body.tenantId = Number(affiliationForm.tenantId);
      } else {
        body.teamName = affiliationForm.teamName.trim();
        body.teamNumber = affiliationForm.teamNumber.trim() || null;
      }
      await people.addAffiliation(props.profile.userId, body);
      toast.success('Afiliação adicionada à história.');
    }
    affiliationOpen.value = false;
    emit('changed', {});
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível salvar a afiliação.'));
  } finally {
    busy.value = false;
  }
}

async function removeAffiliation(affiliation) {
  if (!window.confirm(`Remover a passagem por ${affiliation.teamName} da história de ${props.profile.name}?`)) return;
  busy.value = true;
  try {
    await people.removeAffiliation(affiliation.affiliationId);
    toast.info('Afiliação removida.');
    emit('changed', {});
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível remover a afiliação.'));
  } finally {
    busy.value = false;
  }
}

/* --------------------------------------------------------- memberships */

const teamOpen = ref(false);
const teamForm = reactive({ tenantId: '', role: 'MEMBER' });

function openTeam() {
  teamForm.tenantId = teamsToAdd.value.length === 1 ? String(teamsToAdd.value[0].tenantId) : '';
  teamForm.role = 'MEMBER';
  teamOpen.value = true;
}

async function addToTeam() {
  const tenantId = Number(teamForm.tenantId);
  busy.value = true;
  try {
    await membersApi(tenantId).addMember(tenantId, { userId: props.profile.userId, role: teamForm.role });
    teamOpen.value = false;
    toast.success('Pessoa adicionada à equipe!');
    emit('changed', { memberships: true });
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível adicionar à equipe.'));
  } finally {
    busy.value = false;
  }
}

async function changeRole(membership, role) {
  if (role === membership.role) return;
  busy.value = true;
  try {
    await membersApi(membership.tenantId).updateMember(membership.tenantId, props.profile.userId, { role });
    toast.success('Cargo atualizado!');
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível alterar o cargo.'));
  } finally {
    busy.value = false;
    //Reload either way: on failure the select has to go back to what the server holds
    emit('changed', { memberships: true });
  }
}

async function removeFrom(membership) {
  if (!window.confirm(`Remover ${props.profile.name} de ${membership.tenantName}? A passagem fica registrada na história.`)) return;
  busy.value = true;
  try {
    await membersApi(membership.tenantId).removeMember(membership.tenantId, props.profile.userId);
    toast.info('Pessoa removida da equipe.');
    emit('changed', { memberships: true });
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível remover da equipe.'));
  } finally {
    busy.value = false;
  }
}

/* ------------------------------------------------------------- events */

const eventOpen = ref(false);
const loadingEvents = ref(false);
const eventOptions = ref([]);
const eventForm = reactive({ tenantId: '', eventId: '', roleLabel: '' });

async function openEvent() {
  const preferred = eventTeams.value.find((team) => team.tenantId === auth.activeTenantId) || eventTeams.value[0];
  eventForm.tenantId = preferred ? String(preferred.tenantId) : '';
  eventForm.eventId = '';
  eventForm.roleLabel = '';
  eventOpen.value = true;
  await loadEvents();
}

async function loadEvents() {
  eventForm.eventId = '';
  eventOptions.value = [];
  if (!eventForm.tenantId) return;
  loadingEvents.value = true;
  try {
    const { data } = await eventsApi.list(Number(eventForm.tenantId));
    eventOptions.value = data;
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível carregar os eventos.'));
  } finally {
    loadingEvents.value = false;
  }
}

async function registerInEvent() {
  busy.value = true;
  try {
    await eventsApi.addParticipants(Number(eventForm.eventId), {
      userIds: [props.profile.userId],
      roleLabel: eventForm.roleLabel.trim() || null,
    });
    eventOpen.value = false;
    toast.success('Participação registrada!');
    emit('changed', {});
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível registrar no evento.'));
  } finally {
    busy.value = false;
  }
}

defineExpose({ openAffiliation, removeAffiliation });
</script>

<style scoped>
.padmin__hint {
  font-size: 0.78rem;
  font-weight: 400;
}

.padmin__actions {
  flex-wrap: wrap;
}

.padmin__membership {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid var(--vc-border);
  flex-wrap: wrap;
}

.padmin__membership:last-child {
  border-bottom: 0;
}

.padmin__team {
  flex: 1;
  min-width: 140px;
  font-size: 0.92rem;
}

.padmin__role {
  max-width: 170px;
}

.padmin__fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

@media (max-width: 700px) {
  .padmin__hint {
    display: none;
  }
}
</style>
