<template>
  <section class="vc-stack">
    <SectionTitle lead="Atalhos" title="da Equipe" />

    <div v-if="visible.length || organizing" class="vc-grid">
      <template v-if="!organizing">
        <router-link v-for="shortcut in visible" :key="shortcut.key" :to="shortcut.to" class="vc-card vc-card--action">
          <div class="vc-card__header">
            <span>{{ shortcut.label }}</span>
            <AppIcon class="vc-card__icon" :name="shortcut.icon" :size="17" />
          </div>
          <div class="vc-card__body">
            <p>{{ shortcut.hint }}</p>
          </div>
        </router-link>
      </template>

      <!-- Organising: every card, the hidden ones too, as a block one can move and toggle. -->
      <template v-else>
        <div
          v-for="(shortcut, index) in items"
          :key="shortcut.key"
          :class="['vc-card', 'shortcut', {
            'is-hidden': hidden.includes(shortcut.key),
            'is-dragging': dragging === shortcut.key,
            'is-drop-target': dropTarget === shortcut.key,
          }]"
          :draggable="true"
          @dragstart="onDragStart($event, shortcut.key)"
          @dragend="onDragEnd"
          @dragover="onDragOver($event, shortcut.key)"
          @dragleave="onDragLeave(shortcut.key)"
          @drop.prevent="onDrop(shortcut.key)"
        >
          <div class="vc-card__header vc-card__header--muted">
            <AppIcon name="grip" :size="15" class="shortcut__grip" />
            <span>{{ shortcut.label }}</span>
            <AppIcon class="vc-card__icon" :name="shortcut.icon" :size="17" />
          </div>
          <div class="vc-card__body">
            <p>{{ shortcut.hint }}</p>
          </div>
          <div class="vc-card__footer shortcut__controls">
            <span v-if="hidden.includes(shortcut.key)" class="vc-chip">Oculto</span>
            <span class="vc-spacer"></span>
            <button class="vc-btn vc-btn--ghost vc-btn--icon vc-btn--small" type="button" :disabled="index === 0"
                    aria-label="Mover para antes" title="Mover para antes" @click="$emit('move', shortcut.key, -1)">
              <AppIcon name="chevronLeft" :size="15" />
            </button>
            <button class="vc-btn vc-btn--ghost vc-btn--icon vc-btn--small" type="button" :disabled="index === items.length - 1"
                    aria-label="Mover para depois" title="Mover para depois" @click="$emit('move', shortcut.key, 1)">
              <AppIcon name="chevronRight" :size="15" />
            </button>
            <button class="vc-btn vc-btn--ghost vc-btn--icon vc-btn--small" type="button"
                    :aria-label="hidden.includes(shortcut.key) ? 'Mostrar atalho' : 'Ocultar atalho'"
                    :aria-pressed="hidden.includes(shortcut.key)"
                    :title="hidden.includes(shortcut.key) ? 'Mostrar atalho' : 'Ocultar atalho'"
                    @click="$emit('toggle', shortcut.key)">
              <AppIcon :name="hidden.includes(shortcut.key) ? 'eyeOff' : 'eye'" :size="15" />
            </button>
          </div>
        </div>
      </template>
    </div>

    <p v-else class="vc-faint" style="margin: 0">
      Todos os atalhos estão ocultos. Use "Organizar" para mostrar algum de novo.
    </p>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import AppIcon from '@/components/AppIcon.vue';
import SectionTitle from '@/components/SectionTitle.vue';

/*
 * The shortcut cards, in the order the person arranged them.
 *
 * `items` is every card the person may open today, already ordered; `hidden` the keys they chose not to
 * see. Outside the organising mode only the visible ones render, as the link cards they always were.
 * Organising, every card shows up as a plain block with arrows and an eye, and can be dragged onto
 * another card to take its place.
 */
const props = defineProps({
  items: { type: Array, required: true },
  hidden: { type: Array, default: () => [] },
  organizing: { type: Boolean, default: false },
});

const emit = defineEmits(['move', 'move-to', 'toggle']);

const dragging = ref(null);
const dropTarget = ref(null);

const visible = computed(() => props.items.filter((shortcut) => !props.hidden.includes(shortcut.key)));

function onDragStart(event, key) {
  dragging.value = key;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', key);
}

function onDragOver(event, key) {
  if (dragging.value === null) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  dropTarget.value = key;
}

function onDragLeave(key) {
  if (dropTarget.value === key) dropTarget.value = null;
}

function onDragEnd() {
  dragging.value = null;
  dropTarget.value = null;
}

function onDrop(targetKey) {
  const key = dragging.value;
  onDragEnd();
  if (key && key !== targetKey) emit('move-to', key, targetKey);
}
</script>

<style scoped>
.shortcut {
  display: flex;
  flex-direction: column;
  cursor: grab;
  border-style: dashed;
  transition: opacity 0.12s ease, border-color 0.12s ease;
}

.shortcut:active {
  cursor: grabbing;
}

.shortcut > .vc-card__body {
  flex-grow: 1;
}

.shortcut.is-hidden {
  opacity: 0.55;
}

.shortcut.is-dragging {
  opacity: 0.4;
}

.shortcut.is-drop-target {
  border-color: var(--vc-purple);
  border-style: solid;
  box-shadow: var(--vc-focus-ring) 0 0 0 4px;
}

.shortcut__grip {
  color: var(--vc-text-faint);
}

.shortcut__controls {
  gap: 4px;
}
</style>
