<template>
  <main class="vc-page">
    <div class="vc-stack">
      <h1 class="vc-title vc-title--underlined">Desenvolvimento das pessoas</h1>

      <AlertBanner :variant="scope?.reach === 'TENANT' ? 'info' : 'warning'"
                   :title="'Você está vendo ' + (scope?.reachLabel || '...') + '.'"
                   :aside="auth.activeTenantName">
        <template v-if="scope?.reach === 'SELF'">
          Ler como alguém está se desenvolvendo é ler sobre essa pessoa. Todo mundo lê a si mesmo; a
          equipe inteira precisa de permissão.
        </template>
        <template v-else-if="scope?.reach === 'DIVISIONS'">
          Liderar uma divisão alcança ela e as subdivisões dela: {{ (scope.divisions || []).join(', ') }}.
        </template>
        <template v-else>
          Autonomia de 1 a 4, competências de 0 a 4 e a frequência de cada pessoa. Quem conduz a equipe
          — técnicos e administradores — fica fora da análise de frequência.
        </template>
      </AlertBanner>

      <div class="vc-metrics">
        <div class="vc-metric">
          <div class="vc-metric__head"><span>Pessoas alcançadas</span><AppIcon name="users" :size="16" /></div>
          <div class="vc-metric__value">{{ profiles.length }}</div>
          <div class="vc-metric__foot">no seu alcance de leitura</div>
        </div>
        <div class="vc-metric">
          <div class="vc-metric__head"><span>Frequência em atenção</span><AppIcon name="alert" :size="16" /></div>
          <div :class="['vc-metric__value', belowThreshold.length ? 'vc-metric__value--danger' : '']">
            {{ belowThreshold.length }}
          </div>
          <div class="vc-metric__foot">abaixo de {{ threshold }}%</div>
        </div>
        <div class="vc-metric">
          <div class="vc-metric__head"><span>Dado a validar</span><AppIcon name="seedling" :size="16" /></div>
          <div class="vc-metric__value">{{ baseline.length }}</div>
          <div class="vc-metric__foot">ninguém confirmou ainda</div>
        </div>
        <div class="vc-metric">
          <div class="vc-metric__head"><span>Autonomia média</span><AppIcon name="gauge" :size="16" /></div>
          <div class="vc-metric__value">{{ averageAutonomy }}</div>
          <div class="vc-metric__foot">escala de 1 a 4</div>
        </div>
      </div>

      <SectionTitle lead="Mapa de" title="Pessoas" />
      <div class="vc-grid">
        <PanelCard v-for="profile in profiles" :key="profile.user.userId"
                   :title="profile.user.name" muted>
          <template #header-actions>
            <span style="margin-left: auto; display: inline-flex; gap: 6px; align-items: center">
              <PersonLink :user-id="profile.user.userId" muted>perfil</PersonLink>
              <span v-if="profile.baseline" class="vc-badge vc-badge--neutral">a validar</span>
              <!-- The card stays — a técnico develops too — but its empty bar must not read as an alert -->
              <span v-if="profile.staff" class="vc-badge vc-badge--neutral">conduz a equipe</span>
            </span>
          </template>
          <p class="vc-faint" style="margin-top: 0">{{ profile.roleLabel || 'Função a definir' }}</p>

          <div class="vc-scored">
            <span>Autonomia</span>
            <div class="vc-bar"><span :style="{ width: (profile.autonomy || 0) / profile.maxSkill * 100 + '%' }"></span></div>
            <strong>{{ profile.autonomy ?? '—' }}/{{ profile.maxSkill }}</strong>
          </div>
          <div class="vc-scored">
            <span>Competências</span>
            <div class="vc-bar"><span :style="{ width: profile.skillAverage + '%' }"></span></div>
            <strong>{{ profile.skillAverage }}%</strong>
          </div>
          <div class="vc-scored">
            <span>Frequência</span>
            <div :class="['vc-bar', frequencyBarClass(profile)]">
              <span :style="{ width: (profile.effectiveAttendanceRate || 0) + '%' }"></span>
            </div>
            <strong>{{ profile.effectiveAttendanceRate ?? '—' }}%</strong>
          </div>

          <p class="vc-faint" style="font-size: 0.76rem">
            <template v-if="profile.staff">
              fora da análise de frequência: quem conduz a equipe não entra no alerta nem no ranking
              <template v-if="profile.registeredAttendanceRate !== null">
                · registrada {{ profile.registeredAttendanceRate }}% (últimos {{ profile.daysMeasured }} dias)
              </template>
            </template>
            <template v-else-if="profile.attendanceRate !== null && profile.registeredAttendanceRate !== null">
              lançada {{ profile.attendanceRate }}% · registrada {{ profile.registeredAttendanceRate }}%
              (últimos {{ profile.daysMeasured }} dias)
            </template>
            <template v-else-if="profile.registeredAttendanceRate !== null">
              vinda do registro de presença dos últimos {{ profile.daysMeasured }} dias
            </template>
            <template v-else-if="profile.attendanceRate !== null">
              lançada à mão
            </template>
            <template v-else>sem presença registrada e nada lançado</template>
          </p>

          <div v-if="Object.keys(profile.skills || {}).length" class="vc-row" style="flex-wrap: wrap">
            <span v-for="(score, name) in profile.skills" :key="name" class="vc-chip">
              {{ name }} {{ score ?? '—' }}/{{ profile.maxSkill }}
            </span>
          </div>

          <template #footer>
            <span class="vc-faint" style="font-size: 0.76rem">
              {{ profile.evaluationCount }} avaliação(ões)
            </span>
            <span class="vc-spacer"></span>
            <button v-if="scope?.canManageProfiles" class="vc-btn vc-btn--ghost vc-btn--small"
                    type="button" @click="openEdit(profile)">
              Editar
            </button>
            <button v-if="scope?.canEvaluate" class="vc-btn vc-btn--outline vc-btn--small"
                    type="button" @click="openEvaluate(profile)">
              Avaliar
            </button>
          </template>
        </PanelCard>
      </div>

      <EmptyState v-if="!profiles.length" title="Nada para mostrar">
        Ninguém no seu alcance de leitura tem um perfil ainda.
      </EmptyState>
    </div>

    <!-- --------------------------------------------------------- edit profile -->
    <ModalDialog v-if="editing" :title="'Desenvolvimento de ' + form.name" wide @close="editing = false">
      <div class="vc-field">
        <label class="vc-label" for="role">Função na equipe</label>
        <input id="role" class="vc-input" type="text" v-model="form.roleLabel"
               placeholder="Programação · Estratégia" />
      </div>
      <div class="vc-grid">
        <div class="vc-field">
          <label class="vc-label" for="autonomy">Autonomia (1 a 4)</label>
          <input id="autonomy" class="vc-input" type="number" min="1" max="4" v-model.number="form.autonomy" />
        </div>
        <div class="vc-field">
          <label class="vc-label" for="attendance">Frequência lançada (%)</label>
          <input id="attendance" class="vc-input" type="number" min="0" max="100"
                 v-model="form.attendanceRate" placeholder="em branco: a validar" />
          <span class="vc-faint">
            O registro de presença diz {{ form.registered ?? '—' }}%. Em branco, o alerta usa esse.
          </span>
        </div>
      </div>

      <SectionTitle lead="Competências" title="de 0 a 4" />
      <div v-for="(entry, index) in form.skills" :key="index" class="vc-input-group">
        <input class="vc-input" type="text" v-model="entry.name" placeholder="Competência" />
        <input class="vc-input" type="number" min="0" max="4" style="max-width: 90px" v-model.number="entry.score" />
        <button class="vc-btn vc-btn--icon" type="button" title="Remover" @click="form.skills.splice(index, 1)">
          <AppIcon name="trash" :size="16" />
        </button>
      </div>
      <button class="vc-btn vc-btn--ghost vc-btn--small" type="button"
              @click="form.skills.push({ name: '', score: 2 })">
        Adicionar competência
      </button>

      <div class="vc-field">
        <label class="vc-label" for="notes">Observações</label>
        <textarea id="notes" class="vc-textarea" v-model="form.notes"></textarea>
      </div>
      <label class="vc-checkbox">
        <input type="checkbox" v-model="form.baseline" />
        Marcar como dado a validar
        <span class="vc-faint">Deixe desmarcado quando os números foram conferidos.</span>
      </label>

      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="editing = false">Cancelar</button>
        <button class="vc-btn" type="button" @click="saveProfile">Salvar</button>
      </template>
    </ModalDialog>

    <!-- ------------------------------------------------------------- evaluate -->
    <ModalDialog v-if="evaluating" :title="'Avaliar ' + evalForm.name" @close="evaluating = false">
      <div class="vc-grid">
        <div class="vc-field">
          <label class="vc-label" for="edate">Data</label>
          <input id="edate" class="vc-input" type="date" v-model="evalForm.evaluationDate" />
        </div>
        <div class="vc-field">
          <label class="vc-label" for="eaut">Autonomia observada (1 a 4)</label>
          <input id="eaut" class="vc-input" type="number" min="1" max="4" v-model.number="evalForm.autonomy" />
        </div>
      </div>
      <div class="vc-field">
        <label class="vc-label" for="eskill">Próxima competência a desenvolver</label>
        <input id="eskill" class="vc-input" type="text" v-model="evalForm.skillFocus"
               placeholder="comunicação técnica" />
      </div>
      <div class="vc-field">
        <label class="vc-label" for="enotes">Evidências e próxima ação</label>
        <textarea id="enotes" class="vc-textarea" v-model="evalForm.notes"></textarea>
      </div>
      <label class="vc-checkbox">
        <input type="checkbox" v-model="evalForm.sharedWithMember" />
        A pessoa pode ler esta avaliação
        <span class="vc-faint">Desmarcar mantém a anotação interna, sem notificar.</span>
      </label>
      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="evaluating = false">Cancelar</button>
        <button class="vc-btn" type="button" @click="saveEvaluation">Registrar avaliação</button>
      </template>
    </ModalDialog>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import AlertBanner from '@/components/AlertBanner.vue';
