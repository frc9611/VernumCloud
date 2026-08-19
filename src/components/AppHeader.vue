<template>
  <header class="vc-header">
    <div class="vc-header__inner">
      <router-link :to="homeTarget" class="vc-header__brand">
        <VernumLogo />
      </router-link>

      <button class="vc-header__toggle" type="button" @click="menuOpen = !menuOpen" aria-label="Menu">☰</button>

      <nav :class="['vc-header__nav', menuOpen ? 'is-open' : '']">
        <!-- Which team is open. Only shown when the user is in more than one. -->
        <div v-if="auth.memberships.length > 1" class="vc-header__tenant">
          <button class="vc-chip vc-chip--purple vc-chip--button" type="button" @click="tenantOpen = !tenantOpen">
            <span class="vc-dot" :style="{ background: auth.activeTenantColor }"></span>
            {{ auth.activeTenantName || 'Escolher equipe' }}
            <span aria-hidden="true">▾</span>
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
            </button>
          </div>
        </div>

        <router-link v-if="showAdminPanel" :to="{ name: 'admin' }" class="vc-header__link">Admin Panel</router-link>
        <router-link :to="{ name: 'home' }" class="vc-header__link">Dashboard</router-link>
        <router-link v-if="auth.activeTenantId" :to="{ name: 'cloud' }" class="vc-header__link">Arquivos</router-link>
        <router-link :to="{ name: 'profile' }" class="vc-header__link">Profile</router-link>

        <!-- Notification bell -->
        <div class="vc-header__bell">
          <button class="vc-header__bell-btn" type="button" @click="toggleNotifications" aria-label="Notificações">
            <span aria-hidden="true">🔔</span>
            <span v-if="notifications.unread" class="vc-header__bell-count">{{ badge }}</span>
          </button>
          <div v-if="notificationsOpen" class="vc-header__dropdown vc-header__dropdown--wide" @click.stop>
            <div class="vc-row vc-row--between" style="padding: 0 4px 8px">
              <strong style="font-size: 0.9rem">Notificações</strong>
              <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="notifications.markAllRead()">
                Marcar como lidas
              </button>
            </div>
            <p v-if="notifications.loading" class="vc-faint" style="padding: 8px 4px">Carregando...</p>
            <p v-else-if="!visibleNotifications.length" class="vc-faint" style="padding: 8px 4px">
              Nenhuma notificação por enquanto.
            </p>
            <button
              v-for="item in visibleNotifications"
              :key="item.notificationId"
              type="button"
              :class="['vc-notification', item.read ? '' : 'is-unread']"
              @click="openNotification(item)"
            >
              <span class="vc-notification__type">{{ item.typeLabel }}</span>
              <span class="vc-notification__title">{{ item.title }}</span>
              <span class="vc-notification__message">{{ item.message }}</span>
              <span class="vc-faint">{{ formatWhen(item.createdAt) }}<template v-if="item.tenantName"> · {{ item.tenantName }}</template></span>
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
import { authStore } from '@/store/auth.js';
import { notificationStore } from '@/store/notifications.js';

const auth = authStore();
const notifications = notificationStore();
const router = useRouter();
const toast = useToast();

const menuOpen = ref(false);
const tenantOpen = ref(false);
const notificationsOpen = ref(false);

/* The Admin Panel link only appears when there is something to administrate. */
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
    ),
);

const homeTarget = computed(() => (auth.isAuth ? { name: 'home' } : { name: 'login' }));
const badge = computed(() => (notifications.unread > 9 ? '9+' : notifications.unread));
const visibleNotifications = computed(() => notifications.forTenant(auth.activeTenantId));

function chooseTenant(tenantId) {
  auth.setActiveTenant(tenantId);
  tenantOpen.value = false;
  menuOpen.value = false;
  router.push({ name: 'home' });
}

async function toggleNotifications() {
  notificationsOpen.value = !notificationsOpen.value;
  if (notificationsOpen.value) {
    await notifications.load();
  }
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
  font-size: 22px;
  cursor: pointer;
  color: var(--vc-text);
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
  background: #efd3d3;
}

.vc-header__tenant,
.vc-header__bell {
  position: relative;
}

.vc-header__bell-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  position: relative;
  padding: 2px 4px;
  line-height: 1;
}

.vc-header__bell-count {
  position: absolute;
  top: -4px;
  right: -6px;
  background: #e03131;
  color: #fff;
  border-radius: 10px;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 5px;
  line-height: 1.3;
}

.vc-header__dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 10px);
  background: var(--vc-surface);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius);
  box-shadow: var(--vc-shadow-lg);
  padding: 10px;
  min-width: 240px;
  z-index: 50;
}

.vc-header__dropdown--wide {
  min-width: 340px;
  max-height: 420px;
  overflow-y: auto;
}

.vc-header__dropdown-title {
  margin: 0 4px 6px;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--vc-text-faint);
}

.vc-header__tenant-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.vc-header__tenant-item:hover {
  background: var(--vc-purple-soft);
}

.vc-header__tenant-item.is-active {
  background: var(--vc-purple-soft);
  font-weight: 600;
}

.vc-header__tenant-item span span {
  display: block;
  line-height: 1.25;
}

.vc-header__tenant-name {
  font-size: 0.92rem;
}

.vc-notification {
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  border-radius: 6px;
  background: transparent;
  padding: 8px 10px;
  font: inherit;
  cursor: pointer;
  border-left: 3px solid transparent;
}

.vc-notification:hover {
  background: var(--vc-surface-muted);
}

.vc-notification.is-unread {
  border-left-color: var(--vc-purple);
  background: var(--vc-purple-soft);
}

.vc-notification span {
  display: block;
}

.vc-notification__type {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--vc-purple-strong);
  font-weight: 600;
}

.vc-notification__title {
  font-size: 0.9rem;
  font-weight: 600;
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
