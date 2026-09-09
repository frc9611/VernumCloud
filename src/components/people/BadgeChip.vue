<template>
  <component
    :is="clickable ? 'button' : 'span'"
    :type="clickable ? 'button' : null"
    :class="['badge-chip', large ? 'badge-chip--large' : '', clickable ? 'badge-chip--button' : '']"
    :style="{ '--badge-color': color, '--badge-text-color': badge.textColor || 'inherit', '--badge-bg': badge.backgroundColor || 'var(--vc-surface)' }"
    :title="badge.description || badge.kindLabel"
  >
    <span :class="['badge-chip__icon', frameClass]" aria-hidden="true">
      <AppIcon :name="icon" :size="large ? 18 : 13" />
    </span>
    <span class="badge-chip__text">
      <span class="badge-chip__title">{{ badge.title }}</span>
      <span v-if="large" class="badge-chip__sub">{{ subtitle }}</span>
    </span>
  </component>
</template>

<script setup>
import { computed } from 'vue';
import AppIcon from '@/components/AppIcon.vue';
import { badgeFrameClass, badgeIcon } from './profileText.js';

/*
 * One badge as a chip: the icon in the colour of the badge, the title next to it. `color` is
 * resolved by whoever renders the page (badge colour → issuing team → accent), because only the
 * profile knows every team's colour. The colour is data, so it goes inline through a CSS variable
 * and the rest of the look stays on tokens, readable in the three palettes.
 */
const props = defineProps({
  badge: { type: Object, required: true },
  color: { type: String, default: 'var(--vc-purple)' },
  large: { type: Boolean, default: false },
  clickable: { type: Boolean, default: false },
});

const icon = computed(() => badgeIcon(props.badge));
const frameClass = computed(() => badgeFrameClass(props.badge));
const subtitle = computed(() => {
  const issuer = props.badge.issuerName || 'plataforma';
  return props.badge.kind === 'CUSTOM' ? issuer : `${props.badge.kindLabel} · ${issuer}`;
});
</script>

<style scoped>
.badge-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 3px 10px 3px 4px;
  border-radius: 20px;
  border: 1px solid var(--vc-border-strong);
  background: var(--badge-bg);
  color: var(--vc-text);
  font: inherit;
  font-size: 0.8rem;
  max-width: 100%;
  min-width: 0;
  text-align: left;
}

.badge-chip--button {
  cursor: pointer;
}

.badge-chip--button:hover {
  border-color: var(--badge-color);
}

.badge-chip__icon {
  position: relative;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--badge-color);
  color: var(--vc-on-accent);
}

.badge-chip--large {
  padding: 6px 14px 6px 6px;
  border-radius: 14px;
  font-size: 0.88rem;
}

.badge-chip--large .badge-chip__icon {
  width: 34px;
  height: 34px;
}

.badge-chip__text {
  display: grid;
  min-width: 0;
}

.badge-chip__title {
  font-weight: 600;
  color: var(--badge-text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge-chip__sub {
  font-size: 0.74rem;
  color: var(--vc-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
