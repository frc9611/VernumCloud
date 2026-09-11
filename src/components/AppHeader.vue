<template>
  <header class="vc-header">
    <div class="vc-header__inner">
      <router-link :to="homeTarget" class="vc-header__brand">
        <VernumLogo />
      </router-link>
      <!-- Only on the administrator palette: the person must know they are acting on the platform -->
      <span v-if="prefs.isAdminMode" class="vc-header__admin" title="Você está na administração da plataforma">
        Administração
      </span>

      <button class="vc-header__toggle" type="button" aria-label="Menu" @click.stop="menuOpen = !menuOpen">
        <AppIcon name="menu" :size="22" />
      </button>

      <nav :class="['vc-header__nav', menuOpen ? 'is-open' : '']">
        <!-- Which team is open. Only shown when the user is in more than one. -->
        <div v-if="auth.memberships.length > 1" class="vc-header__tenant">
          <button
            class="vc-header__tenant-toggle"
            type="button"
            :aria-expanded="tenantOpen"
            @click.stop="toggleTenants"
          >
            <span class="vc-dot" :style="{ background: auth.activeTenantColor }"></span>
            {{ auth.activeTenantName || 'Escolher equipe' }}
            <AppIcon name="chevronDown" :size="14" />
          </button>
          <div v-if="tenantOpen" class="vc-header__dropdown" @click.stop>
            <p class="vc-header__dropdown-title">Suas equipes</p>
            <button
              v-for="membership in auth.memberships"
              :key="membership.membershipId"
              type="button"
              :class="['vc-header__tenant-item', membership.tenant.tenantId === auth.activeTenantId ? 'is-active' : '']"
              @click="chooseTenant(membership.tenant.tenantId)"
            >
              <span class="vc-dot" :style="{ background: membership.tenant.color || '#8864AE' }"></span>
              <span>
                <span class="vc-header__tenant-name">{{ membership.tenant.visibleName }}</span>
                <span class="vc-faint">{{ membership.roleLabel }}</span>
              </span>
              <AppIcon v-if="membership.tenant.tenantId === auth.activeTenantId" name="check" :size="15" />
            </button>
          </div>
        </div>

        <router-link v-if="showAdminPanel" :to="{ name: 'admin' }" class="vc-header__link">Admin</router-link>
        <router-link :to="{ name: 'home' }" class="vc-header__link">Dashboard</router-link>
        <router-link v-if="auth.activeTenantId && auth.featureOn('CLOUD')" :to="{ name: 'cloud' }"
                     class="vc-header__link">Arquivos</router-link>
        <router-link :to="{ name: 'profile' }" class="vc-header__link">Perfil</router-link>

        <!-- Light or dark. Hidden on the administrator palette, which is always black. -->
        <button
          v-if="!prefs.isAdminMode"
          class="vc-header__icon-btn"
          type="button"
          :aria-label="themeLabel"
          :title="themeLabel"
          @click="toggleTheme"
        >
          <AppIcon :name="prefs.resolvedTheme === 'dark' ? 'sun' : 'moon'" :size="18" />
        </button>

        <!-- Notification bell -->
        <div class="vc-header__bell">
          <button
            :class="['vc-header__bell-btn', notificationsOpen ? 'is-open' : '']"
            type="button"
            aria-label="Notificações"
            @click.stop="toggleNotifications"
          >
            <AppIcon name="bell" :size="19" />
            <span v-if="notifications.unread" class="vc-header__bell-count">{{ badge }}</span>
          </button>

          <div v-if="notificationsOpen" class="vc-header__dropdown vc-header__dropdown--wide" @click.stop>
            <div class="vc-header__dropdown-head">
              <strong>Notificações</strong>
              <button
                v-if="notifications.unread"
                class="vc-btn vc-btn--ghost vc-btn--small"
                type="button"
                @click="notifications.markAllRead()"
              >
                Marcar como lidas
              </button>
            </div>

            <p v-if="notifications.loading" class="vc-faint vc-header__dropdown-empty">Carregando...</p>
            <p v-else-if="!visibleNotifications.length" class="vc-faint vc-header__dropdown-empty">
              Nenhuma notificação por enquanto.
            </p>

            <button
              v-for="item in visibleNotifications"
              :key="item.notificationId"
              type="button"
              :class="['vc-notification', item.read ? '' : 'is-unread']"
              @click="openNotification(item)"
            >
              <span class="vc-notification__icon"><AppIcon :name="iconFor(item.type)" :size="16" /></span>
              <span class="vc-notification__content">
                <span class="vc-notification__title">{{ item.title }}</span>
                <span class="vc-notification__message">{{ item.message }}</span>
                <span class="vc-faint">
                  {{ item.typeLabel }} · {{ formatWhen(item.createdAt) }}
                  <template v-if="item.tenantName"> · {{ item.tenantName }}</template>
                </span>
              </span>
            </button>
          </div>
        </div>

        <button class="vc-header__logout" type="button" @click="logout">Logout</button>
      </nav>
    </div>
  </header>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import VernumLogo from './VernumLogo.vue';
