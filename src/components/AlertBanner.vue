<template>
  <div :class="['vc-banner', 'vc-banner--' + variant]">
    <span v-if="icon" aria-hidden="true">{{ icon }}</span>
    <span><strong v-if="title">{{ title }}</strong><template v-if="title && $slots.default"> </template><slot /></span>
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
