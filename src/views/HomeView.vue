<template>
  <main class="vc-page">
    <TabBar :model-value="tab" :tabs="tabs" @update:model-value="openTab">
      <template #context>
        <span class="vc-chip">{{ today }}</span>
        <span class="vc-chip">{{ auth.activeRoleLabel }}</span>
        <span class="vc-chip">{{ auth.getName }}</span>
        <span
          v-for="division in auth.activeDivisions.slice(0, 2)"
          :key="division.divisionMembershipId"
          class="vc-chip vc-chip--purple"
        >
          {{ division.divisionVisibleName }}
        </span>
      </template>
    </TabBar>

    <!-- ------------------------------------------------------------- home -->
    <div v-if="tab === 'home'" class="vc-stack">
      <AlertBanner variant="success" icon="home" title="Bem-vindo(a)!" :aside="auth.activeTenantName">
        {{ auth.getName }}
      </AlertBanner>

      <!--
        Fora do arranjo movível de propósito: é um cartão que existe por algumas semanas e depois some
        sozinho, e uma seção que aparece e desaparece na ordem que a pessoa montou desarruma o arranjo
        dela sem ela ter pedido.
      -->
      <OnboardingCard v-if="!organizing" />

      <LayoutOrganizer
        :organizing="organizing"
        :customized="layout.customized.value"
        @start="layout.startOrganizing"
        @finish="layout.finishOrganizing"
        @restore="layout.restoreDefaults"
      />

      <!-- Every movable section, in the person's order. Hidden ones only exist while organising. -->
      <template v-for="(key, index) in movableSections" :key="key">
        <HomeSection
          v-if="organizing || !sectionHidden(key)"
          :section-key="key"
          :title="sectionTitle(key)"
          :organizing="organizing"
          :interactive="key === 'shortcuts'"
          :hidden="sectionHidden(key)"
          :first="index === 0"
          :last="index === movableSections.length - 1"
          :dragging="draggingSection === key"
          :drop-target="dropSection === key"
          @move="layout.moveSection"
          @toggle="layout.toggleSection"
          @drag-start="draggingSection = $event"
          @drag-over="dropSection = $event"
          @drag-leave="leaveSection"
          @drag-end="endSectionDrag"
          @drop="dropSectionOn"
        >
          <ShortcutGrid
            v-if="key === 'shortcuts'"
            :items="orderedShortcuts"
            :hidden="layout.hiddenShortcuts.value"
            :organizing="organizing"
            @move="layout.moveShortcut"
            @move-to="layout.moveShortcutTo"
            @toggle="layout.toggleShortcut"
          />
          <MyTasksPanel
            v-else-if="key === 'myTasks'"
            :tasks="myTasks"
            :multi-team="auth.memberships.length > 1"
            :can-open-board="auth.featureOn('TASKS') && auth.can('TASK_VIEW')"
          />
          <OpenProcessesPanel v-else-if="key === 'processes'" :processes="openProcesses" />
          <TripCarousel v-else-if="key === 'trips'" />
          <AnnouncementBoard v-else-if="key === 'board'" />
          <PendingAccessRequests v-else-if="key === 'accessRequests'" :requests="pendingAccessRequests" />
        </HomeSection>
      </template>
    </div>

    <!-- --------------------------------------------------------- command -->
    <CommandCenter v-else-if="tab === 'command'" :dashboard="dashboard" />

    <!-- ------------------------------------------------------------- apps -->
    <AppsPanel v-else-if="tab === 'apps'" :apps="apps" />

    <!-- ------------------------------------------------------ competition -->
    <CompetitionTab v-else-if="tab === 'competition'" :competition="competition"
                    :team-number="auth.activeTenant?.teamNumber" />
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import TabBar from '@/components/TabBar.vue';
import AlertBanner from '@/components/AlertBanner.vue';
import AnnouncementBoard from '@/components/AnnouncementBoard.vue';
import TripCarousel from '@/components/TripCarousel.vue';
import HomeSection from '@/components/home/HomeSection.vue';
import OnboardingCard from '@/components/home/OnboardingCard.vue';
import LayoutOrganizer from '@/components/home/LayoutOrganizer.vue';
import ShortcutGrid from '@/components/home/ShortcutGrid.vue';
import MyTasksPanel from '@/components/home/MyTasksPanel.vue';
import OpenProcessesPanel from '@/components/home/OpenProcessesPanel.vue';
import PendingAccessRequests from '@/components/home/PendingAccessRequests.vue';
import CommandCenter from '@/components/home/CommandCenter.vue';
import AppsPanel from '@/components/home/AppsPanel.vue';
import CompetitionTab from '@/components/home/CompetitionTab.vue';
import { authStore } from '@/store/auth.js';
import { preferencesStore } from '@/store/preferences.js';
import {
  apps as appsApi,
  cloud,
  competition as competitionApi,
  publicRecruitment,
  tasks as tasksApi,
  teamDashboard,
} from '@/services/api.js';
import { SECTIONS, useDashboardLayout } from '@/components/home/dashboardLayout.js';
import { SHORTCUT_DEFAULTS, availableShortcuts } from '@/components/home/shortcuts.js';

