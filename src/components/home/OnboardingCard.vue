<template>
  <section v-if="checklist?.visible" class="ob vc-stack">
    <div class="vc-row vc-row--between">
      <div>
        <strong>Primeiros passos</strong>
        <p class="vc-faint" style="margin: 2px 0 0">
          Nenhum destes se marca à mão: cada um aparece feito quando você faz.
        </p>
      </div>
      <span class="vc-chip vc-chip--purple">{{ checklist.done }} de {{ checklist.total }}</span>
    </div>

    <div class="ob__bar" role="presentation">
      <span :style="{ width: percent + '%' }"></span>
    </div>

    <ul class="ob__list">
      <li v-for="step in checklist.steps" :key="step.code" :class="step.done ? 'is-done' : ''">
        <AppIcon :name="step.done ? 'check' : step.icon" :size="15" />
        <div class="ob__text">
          <strong>{{ step.title }}</strong>
          <span class="vc-faint">{{ step.hint }}</span>
        </div>
        <router-link v-if="!step.done && routeOf(step)" class="vc-btn vc-btn--ghost vc-btn--small"
                     :to="routeOf(step)">Ir</router-link>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import AppIcon from '@/components/AppIcon.vue';
import { authStore } from '@/store/auth.js';
import { onboarding } from '@/services/api.js';

/*
 * O cartão de primeiros passos, na tela inicial.
 *
 * `visible` é o único campo que decide se ele existe: o servidor já resolve "terminou" e "faz tempo
 * demais para a plataforma ainda perguntar". Uma falha ao carregar não mostra erro nenhum — este
 * cartão é ajuda, e ajuda que reclama quando não carrega é estorvo.
 */
const auth = authStore();
const checklist = ref(null);

const percent = computed(() => {
  const c = checklist.value;
  return c && c.total ? Math.round((c.done / c.total) * 100) : 0;
});

/* O passo diz o nome da rota; o cartão não sabe montar URL de nada. */
function routeOf(step) {
  return step.route ? { name: step.route } : null;
}

onMounted(load);
watch(() => auth.activeTenantId, load);

async function load() {
  if (!auth.activeTenantId) {
    checklist.value = null;
    return;
  }
  try {
    const { data } = await onboarding.mine(auth.activeTenantId);
    checklist.value = data;
  } catch (error) {
    checklist.value = null;
  }
}
</script>

<style scoped>
.ob {
  padding: 14px;
  border: 1px solid var(--vc-purple-border);
  border-radius: 10px;
  background: var(--vc-purple-soft);
}

.ob__bar {
  height: 6px;
  border-radius: 3px;
  background: var(--vc-surface);
  overflow: hidden;
}

.ob__bar span {
  display: block;
  height: 100%;
  background: var(--vc-purple);
  transition: width 0.3s ease;
}

.ob__list { list-style: none; margin: 0; padding: 0; }

.ob__list li {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 0;
  border-top: 1px solid var(--vc-purple-border);
}

.ob__list li.is-done { opacity: 0.55; }
.ob__list li.is-done strong { text-decoration: line-through; }

.ob__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
</style>
