<template>
  <main class="vc-page pprofile">
    <p v-if="loading && !profile" class="vc-faint">Carregando perfil...</p>

    <EmptyState v-else-if="!profile" title="Pessoa não encontrada">
      Esse perfil não existe ou você não pode vê-lo.
      <template #actions>
        <router-link class="vc-btn vc-btn--ghost" :to="{ name: 'home' }">Voltar ao início</router-link>
      </template>
    </EmptyState>

    <div v-else class="vc-stack pprofile__stack">
      <ProfileHeader
        :profile="profile"
        :team-color-of="teamColorOf"
        :busy="busy"
        :customizing="customizing"
        @follow="follow"
        @unfollow="unfollow"
        @save="saveProfile"
        @toggle-customize="customizing = !customizing"
      />

      <ProfileAdminPanel v-if="showAdmin" ref="adminPanel" :profile="profile" @changed="afterChange" />

      <div v-if="customizing" class="vc-row pprofile__customize-bar">
        <AlertBanner variant="info" icon="edit" title="Personalizando seu perfil" style="flex: 1">
          Use as setas para reordenar as seções e o olho, em cada equipe ou badge, para escolher o
          que aparece no seu perfil público. "Concluir", no topo, só fecha este aviso — tudo já foi
          salvo.
        </AlertBanner>
        <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="restoreOrder">
          Restaurar ordem padrão
        </button>
      </div>

      <template v-for="(key, index) in sectionOrder" :key="key">
        <div class="pprofile__section">
          <div v-if="customizing" class="pprofile__reorder">
            <button
              class="vc-btn vc-btn--ghost vc-btn--small"
              type="button"
              :disabled="index === 0"
              title="Mover para cima"
              @click="moveSection(index, -1)"
            >
              <AppIcon name="chevronUp" :size="14" />
            </button>
            <button
              class="vc-btn vc-btn--ghost vc-btn--small"
              type="button"
              :disabled="index === sectionOrder.length - 1"
              title="Mover para baixo"
              @click="moveSection(index, 1)"
            >
              <AppIcon name="chevronDown" :size="14" />
            </button>
            <span class="vc-faint">{{ SECTION_LABELS[key] }}</span>
          </div>

          <ProfileBadges
            v-if="key === 'badges'"
            :badges="profile.badges"
            :owner="profile.canEditProfile"
            :customizing="customizing"
            :milestones="milestoneProgress"
            :team-color-of="teamColorOf"
            @toggle-highlight="toggleHighlight"
            @toggle-hidden="hideBadge"
            @remove="removeBadge"
          />
          <ProfileTeams
            v-else-if="key === 'teams'"
            :memberships="profile.memberships"
            :has-history="profile.affiliations.length > 0"
            :customizing="customizing"
            :can-edit-profile="profile.canEditProfile"
            @toggle-hidden="hideMembership"
            @add-trajectory="addTrajectory"
            @review-trajectory="reviewTrajectory"
            @remove-trajectory="removeTrajectory"
          />
          <ProfileHistory
            v-else-if="key === 'history'"
            :affiliations="profile.affiliations"
            :events="profile.events"
            @edit-affiliation="editAffiliation"
            @remove-affiliation="removeAffiliation"
          />
          <ProfileEvents v-else-if="key === 'events'" :events="profile.events" />
        </div>
      </template>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'vue-toastification';
import AlertBanner from '@/components/AlertBanner.vue';
import AppIcon from '@/components/AppIcon.vue';
import EmptyState from '@/components/EmptyState.vue';
import ProfileAdminPanel from '@/components/people/ProfileAdminPanel.vue';
import ProfileBadges from '@/components/people/ProfileBadges.vue';
import ProfileEvents from '@/components/people/ProfileEvents.vue';
import ProfileHeader from '@/components/people/ProfileHeader.vue';
import ProfileHistory from '@/components/people/ProfileHistory.vue';
import ProfileTeams from '@/components/people/ProfileTeams.vue';
import { authStore } from '@/store/auth.js';
import { milestones, people } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';
import { SECTION_LABELS, resolveSectionOrder } from '@/components/people/profileText.js';

