<template>
  <router-link
    v-if="userId"
    :to="{ name: 'person', params: { id: userId } }"
    :class="['person-link', muted ? 'person-link--muted' : '']"
    :style="nameColor ? { color: nameColor } : null"
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
import { computed, onUnmounted, ref, watch } from 'vue';
import { users } from '@/services/api.js';
import { subscribeSpotlightColor } from '@/services/spotlightColors.js';

/*
 * The name of a person, clickable: it opens their profile at /pessoas/:id.
 *
 * Styled as the text around it (same colour, underline on hover), so a table or a card keeps its
 * look and only gains the click. Without a user id — a candidate who has no account yet, an author
 * that was deleted — it renders the plain name, so callers do not have to branch.
 *
 * When the person has a primary spotlight, its color paints the name here too — the one place every
 * screen in the platform already routes a person's name through, so a spotlight set once shows up
 * everywhere without threading a color through every list that names somebody. `muted` wins over it:
 * a secondary line ("por Fulano") stays muted on purpose.
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

const spotlightColor = ref(null);
let unsubscribe = null;

function subscribe() {
  unsubscribe?.();
  unsubscribe = null;
  spotlightColor.value = null;
  if (props.userId) {
    unsubscribe = subscribeSpotlightColor(props.userId, (color) => {
      spotlightColor.value = color;
    });
  }
}

watch(() => props.userId, subscribe, { immediate: true });
onUnmounted(() => unsubscribe?.());

const nameColor = computed(() => (props.muted ? null : spotlightColor.value));
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
