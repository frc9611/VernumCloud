<template>
  <nav class="vc-tabs">
    <component
      v-for="tab in tabs"
      :key="tab.key"
      :is="tab.to && !tab.disabled ? 'router-link' : 'button'"
      :to="tab.to"
      :type="tab.to ? null : 'button'"
      :disabled="tab.disabled || null"
      :title="tab.hint || null"
      :class="['vc-tab', modelValue === tab.key ? 'is-active' : '', tab.disabled ? 'is-disabled' : '']"
      @click="select(tab)"
    >
      {{ tab.label }}
      <span v-if="tab.badge" class="vc-badge vc-badge--purple" style="margin-left: 6px">{{ tab.badge }}</span>
    </component>
    <div v-if="$slots.context" class="vc-tabs-context">
      <slot name="context" />
    </div>
  </nav>
</template>

<script setup>
/* The tab strip of the mockups, with the contextual chips on the right. */
const props = defineProps({
  tabs: { type: Array, required: true },
  modelValue: { type: String, default: '' },
});
const emit = defineEmits(['update:modelValue']);

function select(tab) {
  if (tab.disabled || tab.to) return;
  emit('update:modelValue', tab.key);
}
</script>
