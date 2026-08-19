<template>
  <div :class="['vc-banner', 'vc-banner--' + variant]">
    <span v-if="icon" class="vc-banner__icon" aria-hidden="true">{{ icon }}</span>
    <span class="vc-banner__text">
      <strong v-if="title">{{ title }}</strong>
      <!-- The body is its own element so the gap after the title never depends on template whitespace -->
      <span v-if="$slots.default" class="vc-banner__body"><slot /></span>
    </span>
    <span v-if="aside" class="vc-banner-aside">{{ aside }}</span>
  </div>
</template>

<script setup>
/* The colored banners of the mockups: green welcome, yellow warning and so on. */
defineProps({
  variant: { type: String, default: 'info' },
  title: { type: String, default: '' },
  aside: { type: String, default: '' },
  icon: { type: String, default: '' },
});
</script>

<style scoped>
.vc-banner__icon {
  flex: none;
}

.vc-banner__text {
  min-width: 0;
}

.vc-banner__body {
  margin-left: 5px;
}
</style>
