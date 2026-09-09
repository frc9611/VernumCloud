import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
// eslint-disable-next-line
import {authStore} from '@/store/auth.js' //Maybe the IDE says there is an error, but it's ok

/*
 * Route meta used by the guard below:
 *   auth        the route needs a logged user
 *   tenant      the route only makes sense inside a team, so the user is sent to the
 *               chooser or to the waiting screen when there is no team open
 *   permission  permission needed in the team currently open
 *   feature     part of the platform the team has to have switched on. Mostly redundant with
 *               `permission` — a switched off feature has no permissions left — and it exists
 *               for the routes whose gate is not a permission, and so the redirect happens
 *               before the screen asks the server and gets a 403
 *   platform    permission needed on the "Administracao Vernum" team
 *   bare        no header (login and the public application form)
 *   footer      shows the footer links
 */
const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'login',
    component: () => import(/* webpackChunkName: "login" */ '../views/LoginView.vue'),
    meta: { bare: true, footer: true }
  },
  {
    path: '/equipes',
    name: 'chooseTenant',
    component: () => import(/* webpackChunkName: "tenants" */ '../views/ChooseTenantView.vue'),
    meta: { auth: true }
  },
  {
    path: '/aguardando',
    name: 'waiting',
    component: () => import(/* webpackChunkName: "waiting" */ '../views/WaitingRoomView.vue'),
    meta: { auth: true }
  },
  {
    path: '/home',
    name: 'home',
    component: () => import(/* webpackChunkName: "home" */ '../views/HomeView.vue'),
    meta: { auth: true, tenant: true }
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import(/* webpackChunkName: "profile" */ '../views/ProfileView.vue'),
    meta: { auth: true }
  },
  {
    path: '/trocar-senha',
    name: 'changePassword',
    component: () => import(/* webpackChunkName: "profile" */ '../views/ChangePasswordView.vue'),
    meta: { auth: true }
  },
  {
    path: '/about',
    name: 'about',
    component: () => import(/* webpackChunkName: "about" */ '../views/AboutView.vue')
  },
  {
    path: '/equipe',
    name: 'teamMembers',
    component: () => import(/* webpackChunkName: "team" */ '../views/TeamMembersView.vue'),
    meta: { auth: true, tenant: true, permission: 'MEMBER_VIEW' }
  },
  {
    /*
     * No permission on the route on purpose: everybody reads their own presence. How far the screen
     * reaches — the team, the divisions the person leads, or only themselves — is decided by the
     * server and answered by /attendance/scope.
     */
    path: '/presenca',
    name: 'attendance',
    component: () => import(/* webpackChunkName: "attendance" */ '../views/AttendanceView.vue'),
    meta: { auth: true, tenant: true }
  },

  {
    /*
     * The profile of a person, readable by anybody logged in: names across the dashboard link here.
     * No `tenant` meta — the page is about the person, in every team of theirs and after them.
     */
    path: '/pessoas/:id',
    name: 'person',
    component: () => import(/* webpackChunkName: "people" */ '../views/people/PersonProfileView.vue'),
    meta: { auth: true }
  },
  /* -------------------------------------------- board and season of the team */
  {
    path: '/demandas',
    name: 'tasks',
    component: () => import(/* webpackChunkName: "teamops" */ '../views/ops/TasksView.vue'),
    meta: { auth: true, tenant: true, permission: 'TASK_VIEW', feature: 'TASKS' }
  },
  {
    path: '/riscos',
    name: 'risks',
    component: () => import(/* webpackChunkName: "teamops" */ '../views/ops/RisksView.vue'),
    meta: { auth: true, tenant: true, permission: 'RISK_VIEW', feature: 'RISKS' }
  },
  {
    path: '/performance',
    name: 'performance',
    component: () => import(/* webpackChunkName: "teamops" */ '../views/performance/PerformanceView.vue'),
    meta: { auth: true, tenant: true, permission: 'PERFORMANCE_VIEW', feature: 'PERFORMANCE' }
  },
  {
    /*
     * No permission on the route, like /presenca: everybody reads their own development. How far the
     * screen reaches is decided by the server and answered by /development/scope.
     */
    path: '/desenvolvimento',
    name: 'development',
    component: () => import(/* webpackChunkName: "development" */ '../views/development/DevelopmentView.vue'),
    meta: { auth: true, tenant: true, feature: 'MEMBER_DEVELOPMENT' }
  },
  {
    /* Same reason: the person always reads the evaluations that were shared with them. */
    path: '/avaliacoes',
    name: 'evaluations',
    component: () => import(/* webpackChunkName: "development" */ '../views/development/EvaluationsView.vue'),
    meta: { auth: true, tenant: true, feature: 'EVALUATIONS' }
  },
  {
    path: '/caderno',
    name: 'journal',
    component: () => import(/* webpackChunkName: "development" */ '../views/development/JournalView.vue'),
    meta: { auth: true, tenant: true, feature: 'JOURNAL' }
  },

  {
    path: '/divisoes',
    name: 'divisions',
    component: () => import(/* webpackChunkName: "divisions" */ '../views/divisions/DivisionsView.vue'),
    meta: { auth: true, tenant: true, permission: 'DIVISION_VIEW' }
  },
  {
    path: '/divisoes/:id',
    name: 'divisionDetail',
    component: () => import(/* webpackChunkName: "divisions" */ '../views/divisions/DivisionDetailView.vue'),
    meta: { auth: true, tenant: true, permission: 'DIVISION_VIEW' }
  },

  {
    /* The trip as the person invited reads it. No permission: the invitation is the grant, and it
       can reach somebody who is not in the team that organises — or in any team at all. */
    path: '/viagens/:id',
    name: 'trip',
    component: () => import(/* webpackChunkName: "trips" */ '../views/trips/TripView.vue'),
    meta: { auth: true }
  },
  {
    path: '/viagens',
    name: 'trips',
    component: () => import(/* webpackChunkName: "trips" */ '../views/trips/TripsAdminView.vue'),
    meta: { auth: true, tenant: true, permission: 'TRIP_VIEW' }
  },

  /* ------------------------------------------------------------ admin panel */
  {
    path: '/admin',
    name: 'admin',
    component: () => import(/* webpackChunkName: "admin" */ '../views/admin/AdminView.vue'),
    meta: { auth: true }
  },
  {
    path: '/admin/tenants',
    name: 'adminTenants',
    component: () => import(/* webpackChunkName: "admin" */ '../views/admin/TenantsAdminView.vue'),
    meta: { auth: true, platform: 'TENANT_VIEW_ALL' }
  },
  {
    /* Every account of the platform, with the teams of each one. No `tenant`: it works with no team open. */
    path: '/admin/usuarios',
    name: 'adminUsers',
    component: () => import(/* webpackChunkName: "admin" */ '../views/admin/PlatformUsersView.vue'),
    meta: { auth: true, platform: 'TENANT_VIEW_ALL' }
  },
  {
    /* Rooms cross teams that may have different owners, so managing the list is platform business. */
    path: '/admin/salas',
    name: 'adminRooms',
    component: () => import(/* webpackChunkName: "admin" */ '../views/admin/RoomsAdminView.vue'),
    meta: { auth: true, platform: 'TENANT_UPDATE' }
  },
  {
    path: '/admin/membros',
    name: 'adminMembers',
    component: () => import(/* webpackChunkName: "admin" */ '../views/admin/MembersAdminView.vue'),
    meta: { auth: true, tenant: true, permission: 'MEMBER_VIEW' }
  },
  {
    path: '/admin/divisoes',
    name: 'adminDivisions',
    component: () => import(/* webpackChunkName: "admin" */ '../views/admin/DivisionsAdminView.vue'),
    meta: { auth: true, tenant: true, permission: 'DIVISION_VIEW' }
  },
  {
    path: '/admin/usuarios/novo',
    name: 'createUser',
    component: () => import(/* webpackChunkName: "admin" */ '../views/admin/CreateUserView.vue'),
    meta: { auth: true, tenant: true, permission: 'MEMBER_INVITE' }
  },
  {
    path: '/admin/recursos',
    name: 'adminFeatures',
    component: () => import(/* webpackChunkName: "admin" */ '../views/admin/FeaturesAdminView.vue'),
    meta: { auth: true, tenant: true, permission: 'TENANT_MANAGE' }
  },
  {
    path: '/admin/apps',
    name: 'adminApps',
    component: () => import(/* webpackChunkName: "admin" */ '../views/admin/AppsAdminView.vue'),
    meta: { auth: true, tenant: true, permission: 'APP_MANAGE' }
  },
  {
    path: '/admin/chaves',
    name: 'adminApiKeys',
    component: () => import(/* webpackChunkName: "admin" */ '../views/admin/ApiKeysAdminView.vue'),
    meta: { auth: true, tenant: true, permission: 'API_KEY_MANAGE' }
  },
  {
    /*
     * The cards live under the Presença feature, not under a switch of their own: a reader
     * is the same presence answered by a card instead of by somebody typing a password.
     */
    path: '/admin/cartoes',
    name: 'adminRfid',
    component: () => import(/* webpackChunkName: "admin" */ '../views/admin/RfidAdminView.vue'),
    meta: { auth: true, tenant: true, permission: 'RFID_MANAGE', feature: 'ATTENDANCE' }
  },
  {
    path: '/admin/eventos',
    name: 'adminEvents',
    component: () => import(/* webpackChunkName: "people" */ '../views/admin/EventsAdminView.vue'),
    meta: { auth: true, tenant: true, permission: 'EVENT_VIEW', feature: 'EVENTS' }
  },
  {
    path: '/admin/processos',
    name: 'adminRecruitment',
    component: () => import(/* webpackChunkName: "recruitment" */ '../views/recruitment/ProcessesAdminView.vue'),
    meta: { auth: true, tenant: true, permission: 'RECRUITMENT_VIEW' }
  },
  {
    path: '/admin/processos/:id',
    name: 'recruitmentPanel',
    component: () => import(/* webpackChunkName: "recruitment" */ '../views/recruitment/ProcessPanelView.vue'),
    meta: { auth: true, tenant: true, permission: 'RECRUITMENT_VIEW' }
  },
  {
    /* The editor of the team's public page: model, presentation, contact, images and posts. */
    path: '/admin/pagina',
    name: 'adminPage',
    component: () => import(/* webpackChunkName: "page" */ '../views/page/PageAdminView.vue'),
    meta: { auth: true, tenant: true, permission: 'PAGE_MANAGE', feature: 'LANDING_PAGE' }
  },

  /* ------------------------------------------------------------------ cloud */
  {
    path: '/cloud',
    name: 'cloud',
    component: () => import(/* webpackChunkName: "cloud" */ '../views/cloud/CloudView.vue'),
    meta: { auth: true, tenant: true }
  },
  {
    path: '/cloud/:id',
    name: 'cloudFolder',
    component: () => import(/* webpackChunkName: "cloud" */ '../views/cloud/CloudView.vue'),
    meta: { auth: true }
  },
  {
    path: '/compartilhados',
    name: 'sharedWithMe',
    component: () => import(/* webpackChunkName: "cloud" */ '../views/cloud/SharedWithMeView.vue'),
    meta: { auth: true }
  },
  {
    path: '/pedidos-de-acesso',
    name: 'accessRequests',
    component: () => import(/* webpackChunkName: "cloud" */ '../views/cloud/AccessRequestsView.vue'),
    meta: { auth: true }
  },

  /* --------------------------------------------------------------- sso / apps */
  {
    path: '/entrar-com-vernum',
    name: 'ssoConsent',
    component: () => import(/* webpackChunkName: "sso" */ '../views/SsoConsentView.vue'),
    meta: { bare: true, footer: true }
  },

  /* ------------------------------------------------------- public / candidate */
  {
    /*
     * Not `bare` any more: the header shows only for a logged user (App.vue), so a member reaches the
     * open processes from inside the dashboard, while a visitor still gets the plain public page.
     */
    path: '/processos-seletivos',
    name: 'openProcesses',
    component: () => import(/* webpackChunkName: "public" */ '../views/public/OpenProcessesView.vue'),
    meta: { footer: true }
  },
  {
    path: '/candidatar/:token',
    name: 'apply',
    component: () => import(/* webpackChunkName: "public" */ '../views/public/ApplyView.vue'),
    meta: { bare: true, footer: true }
  },
  {
    path: '/minhas-candidaturas',
    name: 'myApplications',
    component: () => import(/* webpackChunkName: "public" */ '../views/public/MyApplicationsView.vue'),
    meta: { auth: true }
  },
  {
    /*
     * The public page of a team, for whoever has the link — a sponsor, a school, the parents. No
     * login and no header, in the colour of the team; the server answers one 404 for everything it
     * will not show a visitor, so the screen has a single "Equipe não encontrada".
     */
    path: '/pagina/:slug',
    name: 'teamPage',
    component: () => import(/* webpackChunkName: "page" */ '../views/page/PublicTeamPageView.vue'),
    meta: { bare: true, footer: true }
  },

  { path: '/:pathMatch(.*)*', redirect: '/home' },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