import PersonLink from '@/components/PersonLink.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import PanelCard from '@/components/PanelCard.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import EmptyState from '@/components/EmptyState.vue';
import AppIcon from '@/components/AppIcon.vue';
import { authStore } from '@/store/auth.js';
import { development } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';
import { toDateInputValue } from '@/services/time.js';

/*
 * Autonomy, competences and frequency, one card per person.
 *
 * The screen never assumes what it may show: `scope` comes from the server and says whether the
 * reader reaches the team, the divisions they lead, or only themselves — same contract as /presenca.
 * Frequency is shown twice on purpose: what somebody typed and what the presence register actually
 * recorded, so a disagreement between them is visible instead of guessed at.
 */
const auth = authStore();
const toast = useToast();

const profiles = ref([]);
const scope = ref(null);
const editing = ref(false);
const evaluating = ref(false);
const form = reactive({ userId: '', name: '', roleLabel: '', autonomy: null, attendanceRate: '',
  registered: null, skills: [], notes: '', baseline: false });
const evalForm = reactive({ userId: '', name: '', evaluationDate: today(), autonomy: null,
  skillFocus: '', notes: '', sharedWithMember: true });

const threshold = computed(() => profiles.value[0]?.attendanceThreshold ?? 75);
const belowThreshold = computed(() => profiles.value.filter((profile) => profile.belowThreshold));
const baseline = computed(() => profiles.value.filter((profile) => profile.baseline));
const averageAutonomy = computed(() => {
  const values = profiles.value.map((profile) => profile.autonomy).filter((value) => value != null);
  if (!values.length) return '—';
  return (values.reduce((total, value) => total + value, 0) / values.length).toFixed(1);
});

