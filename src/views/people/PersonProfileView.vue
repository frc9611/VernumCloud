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
        @follow="follow"
        @unfollow="unfollow"
        @save="saveProfile"
      />

      <ProfileAdminPanel v-if="showAdmin" ref="adminPanel" :profile="profile" @changed="afterChange" />

      <ProfileTeams :memberships="profile.memberships" :has-history="profile.affiliations.length > 0" />

      <ProfileHistory
        :affiliations="profile.affiliations"
        :events="profile.events"
        @edit-affiliation="editAffiliation"
        @remove-affiliation="removeAffiliation"
      />

      <ProfileBadges
        :badges="profile.badges"
        :owner="profile.canEditProfile"
        :team-color-of="teamColorOf"
        @toggle-highlight="toggleHighlight"
        @remove="removeBadge"
      />

      <ProfileEvents :events="profile.events" />
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'vue-toastification';
import EmptyState from '@/components/EmptyState.vue';
import ProfileAdminPanel from '@/components/people/ProfileAdminPanel.vue';
import ProfileBadges from '@/components/people/ProfileBadges.vue';
import ProfileEvents from '@/components/people/ProfileEvents.vue';
import ProfileHeader from '@/components/people/ProfileHeader.vue';
import ProfileHistory from '@/components/people/ProfileHistory.vue';
import ProfileTeams from '@/components/people/ProfileTeams.vue';
import { authStore } from '@/store/auth.js';
import { people } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

/*
 * The profile of a person, at /pessoas/:id.
 *
 * One page for every case — student, mentor, alumnus, platform administrator — because a person is
 * one thing across teams and after them. What changes is the emphasis, and the server's `kind` is
 * only a hint for it. The sections read from a single PersonProfileDto; every action (follow, edit,
 * badges, administration) reloads it, so what is on screen is always what the server holds.
 */
const route = useRoute();
const auth = authStore();
const toast = useToast();

const profile = ref(null);
const loading = ref(false);
const busy = ref(false);
const adminPanel = ref(null);

const showAdmin = computed(() => {
  const dto = profile.value;
  if (!dto) return false;
  return dto.canGrantBadges || dto.canAddAffiliation || dto.viewerPlatformAdmin || dto.manageableTenants.length > 0
    || dto.affiliations.some((affiliation) => affiliation.canEdit);
});

onMounted(load);
watch(() => route.params.id, load);

async function load() {
  const userId = route.params.id;
  if (!userId) return;
  loading.value = true;
  try {
    const { data } = await people.profile(userId);
    profile.value = data;
  } catch (error) {
    //404 and 403 read the same to whoever is looking: there is nothing to show here
    profile.value = null;
  } finally {
    loading.value = false;
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
</style>
