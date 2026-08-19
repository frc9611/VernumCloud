<template>
  <div class="vc-modal-backdrop" @click.self="$emit('close')">
    <div :class="['vc-modal', wide ? 'vc-modal--wide' : '']" role="dialog" aria-modal="true">
      <header class="vc-modal__header">
        <span>{{ title }}</span>
        <span class="vc-spacer"></span>
        <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="$emit('close')">Fechar</button>
      </header>
      <div class="vc-modal__body">
        <slot />
      </div>
      <footer v-if="$slots.footer" class="vc-modal__footer">
        <slot name="footer" />
      </footer>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  wide: { type: Boolean, default: false },
});
defineEmits(['close']);
</script>
