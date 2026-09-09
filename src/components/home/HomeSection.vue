<template>
  <div
    :class="['home-section', { 'is-organizing': organizing, 'is-hidden': hidden, 'is-dragging': dragging, 'is-drop-target': dropTarget }]"
    @dragover="onDragOver"
    @dragleave="$emit('drag-leave', sectionKey)"
    @drop.prevent="$emit('drop', sectionKey)"
  >
    <!-- The handle only exists while organising: the arrows, the eye and the grip the drag starts from. -->
    <div
      v-if="organizing"
      class="home-section__handle"
      :draggable="true"
      @dragstart="onDragStart"
      @dragend="$emit('drag-end', sectionKey)"
    >
      <AppIcon name="grip" :size="16" class="home-section__grip" />
      <strong class="home-section__title">{{ title }}</strong>
      <span v-if="hidden" class="vc-chip">Oculta</span>
      <span class="vc-spacer"></span>
      <button class="vc-btn vc-btn--ghost vc-btn--icon vc-btn--small" type="button" :disabled="first"
              aria-label="Mover para cima" title="Mover para cima" @click="$emit('move', sectionKey, -1)">
        <AppIcon name="chevronUp" :size="15" />
      </button>
      <button class="vc-btn vc-btn--ghost vc-btn--icon vc-btn--small" type="button" :disabled="last"
              aria-label="Mover para baixo" title="Mover para baixo" @click="$emit('move', sectionKey, 1)">
        <AppIcon name="chevronDown" :size="15" />
      </button>
      <button class="vc-btn vc-btn--ghost vc-btn--icon vc-btn--small" type="button"
              :aria-label="hidden ? 'Mostrar seção' : 'Ocultar seção'" :aria-pressed="hidden"
              :title="hidden ? 'Mostrar seção' : 'Ocultar seção'" @click="$emit('toggle', sectionKey)">
        <AppIcon :name="hidden ? 'eyeOff' : 'eye'" :size="15" />
      </button>
    </div>

    <!-- A hidden section keeps only its handle while organising, so the screen stays short. -->
    <div v-if="!hidden" :class="['home-section__body', { 'is-preview': organizing && !interactive }]">
      <slot />
    </div>
  </div>
</template>

<script setup>
import AppIcon from '@/components/AppIcon.vue';

/*
 * One movable section of the home tab.
 *
 * Outside the organising mode it is invisible: `display: contents` on the wrapper and on the body leaves
 * no box, so a section whose content renders nothing (a carousel without trips) costs no gap either.
 * Organising, it grows a handle and becomes a drop target; the parent owns the order and answers the
 * events. The content of most sections turns into a capped preview then — the handle is what one works
 * with — except where the content has controls of its own, like the shortcut grid.
 */
const props = defineProps({
  sectionKey: { type: String, required: true },
  title: { type: String, required: true },
  organizing: { type: Boolean, default: false },
  hidden: { type: Boolean, default: false },
  first: { type: Boolean, default: false },
  last: { type: Boolean, default: false },
  dragging: { type: Boolean, default: false },
  dropTarget: { type: Boolean, default: false },
  /** Whether the content stays usable while organising. Off, it is a short preview nobody can click. */
  interactive: { type: Boolean, default: false },
});

const emit = defineEmits(['move', 'toggle', 'drag-start', 'drag-over', 'drag-leave', 'drag-end', 'drop']);

function onDragStart(event) {
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', props.sectionKey);
  emit('drag-start', props.sectionKey);
}

function onDragOver(event) {
  if (!props.organizing) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  emit('drag-over', props.sectionKey);
}
</script>

<style scoped>
.home-section,
.home-section__body {
  display: contents;
}

.home-section.is-organizing {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 10px;
  border: 1px dashed var(--vc-border-strong);
  border-radius: var(--vc-radius-lg);
  background: var(--vc-surface);
  transition: border-color 0.12s ease, opacity 0.12s ease;
}

.home-section.is-organizing.is-hidden {
  background: var(--vc-surface-muted);
}

.home-section.is-organizing.is-hidden .home-section__title {
  color: var(--vc-text-muted);
}

.home-section.is-dragging {
  opacity: 0.5;
}

.home-section.is-drop-target {
  border-color: var(--vc-purple);
  border-style: solid;
  box-shadow: var(--vc-focus-ring) 0 0 0 4px;
}

.home-section__handle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: var(--vc-radius);
  cursor: grab;
  user-select: none;
}

.home-section__handle:active {
  cursor: grabbing;
}

.home-section__grip {
  color: var(--vc-text-faint);
}

.home-section__title {
  font-size: 0.9rem;
}

.home-section.is-organizing .home-section__body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* While organising most content is a preview: short, faded, and deaf to clicks. */
.home-section.is-organizing .home-section__body.is-preview {
  max-height: 220px;
  overflow: hidden;
  pointer-events: none;
  opacity: 0.7;
  mask-image: linear-gradient(to bottom, black 65%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, black 65%, transparent);
}
</style>
