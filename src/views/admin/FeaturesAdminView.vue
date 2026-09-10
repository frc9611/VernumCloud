<template>
  <main class="vc-page">
    <div class="vc-stack">
      <div class="vc-row vc-row--between">
        <h1 class="vc-title vc-title--underlined">Recursos da equipe</h1>
        <span class="vc-chip vc-chip--purple">{{ auth.activeTenantName }}</span>
      </div>

      <AlertBanner variant="warning" title="Desligar um recurso tira a permissão de todo mundo."
                   :aside="state?.profileLabel || ''">
        Não é só esconder um menu: as permissões do recurso somem de cada pessoa da equipe, você
        incluído. Religar devolve tudo — nada é apagado.
      </AlertBanner>

      <SectionTitle lead="Categoria de" title="Competição" />
      <PanelCard title="O que a equipe disputa" icon="flag" muted>
        <p class="vc-faint" style="margin-top: 0">
          A categoria decide a forma do módulo de performance: uma liga pontuada por rubricas e runs de
          missão pede pontos e tempo, uma pontuada por subsistemas pede qual subsistema foi testado.
          Trocar depois nunca apaga o que já foi medido.
        </p>
        <div class="vc-field">
          <label class="vc-label" for="category">Categoria</label>
          <select id="category" class="vc-select" v-model="form.competitionCategory">
            <option v-for="option in categories" :key="option.name" :value="option.name">
              {{ option.label }} — {{ option.performanceStyleLabel }}
            </option>
          </select>
          <span class="vc-faint">{{ selectedCategory?.description }}</span>
        </div>
        <div v-if="selectedCategory?.defaultAreas?.length" class="vc-row" style="flex-wrap: wrap">
          <span class="vc-faint">Áreas iniciais:</span>
          <span v-for="area in selectedCategory.defaultAreas" :key="area" class="vc-chip">{{ area }}</span>
        </div>

        <div class="vc-divider"></div>

        <div class="vc-grid">
          <div class="vc-field">
            <label class="vc-label" for="threshold">Alerta de frequência abaixo de (%)</label>
            <input id="threshold" class="vc-input" type="number" min="0" max="100"
                   v-model.number="form.attendanceThreshold" />
            <span class="vc-faint">Quem fica abaixo disso aparece no painel da equipe.</span>
          </div>
          <div class="vc-field">
            <label class="vc-label" for="reminder">Avisar de uma demanda com (dias) de antecedência</label>
            <input id="reminder" class="vc-input" type="number" min="0" max="60"
                   v-model.number="form.reminderDays" />
            <span class="vc-faint">O lembrete diário alcança as que vencem nesse prazo e as atrasadas.</span>
          </div>
        </div>
        <template #footer>
          <button class="vc-btn" type="button" :disabled="savingTenant" @click="saveTenant">
            {{ savingTenant ? 'Salvando...' : 'Salvar categoria e limites' }}
          </button>
        </template>
      </PanelCard>

      <SectionTitle lead="Perfis" title="Padrão">
        <template #actions>
          <span class="vc-chip">atual: {{ state?.profileLabel || '—' }}</span>
        </template>
      </SectionTitle>
      <div class="vc-grid">
        <PanelCard v-for="profile in applicableProfiles" :key="profile.name"
                   :title="profile.label"
                   :muted="profile.name !== state?.profile">
          <p>{{ profile.description }}</p>
          <p class="vc-faint">{{ profile.features.length }} de {{ features.length }} recursos ligados.</p>
          <template #footer>
            <button v-if="profile.name === state?.profile" class="vc-btn vc-btn--ghost" type="button" disabled>
              Em uso
            </button>
            <button v-else class="vc-btn vc-btn--outline" type="button" @click="applyProfile(profile)">
              Aplicar
            </button>
          </template>
        </PanelCard>
      </div>

      <SectionTitle lead="Cada" title="Recurso">
        <template #actions>
          <span v-if="dirty" class="vc-chip vc-chip--warning">alterações não salvas</span>
          <button v-if="dirty" class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="load">
            Descartar
          </button>
          <button class="vc-btn vc-btn--small" type="button" :disabled="!dirty || saving" @click="saveFeatures">
            {{ saving ? 'Salvando...' : 'Salvar interruptores' }}
          </button>
        </template>
      </SectionTitle>

      <PanelCard :title="`${onCount} de ${features.length} ligados`" icon="sliders" muted>
        <div v-for="feature in features" :key="feature.name" class="vc-switch">
          <div class="vc-switch__body">
            <strong>{{ feature.label }}</strong>
            <p>{{ feature.description }}</p>
            <p class="vc-switch__perms">
              Permissões: {{ feature.permissions.join(', ') }}
            </p>
          </div>
          <button
            type="button"
            :class="['vc-switch__toggle', enabled[feature.name] ? 'is-on' : '']"
            :aria-pressed="enabled[feature.name] ? 'true' : 'false'"
            @click="toggle(feature.name)"
          >
            <AppIcon :name="enabled[feature.name] ? 'toggleOn' : 'toggleOff'" :size="18" />
            {{ enabled[feature.name] ? 'Ligado' : 'Desligado' }}
          </button>
        </div>
      </PanelCard>

      <SectionTitle lead="Backup" title="da Equipe" />
      <PanelCard title="Levar os dados embora" icon="download" muted>
        <p>
          Baixa em JSON tudo o que as telas de operação da equipe guardam: demandas, riscos, avaliações,
          caderno do técnico, performance e os perfis de desenvolvimento. Um recurso desligado continua
          entrando no arquivo — a equipe não deixa de ser dona do que está escrito nele.
        </p>
        <template #footer>
          <button class="vc-btn vc-btn--outline" type="button" @click="downloadExport">
            Baixar backup em JSON
          </button>
        </template>
      </PanelCard>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import AlertBanner from '@/components/AlertBanner.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import PanelCard from '@/components/PanelCard.vue';