/*
 * The profile of a person, at /pessoas/:id.
 *
 * One page for every case — student, mentor, alumnus, platform administrator — because a person is
 * one thing across teams and after them. What changes is the emphasis, and the server's `kind` is
 * only a hint for it. The sections read from a single PersonProfileDto; every action (follow, edit,
 * badges, administration) reloads it, so what is on screen is always what the server holds.
 *
 * The owner has full say over the page: `customizing` reveals the order arrows and the per-item eye
 * toggles that the sections below already carry (hidden by default so a normal visit — even the
 * owner's own — looks exactly like what everybody else sees). Every change inside it saves the
 * instant it is made; the mode itself is nothing but a local reveal switch.
 */
const route = useRoute();
const auth = authStore();
const toast = useToast();

const profile = ref(null);
const milestoneProgress = ref([]);
const loading = ref(false);
const busy = ref(false);
const customizing = ref(false);
const adminPanel = ref(null);

const showAdmin = computed(() => {
  const dto = profile.value;
  if (!dto) return false;
  return dto.canGrantBadges || dto.canAddAffiliation || dto.viewerPlatformAdmin || dto.manageableTenants.length > 0
    || dto.affiliations.some((affiliation) => affiliation.canEdit);
});

const sectionOrder = computed(() => resolveSectionOrder(profile.value?.sectionOrder));

onMounted(load);
watch(() => route.params.id, load);

async function load() {
  const userId = route.params.id;
  if (!userId) return;
  loading.value = true;
  customizing.value = false;
  try {
    const { data } = await people.profile(userId);
    profile.value = data;
    loadMilestones(userId);
  } catch (error) {
    //404 and 403 read the same to whoever is looking: there is nothing to show here
    profile.value = null;
    milestoneProgress.value = [];
  } finally {
    loading.value = false;
  }
}

/*
 * Where the person stands in the marcos of the team the reader has open — the only team whose
 * numbers both of them share. Never awaited by `load` and never toasted: it is the "faltam 3
 * demandas" line under the marcos, and a profile that opened fine must not look broken because the
 * reader has no MEMBER_VIEW in that team.
 */
async function loadMilestones(userId) {
  milestoneProgress.value = [];
  const tenantId = auth.activeTenantId;
  if (!tenantId || !(profile.value?.memberships || []).some((membership) => membership.tenantId === tenantId)) {
    return;
  }
  try {
    const { data } = await milestones.of(tenantId, userId);
    //A stale answer of a profile the reader already left behind is worse than no line at all
    if (route.params.id === userId) milestoneProgress.value = data || [];
  } catch (error) {
    if (route.params.id === userId) milestoneProgress.value = [];
  }
}

/** Colour of a team on this page by id — for a badge that has no colour of its own. */
function teamColorOf(tenantId) {
  const dto = profile.value;
  if (!dto) return null;
  const sources = [dto.memberships, dto.affiliations, dto.manageableTenants, dto.grantableTenants];
  for (const list of sources) {
    const team = (list || []).find((item) => item.tenantId === tenantId);
    if (team?.color) return team.color;
  }
  return null;
}

/* ------------------------------------------------------------- follow */

async function follow() {
  await changeFollow(() => people.follow(profile.value.userId), 'Você agora segue ' + profile.value.name + '.');
}

async function unfollow() {
  await changeFollow(() => people.unfollow(profile.value.userId), 'Você deixou de seguir ' + profile.value.name + '.');
}

async function changeFollow(call, message) {
  busy.value = true;
  try {
    const { data } = await call();
    profile.value = { ...profile.value, followedByMe: data.followedByMe, followers: data.followers };
    toast.success(message);
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível atualizar quem você segue.'));
  } finally {
    busy.value = false;
  }
}