import AppIcon from './AppIcon.vue';
import { authStore } from '@/store/auth.js';
import { notificationStore } from '@/store/notifications.js';
import { preferencesStore } from '@/store/preferences.js';

const auth = authStore();
const notifications = notificationStore();
const prefs = preferencesStore();
const router = useRouter();
const toast = useToast();

const menuOpen = ref(false);
const tenantOpen = ref(false);
const notificationsOpen = ref(false);

/*
 * The Admin Panel link only appears when there is something to administrate. TASK_MANAGE deliberately
 * is not on the list: desde que o quadro virou da equipe inteira, todo estudante tem essa permissão, e
 * ela deixou de dizer que alguém administra alguma coisa.
 */
const showAdminPanel = computed(
  () =>
    auth.platformAdmin ||
    auth.canPlatform('TENANT_CREATE') ||
    auth.canAny(
      'TENANT_MANAGE',
      'MEMBER_INVITE',
      'MEMBER_UPDATE',
      'PERMISSION_MANAGE',
      'DIVISION_CREATE',
      'DIVISION_UPDATE',
      'RECRUITMENT_MANAGE',
      'RISK_MANAGE',
      'PERFORMANCE_MANAGE',
      'DEVELOPMENT_MANAGE',
      'EVALUATION_MANAGE',
      'JOURNAL_MANAGE',
      'RFID_MANAGE',
    ),
);

const homeTarget = computed(() => (auth.isAuth ? { name: 'home' } : { name: 'login' }));
const themeLabel = computed(() => (prefs.resolvedTheme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'));

/* The header flips between light and dark; following the OS is chosen on the profile screen. */
function toggleTheme() {
  prefs.setTheme(prefs.resolvedTheme === 'dark' ? 'light' : 'dark');
}
const badge = computed(() => (notifications.unread > 9 ? '9+' : notifications.unread));
const visibleNotifications = computed(() => notifications.forTenant(auth.activeTenantId));

/* One dropdown at a time. The click stops here so the document listener does not close it again. */
function toggleTenants() {
  notificationsOpen.value = false;
  tenantOpen.value = !tenantOpen.value;
}

async function toggleNotifications() {
  tenantOpen.value = false;
  notificationsOpen.value = !notificationsOpen.value;
  if (notificationsOpen.value) {
    await notifications.load();
  }
}

function chooseTenant(tenantId) {
  auth.setActiveTenant(tenantId);
  tenantOpen.value = false;
  menuOpen.value = false;
  router.push({ name: 'home' });
}

async function openNotification(item) {
  await notifications.markRead(item.notificationId);
  notificationsOpen.value = false;
  if (item.tenantId && item.tenantId !== auth.activeTenantId && auth.membershipOn(item.tenantId)) {
    auth.setActiveTenant(item.tenantId);
  }
  if (item.link) {
    //A notification may point to a route the user cannot open any more
    router.push(item.link).catch(() => toast.warning('Não foi possível abrir esse item.'));
  }
}

/** Icon of each notification type, so the list is readable at a glance. */
function iconFor(type) {
  if (type.startsWith('CLOUD_ACCESS')) return 'key';
  if (type === 'CLOUD_SHARED') return 'share';
  if (type === 'CLOUD_COMMENT') return 'comment';
  if (type.startsWith('TENANT_MEMBER')) return 'users';
  if (type.startsWith('DIVISION_MEMBER')) return 'divisions';
  if (type === 'ANNOUNCEMENT_PUBLISHED') return 'megaphone';
  if (type === 'ANNOUNCEMENT_COMMENT') return 'comment';
  if (type.startsWith('TRIP')) return 'plane';
  if (type.startsWith('RECRUITMENT')) return 'clipboard';
  return 'info';
}

function formatWhen(value) {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function logout() {
  notifications.reset();
  auth.clear();
}

/* Any click outside closes the open dropdown. */
function closeDropdowns() {
  tenantOpen.value = false;
  notificationsOpen.value = false;
}

onMounted(() => {
  document.addEventListener('click', closeDropdowns);
  if (auth.isAuth) notifications.startPolling();
});

onUnmounted(() => {
  document.removeEventListener('click', closeDropdowns);
  notifications.stopPolling();
});

watch(
  () => auth.isAuth,
  (value) => (value ? notifications.startPolling() : notifications.reset()),
);
</script>

<style scoped>
.vc-header {
  background: var(--vc-surface);
  border-bottom: 1px solid var(--vc-border);
  position: sticky;
  top: 0;
  z-index: 40;
}

.vc-header__inner {
  max-width: 1240px;
  margin: 0 auto;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.vc-header__brand {
  text-decoration: none;
}

.vc-header__toggle {
  display: none;
  margin-left: auto;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--vc-text);
  padding: 4px;
}

.vc-header__nav {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 16px;
}

.vc-header__link {
  color: var(--vc-text);
  text-decoration: none;
  font-size: 0.95rem;
  padding-bottom: 2px;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
}

.vc-header__link:hover {
  color: var(--vc-purple-strong);
}

.vc-header__link.router-link-active {
  border-bottom-color: var(--vc-text);
  font-weight: 500;
}

.vc-header__logout {
  background: var(--vc-danger-bg);
  border: 1px solid var(--vc-danger-border);
  color: var(--vc-danger-text);
  border-radius: var(--vc-radius);
  padding: 6px 16px;
  font: inherit;
  font-size: 0.92rem;
  cursor: pointer;
}

.vc-header__logout:hover {
  background: var(--vc-danger-hover);
}

/* Only ever shown on the administrator palette, where the accent is the red: a solid red tag */
.vc-header__admin {
  padding: 2px 9px;
  border-radius: 999px;
  background: var(--vc-purple);
  color: var(--vc-on-accent);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}

.vc-header__tenant,
.vc-header__bell {
  position: relative;
}

.vc-header__tenant-toggle {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 11px;
  border-radius: 999px;
  border: 1px solid var(--vc-purple-border);
  background: var(--vc-purple-soft);
  color: var(--vc-purple-strong);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}

.vc-header__tenant-toggle:hover {
  border-color: var(--vc-purple);
}

/* ---------------------------------------------------- bell and theme toggle */

.vc-header__bell-btn,
.vc-header__icon-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid transparent;
  background: transparent;
  color: var(--vc-text-muted);
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}

.vc-header__bell-btn:hover,
.vc-header__bell-btn.is-open,
.vc-header__icon-btn:hover {
  background: var(--vc-purple-soft);
  border-color: var(--vc-purple-border);
  color: var(--vc-purple-strong);
}

.vc-header__bell-count {
  position: absolute;
  top: -1px;
  right: -2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--vc-danger-strong);
  border: 2px solid var(--vc-surface);
  color: var(--vc-on-accent);
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 12px;
  text-align: center;
}

/* ------------------------------------------------------------ dropdowns */

.vc-header__dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 10px);
  background: var(--vc-surface);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius-lg);
  box-shadow: var(--vc-shadow-lg);
  padding: 8px;
  min-width: 250px;
  z-index: 50;
}

