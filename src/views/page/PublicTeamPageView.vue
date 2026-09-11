<template>
  <main class="team-page">
    <p v-if="loading" class="vc-faint team-page__status">Carregando página...</p>

    <div v-else-if="notFound" class="team-page__missing">
      <VernumLogo :size="42" :with-wordmark="false" />
      <EmptyState title="Equipe não encontrada">
        Esse endereço não leva a nenhuma página publicada. Confira o link com a equipe.
        <template #actions>
          <router-link class="vc-btn vc-btn--ghost" :to="{ name: 'openProcesses' }">
            Ver processos seletivos abertos
          </router-link>
          <router-link class="vc-btn vc-btn--ghost" to="/">Ir para o Vernum</router-link>
        </template>
      </EmptyState>
    </div>

    <TeamPage
      v-else
      :page="page"
      :image-url="publicPage.imageUrl"
      :load-post="loadPost"
      :load-more="loadMorePosts"
    />
  </main>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import VernumLogo from '@/components/VernumLogo.vue';
import EmptyState from '@/components/EmptyState.vue';
import TeamPage from '@/components/page/TeamPage.vue';
import { publicPage } from '@/services/api.js';
import { applyAccent, resetAccent } from '@/services/theme.js';

/*
 * The page of a team for whoever has the link: no login, no header, the colour of the team.
 *
 * Every way the server can refuse — unknown slug, inactive team, feature off, nothing published —
 * comes back as the same 404, so there is a single empty state here and no attempt to tell them
 * apart: the address of a page nobody published must not say whether the team exists.
 */
const route = useRoute();

const page = ref(null);
const loading = ref(true);
const notFound = ref(false);
/*
 * The page itself carries the six most recent posts, so the "ver mais" continues from page 1 of six.
 * Asking for a different size would step over or repeat whatever the page already showed.
 */
const POSTS_PER_PAGE = 6;
const postsPage = ref(0);

const originalTitle = document.title;

onMounted(load);
watch(() => route.params.slug, (slug) => slug && load());

onUnmounted(() => {
  resetAccent();
  document.title = originalTitle;
});

async function load() {
  loading.value = true;
  notFound.value = false;
  postsPage.value = 0;
  try {
    const { data } = await publicPage.team(route.params.slug);
    page.value = data;
    //The page is painted in the colour the team chose, or in the team's own colour
    applyAccent(data.accent || data.color);
    document.title = `${data.teamName} · Vernum`;
  } catch (error) {
    page.value = null;
    notFound.value = true;
  } finally {
    loading.value = false;
  }
}

/*
 * The next page of posts, appended. De-duplicated by id because a post published between the two
 * requests pushes everything one place down, and the same post would otherwise arrive twice.
 */
async function loadMorePosts() {
  const next = postsPage.value + 1;
  const { data } = await publicPage.posts(route.params.slug, { page: next, size: POSTS_PER_PAGE });
  const known = new Set((page.value.posts || []).map((post) => post.postId));
  page.value.posts = [
    ...(page.value.posts || []),
    ...(data.items || []).filter((post) => !known.has(post.postId)),
  ];
  page.value.postCount = data.totalElements;
  postsPage.value = next;
}

/* One post in full: the list comes without the bodies, and this is what "ler mais" reaches for. */
async function loadPost(postId) {
  const { data } = await publicPage.post(route.params.slug, postId);
  return data;
}
</script>

<style scoped>
.team-page {
  min-height: 60vh;
}

.team-page__status {
  max-width: var(--vc-content-width);
  margin: 0 auto;
  padding: 40px 20px;
}

.team-page__missing {
  max-width: 560px;
  margin: 0 auto;
  padding: 60px 20px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}
</style>
