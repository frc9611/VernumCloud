import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { notifications as api } from '@/services/api.js';

/*
 * The notification bell of the header.
 *
 * The list is refreshed when the panel opens and on a slow interval while the tab is
 * open, which is enough for a dashboard and avoids holding a socket for something
 * that changes a few times per hour.
 */
const REFRESH_MS = 60000;

export const notificationStore = defineStore('notifications', () => {
  const items = ref([]);
  const unread = ref(0);
  const loading = ref(false);
  let timer = null;

  const hasUnread = computed(() => unread.value > 0);
  /** Only the notifications of the team currently open, plus the ones with no team. */
  function forTenant(tenantId) {
    if (!tenantId) return items.value;
    return items.value.filter((item) => !item.tenantId || item.tenantId === Number(tenantId));
  }

  async function refreshCount() {
    try {
      const { data } = await api.unreadCount();
      unread.value = data.unread || 0;
    } catch (error) {
      //A failing bell must never break the page
      unread.value = 0;
    }
  }

  async function load() {
    loading.value = true;
    try {
      const { data } = await api.list({ limit: 40 });
      items.value = data;
      unread.value = data.filter((item) => !item.read).length;
    } catch (error) {
      items.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function markRead(notificationId) {
    const item = items.value.find((candidate) => candidate.notificationId === notificationId);
    if (item && !item.read) {
      item.read = true;
      unread.value = Math.max(0, unread.value - 1);
    }
    try {
      await api.markRead(notificationId);
    } catch (error) {
      //The local state already moved on, the next refresh fixes it
    }
  }

  async function markAllRead() {
    items.value.forEach((item) => {
      item.read = true;
    });
    unread.value = 0;
    try {
      await api.markAllRead();
    } catch (error) {
      //Same as above
    }
  }

  async function remove(notificationId) {
    items.value = items.value.filter((item) => item.notificationId !== notificationId);
    try {
      await api.remove(notificationId);
    } catch (error) {
      //Same as above
    }
    await refreshCount();
  }

  function startPolling() {
    stopPolling();
    refreshCount();
    timer = setInterval(refreshCount, REFRESH_MS);
  }

  function stopPolling() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function reset() {
    stopPolling();
    items.value = [];
    unread.value = 0;
  }

  return {
    items,
    unread,
    loading,
    hasUnread,
    forTenant,
    load,
    refreshCount,
    markRead,
    markAllRead,
    remove,
    startPolling,
    stopPolling,
    reset,
  };
});