.vc-header__dropdown--wide {
  min-width: 360px;
  max-height: 440px;
  overflow-y: auto;
}

.vc-header__dropdown-title {
  margin: 4px 8px 6px;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vc-text-faint);
}

.vc-header__dropdown-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 4px 6px 10px;
  border-bottom: 1px solid var(--vc-border);
  margin-bottom: 6px;
  font-size: 0.9rem;
}

.vc-header__dropdown-empty {
  padding: 10px 6px;
  margin: 0;
}

.vc-header__tenant-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: var(--vc-radius);
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  color: var(--vc-text);
}

.vc-header__tenant-item:hover {
  background: var(--vc-surface-muted);
}

.vc-header__tenant-item.is-active {
  background: var(--vc-purple-soft);
  color: var(--vc-purple-strong);
}

.vc-header__tenant-item > span:nth-child(2) {
  flex: 1;
  min-width: 0;
}

.vc-header__tenant-item span span {
  display: block;
  line-height: 1.25;
}

.vc-header__tenant-name {
  font-size: 0.92rem;
  font-weight: 500;
}

/* -------------------------------------------------------- notifications */

.vc-notification {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  text-align: left;
  border: none;
  border-radius: var(--vc-radius);
  background: transparent;
  padding: 9px 10px;
  font: inherit;
  cursor: pointer;
  color: var(--vc-text);
}

.vc-notification:hover {
  background: var(--vc-surface-muted);
}

.vc-notification__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex: none;
  border-radius: 50%;
  background: var(--vc-surface-muted);
  color: var(--vc-text-muted);
}

.vc-notification.is-unread .vc-notification__icon {
  background: var(--vc-purple-soft);
  color: var(--vc-purple-strong);
}

.vc-notification__content {
  min-width: 0;
  display: block;
}

.vc-notification__content > span {
  display: block;
}

.vc-notification__title {
  font-size: 0.9rem;
  font-weight: 500;
}

.vc-notification.is-unread .vc-notification__title {
  font-weight: 700;
}

.vc-notification__message {
  font-size: 0.84rem;
  color: var(--vc-text-muted);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

@media (max-width: 900px) {
  .vc-header__toggle {
    display: block;
  }

  .vc-header__nav {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    background: var(--vc-surface);
    border-bottom: 1px solid var(--vc-border);
    padding: 16px 20px;
    box-shadow: var(--vc-shadow-lg);
  }

  .vc-header__nav.is-open {
    display: flex;
  }

  .vc-header__dropdown {
    position: static;
    box-shadow: none;
    min-width: 0;
  }
}
</style>
