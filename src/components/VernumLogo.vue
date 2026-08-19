<template>
  <span class="vc-logo">
    <img src="../assets/logo.svg" alt="Vernum" :style="{ height: size + 'px', width: size + 'px' }" />
    <span v-if="withWordmark" class="vc-logo__text" :style="{ fontSize: fontSize }">
      Vernum <strong>Cloud</strong>
    </span>
  </span>
</template>

<script setup>
/* Logo plus the "Vernum Cloud" wordmark of the mockups: light first word, bold second. */
const props = defineProps({
  size: { type: Number, default: 34 },
  withWordmark: { type: Boolean, default: true },
  fontSize: { type: String, default: '1.35rem' },
});
</script>

<style scoped>
.vc-logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.vc-logo__text {
  font-weight: 300;
  letter-spacing: -0.01em;
  color: var(--vc-text);
  white-space: nowrap;
}

.vc-logo__text strong {
  font-weight: 700;
}
</style>
