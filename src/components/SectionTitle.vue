<template>
  <h2 class="vc-section-title">
    <span v-if="lead">{{ lead }}</span>
    <strong>{{ title }}</strong>
    <span class="vc-spacer"></span>
    <slot name="actions" />
  </h2>
</template>

<script setup>
/* "On-Cloud Scouting" style heading: a light lead word and a bold title. */
defineProps({
  lead: { type: String, default: '' },
  title: { type: String, required: true },
});
</script>
