<template>
  <div class="division-node" :style="{ marginLeft: depth * 22 + 'px' }">
    <router-link class="vc-card vc-card--action division-node__card"
                 :to="{ name: 'divisionDetail', params: { id: division.divisionId } }">
      <span class="division-node__bar" :style="{ background: division.color || '#8864AE' }"></span>
      <span class="division-node__body">
        <span class="division-node__name">{{ division.visibleName }}</span>
        <span class="vc-faint">{{ division.slug }}</span>
        <span v-if="division.description" class="vc-small vc-muted">{{ division.description }}</span>
      </span>
      <span class="division-node__meta">
        <span class="vc-chip">{{ division.memberCount ?? 0 }} membro(s)</span>
        <span v-if="division.children?.length" class="vc-chip vc-chip--purple">
          {{ division.children.length }} subdivisão(ões)
        </span>
        <span v-if="division.showInSelectionProcess" class="vc-chip vc-chip--info">Processo seletivo</span>
      </span>
    </router-link>

    <DivisionNode
      v-for="child in division.children || []"
      :key="child.divisionId"
      :division="child"
      :depth="depth + 1"
    />
  </div>
</template>

<script setup>
/* One node of the division tree. Renders itself again for the subdivisions. */
defineProps({
  division: { type: Object, required: true },
  depth: { type: Number, default: 0 },
});
</script>

<style scoped>
.division-node {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.division-node__card {
  display: flex;
  /*
   * Row on purpose. An action card of the design system is a vertical stack — header, body, footer —
   * and this is the one card that reads as a line instead: colored rail, body, chips. Without saying
   * so here it inherits the column of .vc-card--action and the whole tree falls apart.
   */
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 0 14px 0 0;
  overflow: hidden;
}

.division-node__bar {
  width: 6px;
  align-self: stretch;
  min-height: 62px;
}

.division-node__body {
  display: flex;
  flex-direction: column;
  padding: 10px 0;
  min-width: 0;
}

.division-node__name {
  font-weight: 600;
}

.division-node__meta {
  margin-left: auto;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
</style>
