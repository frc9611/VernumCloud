<template>
  <div :class="['vc-banner', 'vc-banner--' + variant]">
    <AppIcon v-if="resolvedIcon" :name="resolvedIcon" :size="18" />
    <span class="vc-banner__text">
      <strong v-if="title">{{ title }}</strong>
      <!-- The body is its own element so the gap after the title never depends on template whitespace -->
      <span v-if="$slots.default" class="vc-banner__body"><slot /></span>
    </span>
    <span v-if="aside" class="vc-banner-aside">{{ aside }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import AppIcon from './AppIcon.vue';

/*
 * The colored banners of the mockups: green welcome, yellow warning and so on.
 * Each variant already has a matching icon, so `icon` only has to be given to override it.
 */
const props = defineProps({
  variant: { type: String, default: 'info' },
  title: { type: String, default: '' },
  aside: { type: String, default: '' },
  icon: { type: String, default: '' },
});

const DEFAULT_ICON = {
  success: 'check',
  warning: 'alert',
  danger: 'alert',
  info: 'info',
};

const resolvedIcon = computed(() => props.icon || DEFAULT_ICON[props.variant] || 'info');
</script>

<style scoped>
.vc-banner__text {
  min-width: 0;
}

.vc-banner__body {
  margin-left: 5px;
}
</style>
