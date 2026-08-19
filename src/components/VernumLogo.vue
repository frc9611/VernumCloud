<template>
  <span class="vc-logo">
    <!--
      The mark is inlined instead of loaded as an <img> so it can be painted with currentColor
      and follow the accent of the team currently open. src/assets/logo.svg is the same drawing
      with a fixed color, used as the favicon.
    -->
    <svg
      class="vc-logo__mark"
      :style="{ width: size + 'px', height: size + 'px' }"
      viewBox="0 0 64 64"
      role="img"
      aria-label="Vernum Cloud"
    >
      <g fill="none" stroke="currentColor" stroke-width="3.1" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20.5 38.5C13.6 38.5 10 33.6 11.9 27.6C13.2 23.5 16.9 21.3 20.2 22.3C20.8 14.2 28.6 9.4 34.9 12.6C38.7 14.5 40.8 18.3 40.6 22.2C46.6 20.3 52.4 24.4 52.4 30.3C52.4 35.1 48.7 38.5 44.4 38.5Z"/>
        <path d="M23.6 32.2h13.2" stroke-width="2.6"/>
        <path d="M23.6 26.4h7.4" stroke-width="2.6"/>
        <path d="M36.8 32.2a2.9 2.9 0 0 0 2.9-2.9v-1.6" stroke-width="2.6"/>
        <path d="M20.8 38.5v9.4" stroke-width="2.4"/>
        <path d="M26.6 38.5v13.8" stroke-width="2.4"/>
        <path d="M32.4 38.5v7.6" stroke-width="2.4"/>
        <path d="M38.2 38.5v12" stroke-width="2.4"/>
        <path d="M44 38.5v9.4" stroke-width="2.4"/>
      </g>
      <g fill="currentColor">
        <circle cx="39.7" cy="25.4" r="2.7"/>
        <circle cx="23.6" cy="26.4" r="1.9"/>
        <circle cx="23.6" cy="32.2" r="1.9"/>
        <circle cx="20.8" cy="50.1" r="1.8"/>
        <circle cx="26.6" cy="54.5" r="1.8"/>
        <circle cx="32.4" cy="48.3" r="1.8"/>
        <circle cx="38.2" cy="52.7" r="1.8"/>
        <circle cx="44" cy="50.1" r="1.8"/>
      </g>
    </svg>

    <span v-if="withWordmark" class="vc-logo__text" :style="{ fontSize: fontSize }">
      Vernum <strong>Cloud</strong>
    </span>
  </span>
</template>

<script setup>
/* Logo plus the "Vernum Cloud" wordmark of the mockups: light first word, bold second. */
defineProps({
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
  color: var(--vc-purple);
}

.vc-logo__mark {
  flex: none;
  display: block;
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
