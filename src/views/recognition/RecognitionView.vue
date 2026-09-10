<template>
  <main class="vc-page">
    <div class="vc-stack">
      <h1 class="vc-title vc-title--underlined">Reconhecimento</h1>

      <p class="vc-muted" style="margin: 0">
        Alguém te ensinou, te ajudou ou segurou a barra? Diga isso em uma frase. É público para a
        equipe e assinado — não existe ranking nem contagem de pontos aqui.
      </p>

      <!-- ---------------------------------------------------------- reconhecer -->
      <section v-if="board?.canGive" class="rk__form vc-stack">
        <div class="vc-row vc-row--between">
          <SectionTitle title="Reconhecer alguém" />
          <span :class="['vc-chip', board.remaining ? 'vc-chip--purple' : 'vc-chip--warning']">
            {{ board.remaining }} de {{ board.weeklyQuota }} nesta semana
          </span>
        </div>

        <p v-if="!board.remaining" class="vc-faint" style="margin: 0">
          Você usou os {{ board.weeklyQuota }} desta semana. A cota volta na segunda — o limite existe
          para o gesto continuar valendo algo.
        </p>

        <template v-else>
          <div class="vc-field">
            <label class="vc-label" for="rk-who">Quem</label>
            <select id="rk-who" class="vc-input" v-model="form.toUserId">
              <option :value="null">Escolha uma pessoa</option>
              <option v-for="p in others" :key="p.user.userId" :value="p.user.userId">
                {{ p.user.name }}
              </option>
            </select>
          </div>

          <div class="rk__cats">
            <button v-for="cat in board.categories" :key="cat.name" type="button"
                    :class="['rk__cat', form.category === cat.name ? 'is-picked' : '']"
                    :style="{ '--cat': cat.color }" @click="form.category = cat.name">
              <AppIcon :name="cat.icon" :size="17" />
              <strong>{{ cat.label }}</strong>
              <span class="vc-faint">{{ cat.hint }}</span>
            </button>
          </div>

          <div class="vc-field">
            <label class="vc-label" for="rk-msg">Por quê (opcional)</label>
            <input id="rk-msg" class="vc-input" type="text" v-model="form.message" maxlength="200"
                   placeholder="me ensinou a soldar sem eu pedir" />
          </div>

          <div>
            <button class="vc-btn" type="button" :disabled="!form.toUserId || !form.category || sending"
                    @click="give">
              {{ sending ? 'Enviando...' : 'Reconhecer' }}
            </button>
          </div>
        </template>
      </section>

      <!-- -------------------------------------------------------------- mural -->
      <SectionTitle title="O que a equipe disse" />
      <p v-if="loading" class="vc-faint">Carregando...</p>
      <EmptyState v-else-if="!board?.items.length" title="Nada ainda">
        Seja a primeira pessoa a reconhecer alguém.
      </EmptyState>
      <ul v-else class="rk__feed">
        <li v-for="item in board.items" :key="item.kudoId" :style="{ '--cat': item.color }">
          <span class="rk__badge"><AppIcon :name="item.icon" :size="15" /></span>
          <div class="rk__body">
            <p class="rk__line">
              <PersonLink :user-id="item.from.userId" :name="item.from.name" />
              <span>reconheceu</span>
              <PersonLink :user-id="item.to.userId" :name="item.to.name" />
              <span class="vc-chip" :style="{ '--chip': item.color }">{{ item.categoryLabel }}</span>
            </p>
            <p v-if="item.message" class="rk__msg">“{{ item.message }}”</p>
            <p class="vc-faint" style="margin: 2px 0 0">{{ formatAgo(item.createdAt) }}</p>
          </div>
          <button v-if="item.canRemove" class="vc-btn vc-btn--ghost vc-btn--small" type="button"
                  @click="remove(item)">tirar</button>
        </li>
      </ul>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import AppIcon from '@/components/AppIcon.vue';
import EmptyState from '@/components/EmptyState.vue';
import PersonLink from '@/components/PersonLink.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import { authStore } from '@/store/auth.js';
import { kudos, tenants } from '@/services/api.js';
import { formatAgo } from '@/services/time.js';

/*
 * O mural de reconhecimentos.
 *
 * A cota aparece antes do formulário de propósito: descobrir que acabou levando um 422 na cara é a
 * pior forma de descobrir. E não há contagem por pessoa em lugar nenhum desta tela — o valor está em
 * ler quem escreveu e o quê, e qualquer número agregado seria o começo de um ranking.
 */
const auth = authStore();
const toast = useToast();

const board = ref(null);
const members = ref([]);
const loading = ref(true);
const sending = ref(false);

const form = reactive({ toUserId: null, category: null, message: '' });

const others = computed(() =>
  members.value.filter((m) => m.user.userId !== auth.user?.userId && m.active !== false));

onMounted(load);
watch(() => auth.activeTenantId, load);

async function load() {
  loading.value = true;
  try {
    const [b, ms] = await Promise.all([
      kudos.board(auth.activeTenantId),
      tenants.members(auth.activeTenantId).catch(() => ({ data: [] })),
    ]);
    board.value = b.data;
    members.value = ms.data;
  } catch (error) {
    board.value = null;
    toast.error('Não deu para abrir o reconhecimento.');
  } finally {
    loading.value = false;
  }
}

async function give() {
  sending.value = true;
  try {
    await kudos.give(auth.activeTenantId, {
      toUserId: form.toUserId,
      category: form.category,
      message: form.message || null,
    });
    Object.assign(form, { toUserId: null, category: null, message: '' });
    toast.success('Reconhecido.');
    await load();
  } catch (error) {
    toast.error(error.response?.data?.message || 'Não deu para reconhecer.');
  } finally {
    sending.value = false;
  }
}

async function remove(item) {
  try {
    await kudos.remove(auth.activeTenantId, item.kudoId);
    await load();
  } catch (error) {
    toast.error(error.response?.data?.message || 'Não deu para tirar.');
  }
}
</script>

<style scoped>
.rk__form {
  padding: 14px;
  border: 1px solid var(--vc-border);
  border-radius: 10px;
  background: var(--vc-surface);
}

.rk__cats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 8px;
}

.rk__cat {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: 10px;
  border: 1px solid var(--vc-border);
  border-radius: 8px;
  background: var(--vc-surface);
  color: var(--cat);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.rk__cat strong { color: var(--vc-text); }
.rk__cat:hover { border-color: var(--cat); }

.rk__cat.is-picked {
  border-color: var(--cat);
  box-shadow: inset 0 0 0 1px var(--cat);
}

.rk__feed { list-style: none; margin: 0; padding: 0; }

.rk__feed li {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px 0;
  border-top: 1px solid var(--vc-border);
}

.rk__badge {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  color: var(--cat);
  background: color-mix(in srgb, var(--cat) 14%, transparent);
}

.rk__body { flex: 1; min-width: 0; }

/* Flex e não texto corrido: sem isso o nome e a etiqueta do motivo ficam colados */
.rk__line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  margin: 0;
}

.rk__msg {
  margin: 4px 0 0;
  font-style: italic;
  color: var(--vc-text-muted);
}
</style>
