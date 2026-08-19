import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
// eslint-disable-next-line
import {authStore} from '@/store/auth.js' //Maybe the IDE says there is an error, but it's ok

/*
 * Route meta used by the guard below:
 *   auth        the route needs a logged user
 *   tenant      the route only makes sense inside a team, so the user is sent to the
 *               chooser or to the waiting screen when there is no team open
 *   permission  permission needed in the team currently open
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
    path: '/processos-seletivos',
    name: 'openProcesses',
    component: () => import(/* webpackChunkName: "public" */ '../views/public/OpenProcessesView.vue'),
    meta: { bare: true, footer: true }
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

  { path: '/:pathMatch(.*)*', redirect: '/home' },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

router.beforeEach(async (to, from, next) => {
  const auth = authStore();

  if (!to.meta?.auth && !to.meta?.tenant && !to.meta?.permission && !to.meta?.platform) {
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

  //A user with no team waits on the public processes screen
  if (auth.hasNoTenant && to.name !== 'waiting' && to.name !== 'profile' && to.name !== 'myApplications') {
    return next({ name: 'waiting' });
  }

  if (to.meta?.tenant && !auth.activeTenantId) {
    return next({ name: auth.memberships.length ? 'chooseTenant' : 'waiting' });
  }

  if (to.meta?.permission && !auth.can(to.meta.permission as string)) {
    return next({ name: 'home' });
  }

  if (to.meta?.platform && !auth.canPlatform(to.meta.platform as string)) {
    return next({ name: 'home' });
  }

  return next();
});


export default router
