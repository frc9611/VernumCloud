<template>
  <router-link
    v-if="userId"
    :to="{ name: 'person', params: { id: userId } }"
    :class="['person-link', muted ? 'person-link--muted' : '']"
    :title="'Ver o perfil de ' + (name || 'pessoa')"
  >
    <img v-if="avatar" class="vc-avatar person-link__avatar" :src="pictureUrl" alt="" width="22" height="22" />
    <slot>{{ name }}</slot>
  </router-link>
  <span v-else :class="['person-link', 'person-link--plain', muted ? 'person-link--muted' : '']">
    <slot>{{ name }}</slot>
  </span>
</template>

<script setup>
import { computed } from 'vue';
import { users } from '@/services/api.js';

/*
 * The name of a person, clickable: it opens their profile at /pessoas/:id.
 *
 * Styled as the text around it (same colour, underline on hover), so a table or a card keeps its
 * look and only gains the click. Without a user id — a candidate who has no account yet, an author
 * that was deleted — it renders the plain name, so callers do not have to branch.
 */
const props = defineProps({
  userId: { type: String, default: '' },
  name: { type: String, default: '' },
  /** Shows a small round picture before the name. */
  avatar: { type: Boolean, default: false },
  /** Muted colour, for secondary lines ("por Fulano"). */
  muted: { type: Boolean, default: false },
});

const pictureUrl = computed(() => (props.userId ? users.pictureUrl(props.userId) : ''));
</script>

<style scoped>
.person-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: inherit;
  font: inherit;
  text-decoration: none;
  max-width: 100%;
  vertical-align: baseline;
}

.person-link:not(.person-link--plain):hover,
.person-link:not(.person-link--plain):focus-visible {
  text-decoration: underline;
  text-decoration-color: var(--vc-purple-strong);
  text-underline-offset: 2px;
}

.person-link--muted {
  color: var(--vc-text-muted);
}

.person-link__avatar {
  width: 22px;
  height: 22px;
  flex: none;
}
</style>