onMounted(load);
watch(() => auth.activeTenantId, load);

/* The day of whoever is filling the form. toISOString() would answer UTC, which after nine at
   night in Brasília is already tomorrow, and the field would open on the wrong day. */
function today() {
  return toDateInputValue(new Date());
}

/* A staff bar is neither good nor bad, so it keeps the team colour instead of turning red or green. */
function frequencyBarClass(profile) {
  if (profile.staff) return '';
  return profile.belowThreshold ? 'vc-bar--danger' : 'vc-bar--success';
}

async function load() {
  if (!auth.activeTenantId) return;
  try {
    const [scopeAnswer, list] = await Promise.all([
      development.scope(auth.activeTenantId),
      development.profiles(auth.activeTenantId),
    ]);
    scope.value = scopeAnswer.data;
    profiles.value = list.data;
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar o desenvolvimento'));
  }
}

function openEdit(profile) {
  Object.assign(form, {
    userId: profile.user.userId,
    name: profile.user.name,
    roleLabel: profile.roleLabel || '',
    autonomy: profile.autonomy,
    attendanceRate: profile.attendanceRate ?? '',
    registered: profile.registeredAttendanceRate,
    skills: Object.entries(profile.skills || {}).map(([name, score]) => ({ name, score })),
    notes: profile.notes || '',
    baseline: profile.baseline,
  });
  editing.value = true;
}

async function saveProfile() {
  const skills = {};
  form.skills.forEach((entry) => {
    if (entry.name && entry.name.trim()) skills[entry.name.trim()] = entry.score;
  });
  const blank = form.attendanceRate === '' || form.attendanceRate === null;
  try {
    await development.updateProfile(auth.activeTenantId, form.userId, {
      roleLabel: form.roleLabel || null,
      autonomy: form.autonomy || null,
      /* Two fields because null cannot mean both "não mexa" and "volte a ser a validar". */
      attendanceRate: blank ? null : Number(form.attendanceRate),
      clearAttendanceRate: blank,
      skills,
      notes: form.notes || null,
      baseline: form.baseline,
    });
    editing.value = false;
    await load();
    toast.success('Perfil atualizado!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao salvar o perfil'));
  }
}

function openEvaluate(profile) {
  Object.assign(evalForm, {
    userId: profile.user.userId,
    name: profile.user.name,
    evaluationDate: today(),
    autonomy: profile.autonomy,
    skillFocus: '',
    notes: '',
    sharedWithMember: true,
  });
  evaluating.value = true;
}

async function saveEvaluation() {
  try {
    await development.evaluate(auth.activeTenantId, {
      userId: evalForm.userId,
      evaluationDate: evalForm.evaluationDate,
      autonomy: evalForm.autonomy || null,
      skillFocus: evalForm.skillFocus || null,
      notes: evalForm.notes || null,
      sharedWithMember: evalForm.sharedWithMember,
    });
    evaluating.value = false;
    await load();
    toast.success('Avaliação registrada!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao registrar a avaliação'));
  }
}
</script>
