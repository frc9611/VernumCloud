import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { session } from '@/services/api.js';
import router from '../router';

const TOKEN_KEY = 'token';
const TENANT_KEY = 'activeTenantId';

/*
 * Session of the dashboard.
 *
 * The server answers the login with every team of the user, the permissions of each
 * one and the divisions the user is in. The store keeps that picture and the id of
 * the team currently open, so a screen only has to ask `auth.can('FILE_UPLOAD')`
 * instead of knowing anything about memberships.
 *
 * Three situations come out of the memberships and drive the routing:
 *   - no team at all  -> the waiting screen with the processos seletivos abertos;
 *   - more than one   -> the team chooser, unless one was already picked;
 *   - exactly one     -> it is opened right away.
 */
export const authStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) || '');
  const user = ref(null);
  const memberships = ref([]);
  const platformPermissions = ref([]);
  const platformAdmin = ref(false);
  const activeTenantId = ref(readStoredTenantId());
  const isAuth = ref(!!localStorage.getItem(TOKEN_KEY));
  const ready = ref(false);

  function readStoredTenantId() {
    const stored = localStorage.getItem(TENANT_KEY);
    return stored ? Number(stored) : null;
  }

  /* ------------------------------------------------------------- computed */

  const isAuthenticated = computed(() => !!token.value);
  const getToken = computed(() => token.value);
  const getId = computed(() => user.value?.userId || null);
  const getName = computed(() => user.value?.name || '');
  const getUsername = computed(() => user.value?.username || '');

  const activeMembership = computed(() =>
    memberships.value.find((membership) => membership.tenant?.tenantId === activeTenantId.value) || null,
  );
  const activeTenant = computed(() => activeMembership.value?.tenant || null);
  /** Whether the team open is the administrator team: the dashboard paints it in its own palette. */
  const activeTenantIsSystem = computed(() => !!activeTenant.value?.systemTenant);
  const activeTenantName = computed(() => activeTenant.value?.visibleName || '');
  const activeTenantColor = computed(() => activeTenant.value?.color || '#8864AE');
  const activeRoleLabel = computed(() => activeMembership.value?.roleLabel || '');
  const activePermissions = computed(() => activeMembership.value?.permissions || []);
  const activeDivisions = computed(() => activeMembership.value?.divisions || []);
  const activeFeatures = computed(() => activeTenant.value?.enabledFeatures || []);
  const activeCategory = computed(() => activeTenant.value?.competitionCategory || 'NONE');
  const activeCategoryLabel = computed(() => activeTenant.value?.competitionCategoryLabel || '');
  const activePerformanceStyle = computed(() => activeTenant.value?.performanceStyle || 'NONE');

  const hasNoTenant = computed(() => isAuth.value && memberships.value.length === 0);
  const needsTenantChoice = computed(
    () => isAuth.value && memberships.value.length > 1 && !activeMembership.value,
  );
  /** True while the store still does not know which team is open. */
  const withoutActiveTenant = computed(() => isAuth.value && !activeMembership.value);

  /* ------------------------------------------------------------ questions */

  /** Whether the user has a permission inside the team currently open. */
  function can(permission) {
    return activePermissions.value.includes(permission);
  }

  function canAny(...permissions) {
    return permissions.some((permission) => can(permission));
  }

  /** Whether the user has a permission over the platform, granted by the admin tenant. */
  function canPlatform(permission) {
    return platformPermissions.value.includes(permission);
  }

  /*
   * Whether the team currently open uses a part of the platform.
   *
   * This is for hiding a menu item, never for guarding anything: the permissions of a
   * switched off feature are not in `permissions` at all, so `can()` already answers no
   * and the server refuses regardless. It matters on the few screens whose gate is not a
   * permission — the presence register, a trip somebody was invited to — and to tell
   * "nada por aqui" apart from "isso está desligado".
   */
  function featureOn(feature) {
    //An older server that does not answer the field yet must not blank the whole interface
    if (!activeFeatures.value.length) return true;
    return activeFeatures.value.includes(feature);
  }

  /** Features of a team that may not be the one open. */
  function featuresOn(tenantId) {
    const membership = membershipOn(tenantId);
    return membership?.tenant?.enabledFeatures || [];
  }

  /** Permissions the user has on a specific team, which may not be the one open. */
  function permissionsOn(tenantId) {
    const membership = memberships.value.find((item) => item.tenant?.tenantId === Number(tenantId));
    return membership?.permissions || [];
  }

  function membershipOn(tenantId) {
    return memberships.value.find((item) => item.tenant?.tenantId === Number(tenantId)) || null;
  }

  /* -------------------------------------------------------------- actions */

  function setToken(value) {
    token.value = value || '';
    if (value) {
      localStorage.setItem(TOKEN_KEY, value);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    isAuth.value = !!value;
  }

  /** Stores what /me and /login answer about the user. */
  function applyMe(me) {
    if (!me) return;
    user.value = me.user || null;
    memberships.value = me.memberships || [];
    platformPermissions.value = me.platformPermissions || [];
    platformAdmin.value = !!me.platformAdmin;

    //A team that is gone, or was never chosen, must not stay selected
    if (activeTenantId.value && !membershipOn(activeTenantId.value)) {
      setActiveTenant(null);
    }
    if (!activeTenantId.value && memberships.value.length === 1) {
      setActiveTenant(memberships.value[0].tenant.tenantId);
    }
  }

  function setActiveTenant(tenantId) {
    if (tenantId === null || tenantId === undefined) {
      activeTenantId.value = null;
      localStorage.removeItem(TENANT_KEY);
      return;
    }
    activeTenantId.value = Number(tenantId);
    localStorage.setItem(TENANT_KEY, String(tenantId));
  }

  async function login(credentials) {
    const { data } = await session.login(credentials);
    setToken(data.accessToken);
    applyMe(data.me);
    ready.value = true;
    return data;
  }

  /** Reloads the session from the server. Used on boot and after changing a team. */
  async function loadMe() {
    if (!token.value) {
      ready.value = true;
      return false;
    }
    try {
      const { data } = await session.me();
      applyMe(data);
      isAuth.value = true;
      ready.value = true;
      return true;
    } catch (error) {
      clear(false);
      ready.value = true;
      return false;
    }
  }

  function clear(redirect = true) {
    setToken('');
    setActiveTenant(null);
    user.value = null;
    memberships.value = [];
    platformPermissions.value = [];
    platformAdmin.value = false;
    isAuth.value = false;
    if (redirect) {
      router.push({ name: 'login' });
    }
  }

  return {
    token,
    user,
    memberships,
    platformPermissions,
    platformAdmin,
    activeTenantId,
    isAuth,
    ready,

    isAuthenticated,
    getToken,
    getId,
    getName,
    getUsername,
    activeMembership,
    activeTenant,
    activeTenantIsSystem,
    activeTenantName,
    activeTenantColor,
    activeRoleLabel,
    activePermissions,
    activeDivisions,
    activeFeatures,
    activeCategory,
    activeCategoryLabel,
    activePerformanceStyle,
    hasNoTenant,
    needsTenantChoice,
    withoutActiveTenant,

    can,
    canAny,
    canPlatform,
    featureOn,
    featuresOn,
    permissionsOn,
    membershipOn,

    setToken,
    applyMe,
    setActiveTenant,
    login,
    loadMe,
    clear,
  };
});