/*
 * The first screen after login.
 *
 * Up to four tabs: Home, with the sections the person arranged; Central de Comando, for whoever
 * conducts the team; Apps; and Competição, which exists only while the team is actually competing.
 * What each tab shows lives in components/home/ — this view only loads the data, decides which tabs
 * and sections exist for this person today, and hands the arrangement over to the layout composable,
 * which is where the preference is read and saved.
 */
const auth = authStore();
const prefs = preferencesStore();
const route = useRoute();

const pendingAccessRequests = ref([]);
const apps = ref([]);
const dashboard = ref(null);
const myTasks = ref([]);
const openProcesses = ref([]);
const competition = ref({ events: [], nextMatch: null, nextMatchEventName: null });

/** Whether the organiser is open. Owned here because which sections exist depends on it. */
const organizing = ref(false);
const draggingSection = ref(null);
const dropSection = ref(null);

/* ------------------------------------------------------------------ tabs */

const CONDUCTING_ROLES = ['OWNER', 'ADMIN', 'COACH'];

/** Depois disto o nome do evento empurra as outras abas para fora da tela num celular. */
const TAB_NAME_MAX = 22;

/**
 * Whether this person conducts the team: by role, or by holding any of the mentor permissions.
 *
 * TASK_MANAGE saiu da lista: o quadro é da equipe inteira agora, então todo estudante a tem e ela não
 * separa mais quem conduz de quem é conduzido.
 */
const conducts = computed(() =>
  CONDUCTING_ROLES.includes(auth.activeMembership?.role)
  || auth.canAny('RISK_MANAGE', 'DEVELOPMENT_MANAGE', 'EVALUATION_MANAGE',
    'JOURNAL_VIEW', 'PERFORMANCE_MANAGE', 'TENANT_MANAGE'),
);

const tabs = computed(() => {
  const items = [{ key: 'home', label: 'Home' }];
  if (conducts.value) items.push({ key: 'command', label: 'Central de Comando' });
  if (auth.featureOn('APPS')) items.push({ key: 'apps', label: 'Apps' });
  /*
   * A aba da competição só existe enquanto há competição em cartaz, e por isso ela não tem estado
   * vazio no menu: fora da temporada ela simplesmente não está lá. Com um evento ela leva o nome
   * dele, que é como a equipe fala ("abre o Sudeste"); com dois ou mais vira o nome genérico,
   * porque nenhum dos dois nomes seria mais verdadeiro que o outro.
   */
  if (competition.value.events.length === 1) {
    items.push({ key: 'competition', label: shortEventName(competition.value.events[0].eventName) });
  } else if (competition.value.events.length > 1) {
    items.push({ key: 'competition', label: 'Competição' });
  }
  return items;
});

const today = computed(() => new Date().toLocaleDateString('pt-BR'));

/* ---------------------------------------------------------------- layout */

/** The shortcuts this person may open today, in default order; the layout puts them in theirs. */
const shortcutsToday = computed(() => availableShortcuts(auth));

/**
 * Which sections exist today. Welcome is drawn outside the list and never moves; the processes panel
 * only exists when there is something to apply to, except while organising, so it can still be placed.
 */
const availableSections = computed(() => {
  const keys = ['shortcuts', 'trips', 'board'];
  if (auth.memberships.some((membership) => (membership.permissions || []).includes('TASK_VIEW'))) keys.push('myTasks');
  if (openProcesses.value.length || organizing.value) keys.push('processes');
  if (pendingAccessRequests.value.length) keys.push('accessRequests');
  return keys;
});

const layout = useDashboardLayout({
  auth,
  prefs,
  organizing,
  availableSections,
  availableShortcuts: computed(() => shortcutsToday.value.map((shortcut) => shortcut.key)),
  shortcutDefaults: SHORTCUT_DEFAULTS,
});

