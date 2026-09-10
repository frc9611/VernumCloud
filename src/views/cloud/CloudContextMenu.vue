<template>
  <div class="cloud-menu" :style="{ left: position.left + 'px', top: position.top + 'px' }" role="menu">
    <p v-if="title" class="cloud-menu__title">{{ title }}</p>
    <button
      v-for="action in actions"
      :key="action.key"
      type="button"
      role="menuitem"
      :class="['cloud-menu__item', action.danger ? 'is-danger' : '']"
      @click="$emit('pick', action.key)"
    >
      <AppIcon :name="action.icon" :size="15" />
      <span>{{ action.label }}</span>
    </button>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue';
import AppIcon from '@/components/AppIcon.vue';

/*
 * The right button menu. It draws the same list of actions the panel draws, so nothing is reachable
 * one way and not the other, and it is pushed back inside the window when the click lands near an
 * edge — a menu half off the screen is how a right click in a hurry loses the "Apagar" it wanted.
 */
const props = defineProps({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  title: { type: String, default: '' },
  actions: { type: Array, default: () => [] },
});

const emit = defineEmits(['pick', 'close']);

const WIDTH = 210;

const position = computed(() => {
  const height = 40 + props.actions.length * 32;
  return {
    left: Math.max(8, Math.min(props.x, window.innerWidth - WIDTH - 8)),
    top: Math.max(8, Math.min(props.y, window.innerHeight - height - 8)),
  };
});

function close() {
  emit('close');
}

onMounted(() => {
  window.addEventListener('click', close);
  window.addEventListener('resize', close);
  window.addEventListener('scroll', close, true);
});

onBeforeUnmount(() => {
  window.removeEventListener('click', close);
  window.removeEventListener('resize', close);
  window.removeEventListener('scroll', close, true);
});
</script>

<style scoped>
.cloud-menu {
  position: fixed;
  z-index: 60;
  width: 210px;
  padding: 5px;
  background: var(--vc-surface);
  border: 1px solid var(--vc-border-strong);
  border-radius: var(--vc-radius);
  box-shadow: var(--vc-shadow-lg);
}

.cloud-menu__title {
  margin: 2px 6px 6px;
  font-size: 0.75rem;
  color: var(--vc-text-faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cloud-menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: none;
  background: none;
  font: inherit;
  font-size: 0.85rem;
  text-align: left;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--vc-text);
}

.cloud-menu__item:hover {
  background: var(--vc-purple-soft);
  color: var(--vc-purple-strong);
}

.cloud-menu__item.is-danger:hover {
  background: var(--vc-danger-bg);
  color: var(--vc-danger-text);
}
</style>
