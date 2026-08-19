<template>
  <section class="vc-card">
    <header v-if="title" :class="['vc-card__header', muted ? 'vc-card__header--muted' : '']"
            :style="!muted && color ? { background: color } : null">
      <span>{{ title }}</span>
      <span v-if="icon" class="vc-card__icon" aria-hidden="true">{{ icon }}</span>
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
/* Card with a colored header, like the Discord and Scouting cards of the mockups. */
defineProps({
  title: { type: String, default: '' },
  icon: { type: String, default: '' },
  color: { type: String, default: '' },
  muted: { type: Boolean, default: false },
});
</script>
