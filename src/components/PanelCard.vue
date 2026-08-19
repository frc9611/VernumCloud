<template>
  <section class="vc-card">
    <header
      v-if="title"
      :class="['vc-card__header', muted ? 'vc-card__header--muted' : '']"
      :style="!muted && color ? { background: color } : null"
    >
      <span>{{ title }}</span>
      <AppIcon v-if="icon" class="vc-card__icon" :name="icon" :size="17" />
      <slot name="header-actions" />
    </header>
    <div class="vc-card__body">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="vc-card__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<script setup>
import AppIcon from './AppIcon.vue';

/* Card with a colored header, like the Discord and Scouting cards of the mockups. */
defineProps({
  title: { type: String, default: '' },
  icon: { type: String, default: '' },
  color: { type: String, default: '' },
  muted: { type: Boolean, default: false },
});
</script>
