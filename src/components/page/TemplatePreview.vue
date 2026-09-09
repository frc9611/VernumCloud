<template>
  <div :class="['preview', 'preview--' + variant]" aria-hidden="true">
    <div class="preview__hero">
      <span class="preview__logo"></span>
      <span class="preview__lines">
        <i class="preview__line preview__line--title"></i>
        <i class="preview__line"></i>
      </span>
    </div>
    <div class="preview__rule"></div>
    <div class="preview__posts">
      <i class="preview__post"></i>
      <i class="preview__post"></i>
      <i class="preview__post"></i>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

/*
 * A schematic of one page template, small enough to sit in a picker card: where the logo goes,
 * how big the headline is, and whether the posts stack or tile. Drawn with boxes and the accent
 * tokens, so it follows the colour of the team like the page itself will.
 */
const props = defineProps({
  template: { type: String, required: true },
});

const VARIANTS = { CLASSIC: 'classic', BOLD: 'bold', MINIMAL: 'minimal' };

const variant = computed(() => VARIANTS[props.template] || 'classic');
</script>

<style scoped>
.preview {
  width: 100%;
  aspect-ratio: 4 / 3;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--vc-bg);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius);
  overflow: hidden;
}

.preview__hero {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview__logo {
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  background: var(--vc-purple);
}

.preview__lines {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.preview__line {
  display: block;
  height: 5px;
  width: 60%;
  border-radius: 3px;
  background: var(--vc-border-strong);
}

.preview__line--title {
  width: 85%;
  height: 7px;
  background: var(--vc-text-muted);
}

.preview__rule {
  display: none;
  height: 1px;
  background: var(--vc-purple);
}

.preview__posts {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.preview__post {
  display: block;
  flex: 1;
  border-radius: 3px;
  background: var(--vc-surface);
  border: 1px solid var(--vc-border);
}

/* Clássico: a card with the logo at the left, posts stacked as a list */
.preview--classic .preview__hero {
  padding: 8px;
  background: var(--vc-surface);
  border: 1px solid var(--vc-border);
  border-top: 2px solid var(--vc-purple);
  border-radius: 4px;
}

/* Impacto: a full-width accent block with a big title, posts as tiles */
.preview--bold {
  padding: 0;
  gap: 6px;
}

.preview--bold .preview__hero {
  align-items: flex-end;
  min-height: 44%;
  padding: 8px;
  background: linear-gradient(135deg, var(--vc-purple), var(--vc-purple-strong));
}

.preview--bold .preview__logo {
  background: var(--vc-surface);
}

.preview--bold .preview__line {
  background: var(--vc-on-accent);
  opacity: 0.75;
}

.preview--bold .preview__line--title {
  height: 9px;
  opacity: 1;
}

.preview--bold .preview__posts {
  flex-direction: row;
  padding: 0 8px 8px;
}

/* Minimalista: a narrow column, mostly text, the accent only as a thin rule */
.preview--minimal {
  padding: 10px 22%;
}

.preview--minimal .preview__hero {
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.preview--minimal .preview__logo {
  width: 12px;
  height: 12px;
  background: var(--vc-border-strong);
}

.preview--minimal .preview__lines {
  width: 100%;
}

.preview--minimal .preview__line--title {
  width: 100%;
  height: 6px;
}

.preview--minimal .preview__rule {
  display: block;
}

.preview--minimal .preview__post {
  border: 0;
  border-top: 1px solid var(--vc-border);
  border-radius: 0;
  background: none;
}
</style>
