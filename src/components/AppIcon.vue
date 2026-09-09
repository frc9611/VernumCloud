<template>
  <svg
    class="vc-icon"
    :style="{ width: size + 'px', height: size + 'px', strokeWidth: stroke }"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="(d, index) in paths" :key="'p' + index" :d="d" />
    <circle
      v-for="(c, index) in circles"
      :key="'c' + index"
      :cx="c[0]"
      :cy="c[1]"
      :r="c[2]"
    />
    <rect
      v-for="(r, index) in rects"
      :key="'r' + index"
      :x="r[0]"
      :y="r[1]"
      :width="r[2]"
      :height="r[3]"
      :rx="r[4]"
    />
  </svg>
</template>

<script setup>
import { computed } from 'vue';

/*
 * The single icon set of the dashboard.
 *
 * Line icons on a 24x24 grid, drawn with currentColor so they take the accent of the team or the
 * color of the text around them. Add a new icon here instead of dropping an emoji in a template:
 * emojis change shape per platform and never match the accent.
 */
const ICONS = {
  menu: { paths: ['M3 6h18', 'M3 12h18', 'M3 18h18'] },
  close: { paths: ['M18 6 6 18', 'M6 6l12 12'] },
  chevronDown: { paths: ['m6 9 6 6 6-6'] },
  chevronRight: { paths: ['m9 6 6 6-6 6'] },
  bell: { paths: ['M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 0 1-3.46 0'] },
  home: { paths: ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'] },

  alert: {
    paths: [
      'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
      'M12 9v4',
      'M12 17h.01',
    ],
  },
  info: { paths: ['M12 16v-4', 'M12 8h.01'], circles: [[12, 12, 10]] },
  check: { paths: ['M22 11.08V12a10 10 0 1 1-5.93-9.14', 'M22 4 12 14.01l-3-3'] },
  clock: { paths: ['M12 6v6l4 2'], circles: [[12, 12, 10]] },

  folder: { paths: ['M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z'] },
  file: {
    paths: [
      'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
      'M14 2v6h6',
      'M16 13H8',
      'M16 17H8',
    ],
  },
  lock: { paths: ['M7 11V7a5 5 0 0 1 10 0v4'], rects: [[3, 11, 18, 11, 2]] },
  cloud: { paths: ['M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z'] },
  trash: {
    paths: [
      'M3 6h18',
      'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
      'M10 11v6',
      'M14 11v6',
      'M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2',
    ],
  },
  upload: { paths: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'] },
  download: { paths: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'] },
  back: { paths: ['M9 14 4 9l5-5', 'M20 20v-7a4 4 0 0 0-4-4H4'] },
  plus: { paths: ['M12 5v14', 'M5 12h14'] },
  search: { paths: ['M21 21l-4.35-4.35'], circles: [[11, 11, 8]] },
  copy: { paths: ['M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'], rects: [[9, 9, 13, 13, 2]] },
  edit: {
    paths: [
      'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7',
      'M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z',
    ],
  },
  camera: {
    paths: ['M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z'],
    circles: [[12, 13, 4]],
  },
  power: { paths: ['M18.36 6.64a9 9 0 1 1-12.73 0', 'M12 2v10'] },
  comment: { paths: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'] },
  megaphone: {
    paths: [
      'M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1z',
      'M17 9a4 4 0 0 1 0 6',
      'M7 14v5a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-3.5',
    ],
  },
  send: { paths: ['M22 2 11 13', 'M22 2l-7 20-4-9-9-4z'] },
  plane: { paths: ['M17.8 19.2 16 11l3.5-3.5a2.12 2.12 0 0 0-3-3L13 8 4.8 6.2a.5.5 0 0 0-.5.8l3.2 3.2-2 2-2.2-.6a.5.5 0 0 0-.5.8L5 15l1.6 2.2a.5.5 0 0 0 .8-.5l-.6-2.2 2-2 3.2 3.2a.5.5 0 0 0 .8-.5z'] },
  bus: {
    paths: ['M4 17V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11', 'M4 11h16', 'M6 17v2', 'M18 17v2', 'M2 17h20'],
    circles: [[7.5, 14.5, 1], [16.5, 14.5, 1]],
  },
  car: {
    paths: ['M5 13l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13', 'M3 13h18v4H3z', 'M6 17v2', 'M18 17v2'],
    circles: [[7, 15, 1], [17, 15, 1]],
  },
  mapPin: { paths: ['M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z'], circles: [[12, 10, 3]] },
  calendar: {
    paths: ['M8 2v4', 'M16 2v4', 'M3 10h18'],
    rects: [[3, 4, 18, 18, 2]],
  },
  link: {
    paths: [
      'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
      'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
    ],
  },
  share: {
    paths: ['M8.59 13.51l6.83 3.98', 'M15.41 6.51l-6.82 3.98'],
    circles: [[18, 5, 3], [6, 12, 3], [18, 19, 3]],
  },
  key: { paths: ['M12.5 11.5 21 3', 'M18 6l3 3', 'M15 9l3 3'], circles: [[7.5, 16.5, 5.5]] },
  shield: { paths: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'] },

  /* An RFID card: the plastic, the chip on it, and the waves it answers a reader with. */
  card: {
    paths: [
      'M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z',
      'M6 10h3v3H6z',
      'M14.5 9.5a4 4 0 0 1 0 5',
      'M17 7.5a7 7 0 0 1 0 9',
    ],
  },

  users: {
    paths: [
      'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2',
      'M23 21v-2a4 4 0 0 0-3-3.87',
      'M16 3.13a4 4 0 0 1 0 7.75',
    ],
    circles: [[9, 7, 4]],
  },
  userPlus: {
    paths: ['M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M20 8v6', 'M23 11h-6'],
    circles: [[8.5, 7, 4]],
  },
  divisions: { paths: ['M6 3v12', 'M18 9a9 9 0 0 1-9 9'], circles: [[18, 6, 3], [6, 18, 3]] },
  flag: { paths: ['M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z', 'M4 22v-7'] },
  clipboard: {
    paths: ['M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'],
    rects: [[8, 2, 8, 4, 1]],
  },
  chart: { paths: ['M18 20V10', 'M12 20V4', 'M6 20v-6'] },
  eye: { paths: ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'], circles: [[12, 12, 3]] },
  eyeOff: {
    paths: [
      'M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12a18.45 18.45 0 0 1 5.06-5.94',
      'M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19',
      'M14.12 14.12a3 3 0 1 1-4.24-4.24',
      'M1 1l22 22',
    ],
  },
  refresh: { paths: ['M23 4v6h-6', 'M1 20v-6h6', 'M3.51 9a9 9 0 0 1 14.85-3.36L23 10', 'M1 14l4.64 4.36A9 9 0 0 0 20.49 15'] },

  /* Board of the team, development and the season */
  kanban: { paths: ['M6 7v10', 'M12 7v6', 'M18 7v13'], rects: [[3, 3, 18, 18, 2]] },
  target: { circles: [[12, 12, 9], [12, 12, 5], [12, 12, 1]] },
  gauge: { paths: ['M12 14l4-4', 'M4.5 18a9 9 0 1 1 15 0'], circles: [[12, 14, 1.6]] },
  notebook: {
    paths: [
      'M7 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
      'M5 8h4', 'M5 12h4', 'M5 16h4', 'M12 7h5', 'M12 11h5',
    ],
  },
  sliders: {
    paths: ['M4 6h6', 'M14 6h6', 'M4 12h10', 'M18 12h2', 'M4 18h3', 'M11 18h9'],
    circles: [[12, 6, 2], [16, 12, 2], [9, 18, 2]],
  },
  star: { paths: ['M12 2.5l2.9 6.1 6.6.9-4.8 4.7 1.2 6.6L12 17.7 6.1 20.8l1.2-6.6L2.5 9.5l6.6-.9z'] },
  seedling: {
    paths: [
      'M12 21v-8',
      'M12 13C12 9 9 7 5 7c0 4 3 6 7 6z',
      'M12 13c0-4 3-6 7-6 0 4-3 6-7 6z',
    ],
  },
  toggleOn: { paths: [], rects: [[2, 7, 20, 10, 5]], circles: [[17, 12, 2.6]] },
  toggleOff: { paths: [], rects: [[2, 7, 20, 10, 5]], circles: [[7, 12, 2.6]] },

  /* Appearance: the three choices of theme */
  sun: {
    paths: [
      'M12 2v2', 'M12 20v2', 'M4.93 4.93l1.41 1.41', 'M17.66 17.66l1.41 1.41',
      'M2 12h2', 'M20 12h2', 'M6.34 17.66l-1.41 1.41', 'M19.07 4.93l-1.41 1.41',
    ],
    circles: [[12, 12, 4]],
  },
  moon: { paths: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z'] },
  monitor: { paths: ['M8 21h8', 'M12 17v4'], rects: [[2, 3, 20, 14, 2]] },

  /* Organising the home: the other two chevrons and the grip a section is dragged by */
  chevronUp: { paths: ['m18 15-6-6-6 6'] },
  chevronLeft: { paths: ['m15 6-6 6 6 6'] },
  grip: {
    paths: [],
    circles: [[9, 6, 1.2], [15, 6, 1.2], [9, 12, 1.2], [15, 12, 1.2], [9, 18, 1.2], [15, 18, 1.2]],
  },
  /* The team's public page: where it lives, how to reach the team, what it looks like */
  globe: { paths: ['M2 12h20', 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'], circles: [[12, 12, 10]] },
  mail: { paths: ['m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7'], rects: [[2, 4, 20, 16, 2]] },
  phone: { paths: ['M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z'] },
  instagram: { paths: ['M17.5 6.5h.01'], rects: [[2, 2, 20, 20, 5]], circles: [[12, 12, 4]] },
  youtube: { paths: ['M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17', 'm10 15 5-3-5-3z'] },
  externalLink: { paths: ['M15 3h6v6', 'M10 14 21 3', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'] },
  image: { paths: ['m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21'], rects: [[3, 3, 18, 18, 2]], circles: [[9, 9, 2]] },

  /* People: badges, awards and the history of a person */
  award: { paths: ['m15.48 15.4 1.52 6.6-5-3-5 3 1.52-6.6'], circles: [[12, 9, 6]] },
  badge: { paths: ['M12 2l2.4 2.1 3.1-.4 1 3 3 1-.4 3.1L23 13l-2.1 2.4.4 3.1-3 1-1 3-3.1-.4L12 24l-2.4-2.1-3.1.4-1-3-3-1 .4-3.1L1 13l2.1-2.4-.4-3.1 3-1 1-3 3.1.4z', 'm9 13 2 2 4-4'] },
  history: { paths: ['M3 12a9 9 0 1 0 3-6.7L3 8', 'M3 3v5h5', 'M12 7v5l4 2'] },
  heart: { paths: ['M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'] },
  userCheck: { paths: ['M16 11l2 2 4-4', 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'], circles: [[9, 7, 4]] },
};

const props = defineProps({
  name: { type: String, required: true },
  size: { type: Number, default: 18 },
  stroke: { type: Number, default: 2 },
});

const icon = computed(() => ICONS[props.name] || {});
const paths = computed(() => icon.value.paths || []);
const circles = computed(() => icon.value.circles || []);
const rects = computed(() => icon.value.rects || []);
</script>

<style scoped>
.vc-icon {
  flex: none;
  display: block;
}
</style>
