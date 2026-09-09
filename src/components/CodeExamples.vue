<template>
  <div class="code-examples">
    <TabBar v-model="activeKey" :tabs="tabs" class="code-examples__tabs" />
    <div v-if="active" class="code-examples__block">
      <button class="vc-btn vc-btn--ghost vc-btn--small code-examples__copy" type="button"
              title="Copiar o exemplo" @click="emit('copy', active.code)">
        <AppIcon name="copy" :size="14" />
        Copiar
      </button>
      <pre class="code-examples__pre"><code>{{ active.code }}</code></pre>
    </div>
    <p v-if="active && active.hint" class="vc-faint code-examples__hint">{{ active.hint }}</p>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import TabBar from '@/components/TabBar.vue';
import AppIcon from '@/components/AppIcon.vue';
import { preferencesStore } from '@/store/preferences.js';

/*
 * A strip of languages over one code block, with a copy button.
 *
 * `examples` is [{ key, label, code, hint? }]; the copy is emitted rather than done here so the
 * screen keeps its own toast wording. The chosen language is remembered per `remember` key in the
 * person's preferences: somebody who writes Python sees Python in every strip that shares the key.
 */
const props = defineProps({
  examples: { type: Array, required: true },
  /** Preferences key under which the chosen language is kept; empty to not remember. */
  remember: { type: String, default: '' },
});
const emit = defineEmits(['copy']);

const preferences = preferencesStore();

const tabs = computed(() => props.examples.map((example) => ({ key: example.key, label: example.label })));
const activeKey = ref(initialKey());
const active = computed(() => props.examples.find((example) => example.key === activeKey.value) || null);

//A strip rebuilt with other languages (a PKCE app after a confidential one) must not point at nothing
watch(() => props.examples, () => {
  if (!props.examples.some((example) => example.key === activeKey.value)) activeKey.value = initialKey();
});

watch(activeKey, (key) => {
  if (props.remember && key && preferences.getSetting(props.remember) !== key) {
    preferences.setSetting(props.remember, key);
  }
});

function initialKey() {
  const remembered = props.remember ? preferences.getSetting(props.remember, null) : null;
  if (remembered && props.examples.some((example) => example.key === remembered)) return remembered;
  return props.examples[0]?.key || '';
}
</script>

<style scoped>
.code-examples {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

/* The strip belongs to the block right under it, not to a page section. */
.code-examples__tabs {
  margin-bottom: 0;
}

.code-examples__block {
  position: relative;
  min-width: 0;
}

.code-examples__copy {
  position: absolute;
  top: 8px;
  right: 8px;
}

.code-examples__pre {
  margin: 0;
  padding: 12px 14px;
  padding-right: 96px;
  max-height: 420px;
  overflow: auto;
  background: var(--vc-surface-muted);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius);
  color: var(--vc-text);
  font-family: ui-monospace, SFMono-Regular, Menlo, 'JetBrains Mono', 'Courier New', monospace;
  font-size: 0.78rem;
  line-height: 1.5;
  tab-size: 2;
}

.code-examples__pre code {
  font: inherit;
  white-space: pre;
}

.code-examples__hint {
  margin: 0;
}
</style>