/* ------------------------------------------------------- own profile */

async function saveProfile(body) {
  busy.value = true;
  try {
    const { data } = await people.updateMyProfile(body);
    profile.value = data;
    toast.success('Perfil atualizado!');
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível salvar o perfil.'));
  } finally {
    busy.value = false;
  }
}

async function toggleHighlight(badge) {
  try {
    const { data } = await people.highlightBadge(badge.badgeId, !badge.highlighted);
    profile.value = {
      ...profile.value,
      badges: profile.value.badges.map((item) => (item.badgeId === data.badgeId ? data : item)),
    };
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível destacar o badge.'));
  }
}

/* --------------------------------------------------- customize: hide */

async function hideMembership(membership) {
  try {
    const { data } = await people.hideMembership(membership.tenantId, !membership.hidden);
    profile.value = data;
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível alterar a visibilidade da equipe.'));
  }
}

async function hideBadge(badge) {
  try {
    const { data } = await people.hideBadge(badge.badgeId, !badge.hidden);
    profile.value = {
      ...profile.value,
      badges: profile.value.badges.map((item) => (item.badgeId === data.badgeId ? data : item)),
    };
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível alterar a visibilidade do badge.'));
  }
}

/* ----------------------------------------------- customize: reorder */

async function moveSection(index, direction) {
  const order = [...sectionOrder.value];
  const target = index + direction;
  if (target < 0 || target >= order.length) return;
  [order[index], order[target]] = [order[target], order[index]];
  profile.value = { ...profile.value, sectionOrder: order };
  try {
    await people.updateMyProfile({ sectionOrder: order });
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível reordenar as seções.'));
    await load();
  }
}

async function restoreOrder() {
  try {
    const { data } = await people.updateMyProfile({ sectionOrder: [] });
    profile.value = data;
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível restaurar a ordem.'));
  }
}

/* -------------------------------------------------------- trajectory */

async function addTrajectory({ tenantId, body }) {
  try {
    const { data } = await people.addTrajectory(tenantId, body);
    profile.value = data;
    toast.success('Enviado para revisão de um mentor ou administrador da equipe.');
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível registrar essa função.'));
  }
}

async function reviewTrajectory({ entry, approve }) {
  try {
    await people.reviewTrajectory(entry.entryId, approve);
    toast.success(approve ? 'Trajetória aprovada.' : 'Trajetória recusada.');
    await load();
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível revisar esse registro.'));
  }
}

async function removeTrajectory(entry) {
  if (!window.confirm(`Remover "${entry.roleLabel}" da trajetória?`)) return;
  try {
    await people.removeTrajectory(entry.entryId);
    await load();
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível remover esse registro.'));
  }
}

/* ----------------------------------------------------- administration */

async function removeBadge(badge) {
  if (!window.confirm(`Remover o badge "${badge.title}" de ${profile.value.name}?`)) return;
  try {
    await people.removeBadge(badge.badgeId);
    toast.info('Badge removido.');
    await load();
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível remover o badge.'));
  }
}

function editAffiliation(affiliation) {
  adminPanel.value?.openAffiliation(affiliation);
}

function removeAffiliation(affiliation) {
  adminPanel.value?.removeAffiliation(affiliation);
}

/** After anything the admin panel changed. Memberships also change what the viewer may do. */
async function afterChange(change) {
  await load();
  if (change?.memberships) {
    await auth.loadMe();
  }
}
</script>

<style scoped>
.pprofile__stack {
  gap: 26px;
}

.pprofile__section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pprofile__customize-bar {
  align-items: stretch;
}

.pprofile__reorder {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  border-radius: var(--vc-radius);
  background: var(--vc-surface-muted);
  border: 1px dashed var(--vc-border-strong);
  align-self: flex-start;
}
</style>