router.beforeEach(async (to, from, next) => {
  const auth = authStore();

  if (!to.meta?.auth && !to.meta?.tenant && !to.meta?.permission
      && !to.meta?.platform && !to.meta?.feature) {
    return next();
  }

  if (!auth.isAuth) {
    return next({ name: 'login' });
  }

  //On a reload the guard can run before /me answered
  if (!auth.ready) {
    await auth.loadMe();
    if (!auth.isAuth) {
      return next({ name: 'login' });
    }
  }

  /*
   * An account that came out of a selection process still carries the one-time password that was
   * printed on paper. Nothing else in the dashboard opens until the person picks their own.
   */
  if (auth.user?.mustChangePassword && to.name !== 'changePassword') {
    return next({ name: 'changePassword' });
  }

  //A user with no team waits on the public processes screen
  /*
   * 'trip' is on the list because somebody can be invited to a trip without being in any team of the
   * platform — a guest from a partner school. Sending them to the waiting screen would make the
   * invitation they were notified about unreachable.
   */
  if (auth.hasNoTenant && to.name !== 'waiting' && to.name !== 'profile'
      && to.name !== 'myApplications' && to.name !== 'trip') {
    return next({ name: 'waiting' });
  }

  if (to.meta?.tenant && !auth.activeTenantId) {
    return next({ name: auth.memberships.length ? 'chooseTenant' : 'waiting' });
  }

  if (to.meta?.permission && !auth.can(to.meta.permission as string)) {
    return next({ name: 'home' });
  }

  /*
   * A part of the platform the team switched off. Checked here as well as by the permission above
   * because a couple of screens have no permission of their own — everybody reads their own
   * development, like everybody reads their own presence.
   */
  if (to.meta?.feature && !auth.featureOn(to.meta.feature as string)) {
    return next({ name: 'home' });
  }

  if (to.meta?.platform && !auth.canPlatform(to.meta.platform as string)) {
    return next({ name: 'home' });
  }

  return next();
});


export default router