const movableSections = computed(() => layout.sectionOrder.value.filter((key) => key !== 'welcome'));

const orderedShortcuts = computed(() =>
  layout.shortcutOrder.value
    .map((key) => shortcutsToday.value.find((shortcut) => shortcut.key === key))
    .filter(Boolean),
);

/** The remembered tab, as long as it still exists for this person in this team. */
const tab = computed(() => {
  const wanted = layout.savedTab.value;
  return tabs.value.some((item) => item.key === wanted) ? wanted : 'home';
});

function openTab(key) {
  layout.setTab(key);
}

/*
 * O aviso que a busca global apontou mora numa seção da aba Home, e quem a abre pode estar com outra
 * aba lembrada ou com o mural escondido no arranjo dela — aí o link não faria nada, nem diria por quê.
 * Trazer a aba e revelar a seção é o que deixa o mural ler o `?aviso` e destacar o que a busca achou.
 * A revelação dura a visita: o arranjo salvo não muda.
 */
const revealedSection = ref(null);
watch(() => route.query.aviso, (announcementId) => {
  if (!announcementId) return;
  revealedSection.value = 'board';
  layout.setTab('home');
}, { immediate: true });

/**
 * Whether a section is out of sight: what the person arranged, except for the one a deep link revealed
 * for this visit. The organiser always shows the arrangement as it is saved, so the eye never lies.
 */
function sectionHidden(key) {
  if (!organizing.value && key === revealedSection.value) return false;
  return layout.hiddenSections.value.includes(key);
}

function sectionTitle(key) {
  return SECTIONS.find((section) => section.key === key)?.title || key;
}

function leaveSection(key) {
  if (dropSection.value === key) dropSection.value = null;
}

function endSectionDrag() {
  draggingSection.value = null;
  dropSection.value = null;
}

function dropSectionOn(targetKey) {
  const key = draggingSection.value;
  endSectionDrag();
  if (key && key !== targetKey) layout.moveSectionTo(key, targetKey);
}

/* ------------------------------------------------------------------ data */

onMounted(load);
watch(() => auth.activeTenantId, load);

async function load() {
  if (!auth.activeTenantId) return;
  /*
   * One call for the whole command center, already cut to what this person may read: a section they
   * cannot see comes back empty instead of as a 403 that would replace the first screen after login.
   * Every other call fails to empty for the same reason.
   */
  try {
    const { data } = await teamDashboard.get(auth.activeTenantId);
    dashboard.value = data;
  } catch (error) {
    dashboard.value = null;
  }
  try {
    const { data } = await cloud.accessRequests();
    pendingAccessRequests.value = data;
  } catch (error) {
    pendingAccessRequests.value = [];
  }
  try {
    const { data } = await appsApi.list(auth.activeTenantId);
    apps.value = data;
  } catch (error) {
    apps.value = [];
  }
  /*
   * The person's open demandas across every team; only the ones assigned to them belong on the home.
   * Both cuts are the query's now — the route answers a page, and picking the assigned ones out of a
   * page would show the page minus whatever was somebody else's.
   *
   * The page is bigger than the eight rows the panel draws on purpose: the panel counts what it is
   * given ("N aberta(s)", "e mais N"), so a page of eight would make it say eight to somebody who owes
   * thirty and never offer the board. This is the route's own default size.
   */
  try {
    const { data } = await tasksApi.mine({ open: true, assignedToMe: true, size: 50 });
    myTasks.value = data.items || [];
  } catch (error) {
    myTasks.value = [];
  }
  try {
    const { data } = await publicRecruitment.open();
    openProcesses.value = data || [];
  } catch (error) {
    openProcesses.value = [];
  }
  /* Sem o recurso ou sem permissão a rota responde 403, e aí a aba simplesmente não nasce. */
  try {
    const { data } = await competitionApi.showing(auth.activeTenantId);
    competition.value = data;
  } catch (error) {
    competition.value = { events: [], nextMatch: null, nextMatchEventName: null };
  }
}

/** O nome do evento cabe numa aba; o resto vira reticências em vez de empurrar as outras abas. */
function shortEventName(name) {
  if (!name) return 'Competição';
  return name.length <= TAB_NAME_MAX ? name : `${name.slice(0, TAB_NAME_MAX - 1).trimEnd()}…`;
}
</script>
