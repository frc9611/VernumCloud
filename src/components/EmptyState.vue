<template>
  <div class="vc-empty">
    <p style="margin: 0 0 4px; font-weight: 600; color: var(--vc-text)">{{ title }}</p>
    <p style="margin: 0"><slot /></p>
    <div v-if="$slots.actions" class="vc-row" style="justify-content: center; margin-top: 14px">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
defineProps({ title: { type: String, default: 'Nada por aqui' } });
</script>
