<template>
  <div class="organizer">
    <template v-if="organizing">
      <AlertBanner variant="info" icon="sliders" title="Organizando a tela inicial">
        Arraste uma seção pela alça ou use as setas; o olho esconde e mostra. Os atalhos se organizam do mesmo
        jeito, dentro da grade. Tudo fica guardado para você, nesta equipe.
      </AlertBanner>
      <div class="vc-row">
        <button class="vc-btn vc-btn--small" type="button" @click="$emit('finish')">
          <AppIcon name="check" :size="15" />
          Concluir
        </button>
        <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" :disabled="!customized" @click="$emit('restore')">
          <AppIcon name="refresh" :size="15" />
          Restaurar padrão
        </button>
      </div>
    </template>
    <div v-else class="vc-row organizer__idle">
      <span class="vc-spacer"></span>
      <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="$emit('start')">
        <AppIcon name="sliders" :size="15" />
        Organizar
      </button>
    </div>
  </div>
</template>

<script setup>
import AlertBanner from '@/components/AlertBanner.vue';
import AppIcon from '@/components/AppIcon.vue';

/* The toolbar of the organising mode: one button to enter it, two to leave it or start over. */
defineProps({
  organizing: { type: Boolean, default: false },
  /** Whether the person changed anything from the default, so "Restaurar padrão" has something to do. */
  customized: { type: Boolean, default: false },
});

defineEmits(['start', 'finish', 'restore']);
</script>

<style scoped>
.organizer {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Sits right under the banner without adding a whole row of height. */
.organizer__idle {
  margin-top: -8px;
}
</style>