import AppIcon from '@/components/AppIcon.vue';
import { authStore } from '@/store/auth.js';
import { catalogs, features as featuresApi, teamDashboard, tenants } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';
import { toDateInputValue } from '@/services/time.js';

/*
 * Where a team decides which parts of the platform it uses.
 *
 * The switches are edited locally and sent in one request, so applying a profile and then
 * changing one thing on top of it is a single change the server sees whole — which is exactly
 * what the API takes (`profile` first, `enabled` over it).
 */
const auth = authStore();
const toast = useToast();

const features = ref([]);
const profiles = ref([]);
const categories = ref([]);
const state = ref(null);
const enabled = reactive({});
const saved = reactive({});
const saving = ref(false);
const savingTenant = ref(false);

const form = reactive({ competitionCategory: 'NONE', attendanceThreshold: 75, reminderDays: 2 });

const applicableProfiles = computed(() => profiles.value.filter((profile) => profile.applicable));
const selectedCategory = computed(
  () => categories.value.find((category) => category.name === form.competitionCategory) || null,
);
const onCount = computed(() => Object.values(enabled).filter(Boolean).length);
const dirty = computed(() => features.value.some((f) => enabled[f.name] !== saved[f.name]));

onMounted(load);
watch(() => auth.activeTenantId, load);

async function load() {
  if (!auth.activeTenantId) return;
  try {
    const [catalog, profileList, categoryList, current] = await Promise.all([
      catalogs.features(),
      catalogs.featureProfiles(),
      catalogs.competitionCategories(),
      featuresApi.state(auth.activeTenantId),
    ]);
    features.value = catalog.data;
    profiles.value = profileList.data;
    categories.value = categoryList.data;
    state.value = current.data;

    current.data.features.forEach((feature) => {
      enabled[feature.name] = feature.enabled;
      saved[feature.name] = feature.enabled;
    });
    form.competitionCategory = current.data.competitionCategory || 'NONE';
    form.attendanceThreshold = current.data.attendanceThreshold ?? 75;
    form.reminderDays = current.data.reminderDays ?? 2;
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar os recursos da equipe'));
  }
}

function toggle(name) {
  enabled[name] = !enabled[name];
}

/* Applies the preset straight away: it is a single, named decision, not a draft. */
async function applyProfile(profile) {
  if (!window.confirm(`Aplicar o perfil ${profile.label}? Isso reescreve todos os interruptores.`)) return;
  try {
    const { data } = await featuresApi.update(auth.activeTenantId, { profile: profile.name });
    absorb(data);
    await auth.loadMe();
    toast.success(`Perfil ${profile.label} aplicado.`);
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao aplicar o perfil'));
  }
}

async function saveFeatures() {
  saving.value = true;
  try {
    const body = { enabled: {} };
    features.value.forEach((feature) => {
      if (enabled[feature.name] !== saved[feature.name]) {
        body.enabled[feature.name] = enabled[feature.name];
      }
    });
    const { data } = await featuresApi.update(auth.activeTenantId, body);
    absorb(data);
    //The permissions of the session just changed, so the whole interface has to be told
    await auth.loadMe();
    toast.success('Recursos atualizados!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao salvar os recursos'));
  } finally {
    saving.value = false;
  }
}

function absorb(data) {
  state.value = data;
  data.features.forEach((feature) => {
    enabled[feature.name] = feature.enabled;
    saved[feature.name] = feature.enabled;
  });
}

async function saveTenant() {
  savingTenant.value = true;
  try {
    await tenants.update(auth.activeTenantId, {
      competitionCategory: form.competitionCategory,
      attendanceThreshold: form.attendanceThreshold,
      reminderDays: form.reminderDays,
    });
    await auth.loadMe();
    await load();
    toast.success('Categoria e limites salvos!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao salvar a categoria'));
  } finally {
    savingTenant.value = false;
  }
}

async function downloadExport() {
  try {
    const { data } = await teamDashboard.export(auth.activeTenantId);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vernum-${auth.activeTenant?.slug || 'equipe'}-${toDateInputValue(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Backup baixado.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao gerar o backup'));
  }
}
</script>
