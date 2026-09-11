<template>
  <div class="vc-chart">
    <p v-if="title" class="vc-chart__title">{{ title }}</p>

    <p v-if="!enough" class="vc-faint vc-chart__empty">
      Ainda não há registros suficientes para desenhar uma curva — dois dias medidos já bastam.
    </p>

    <template v-else>
      <svg class="vc-chart__svg" :viewBox="`0 0 ${VIEW_WIDTH} ${height}`">
        <title v-if="title">{{ title }}</title>

        <g class="vc-chart__grid">
          <template v-for="(line, index) in gridLines" :key="'g' + index">
            <line :x1="PLOT.left" :x2="PLOT.right" :y1="line.y" :y2="line.y" />
            <text class="vc-chart__axis" :x="PLOT.left - 7" :y="line.y"
                  text-anchor="end" dominant-baseline="middle">{{ line.label }}</text>
          </template>
        </g>

        <text v-for="tick in xTicks" :key="'x' + tick.at" class="vc-chart__axis"
              :x="tick.x" :y="height - 8" :text-anchor="tick.anchor">{{ tick.label }}</text>

        <g v-for="curve in curves" :key="curve.key">
          <polyline class="vc-chart__line" :points="curve.line" :style="{ stroke: curve.color }" />
          <!-- The native tooltip: no listener, no library, and it still works for the keyboard user
               who hovers with a magnifier and for whoever prints the page. -->
          <circle v-for="dot in curve.dots" :key="dot.at" class="vc-chart__dot"
                  :cx="dot.x" :cy="dot.y" :r="dotRadius" :style="{ fill: curve.color }">
            <title>{{ dot.hint }}</title>
          </circle>
        </g>
      </svg>

      <ul v-if="curves.length > 1" class="vc-chart__legend">
        <li v-for="curve in curves" :key="curve.key">
          <span class="vc-chart__swatch" :style="{ background: curve.color }"></span>
          {{ curve.label }}
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatDate, parseServer } from '@/services/time.js';

/*
 * A line chart, drawn by hand in SVG.
 *
 * There is no chart library in the dashboard and there is not going to be one: a curve of a handful
 * of points per season does not justify shipping a hundred kilobytes that paints its own colors and
 * ignores the three palettes. So this draws the same way AppIcon.vue does — plain SVG, every color a
 * token, currentColor or an inline `var(--vc-*)` — and stays legible in light, dark and admin.
 *
 * It takes the `series` a /evolution route answers, verbatim. Every series handed to ONE chart has to
 * share a unit: the Y axis is single and comes from the first series, so reliability in percent and
 * points scored belong to two charts side by side, not to two lines of the same one.
 *
 * Why `var()` lives in :style and not in a `stroke=` attribute: an SVG presentation attribute is not
 * parsed as a full CSS declaration and var() does not resolve there — it silently paints black.
 */
const props = defineProps({
  series: { type: Array, default: () => [] },
  title: { type: String, default: '' },
  height: { type: Number, default: 180 },
});

/*
 * The drawing is done in a fixed coordinate system and the browser scales the whole thing to the
 * width of the card, text included. 640 wide keeps that scale near 1.5 on a desktop card and near
 * 0.6 on a phone, which is why the axis font-size is bumped in vernum.css under 720px: the same
 * 10 user units that read as 14px on a laptop would read as 6px on a phone.
 */
const VIEW_WIDTH = 640;
/*
 * The plot box, in those coordinates: left and right and top are absolute, `gutter` is the strip kept
 * free under the plot for the date labels. Left is wide because "100%" has to fit beside the axis even
 * at the larger font-size the phone breakpoint uses.
 */
const PLOT = { left: 50, right: VIEW_WIDTH - 14, top: 14, gutter: 26 };

/* The team is always the purple of the platform; the other lines cycle through four feedback tokens,
 * repeating when a team has more areas than that. Never a hex: each of these is redefined per theme. */
const TEAM_COLOR = 'var(--vc-purple)';
const OTHER_COLORS = [
  'var(--vc-info-text)',
  'var(--vc-success-text)',
  'var(--vc-warning-strong)',
  'var(--vc-danger-text)',
];

/* A series with no point at all is not drawn and not listed: an empty legend entry explains nothing. */
const drawn = computed(() =>
  (props.series || []).filter((one) => (one.points || []).length > 0),
);

/*
 * Two points are the smallest thing that is a curve. One measured day is a fact, not a trend, and
 * drawing an axis around it would dress it up as one — so the chart says so in words instead.
 */
const enough = computed(() => drawn.value.some((one) => one.points.length >= 2));

const unit = computed(() => drawn.value[0]?.unit || '');

/* Every distinct day of every series, ascending: the X axis is shared, the series are not. */
const days = computed(() => {
  const all = new Set();
  for (const one of drawn.value) {
    for (const point of one.points) {
      const at = timeOf(point.date);
      if (at !== null) all.add(at);
    }
  }
  return [...all].sort((first, second) => first - second);
});

/*
 * The ceiling of the Y axis. A series that knows its own ceiling keeps it — a reliability that never
 * passed 40% still has to be drawn against 100, or the chart congratulates the team for the shape of
 * its own scaling. Only a series with no natural ceiling (points scored) is measured against itself.
 */
const yMax = computed(() => {
  const first = drawn.value[0];
  if (first && first.maxValue) return first.maxValue;
  let top = 0;
  for (const one of drawn.value) {
    for (const point of one.points) {
      if (typeof point.value === 'number' && point.value > top) top = point.value;
    }
  }
  return niceCeiling(top);
});

const gridLines = computed(() => {
  const max = yMax.value;
  return [max, max / 2, 0].map((value, index) => ({
    y: yFor(value),
    //Only the top line carries the unit: three per cent signs on three numbers is noise, one is a caption
    label: formatValue(value) + (index === 0 ? unitSuffix() : ''),
  }));
});

/* First, middle and last day only. A label under every point turns the axis into a smudge. */
const xTicks = computed(() => {
  const all = days.value;
  if (!all.length) return [];
  const picks = [...new Set([0, Math.floor((all.length - 1) / 2), all.length - 1])];
  return picks.map((index, position) => ({
    at: all[index],
    x: xFor(all[index]),
    label: shortDay(all[index]),
    anchor: picks.length === 1 || (position > 0 && position < picks.length - 1)
      ? 'middle'
      : position === 0 ? 'start' : 'end',
  }));
});

const curves = computed(() =>
  drawn.value.map((one, index) => {
    const dots = one.points
      .map((point) => {
        const at = timeOf(point.date);
        if (at === null || typeof point.value !== 'number') return null;
        return {
          at,
          x: xFor(at),
          y: yFor(point.value),
          hint: hintOf(point),
        };
      })
      .filter(Boolean);
    return {
      key: one.key || 'serie' + index,
      label: one.label || one.key,
      color: index === 0 ? TEAM_COLOR : OTHER_COLORS[(index - 1) % OTHER_COLORS.length],
      dots,
      line: dots.map((dot) => `${round(dot.x)},${round(dot.y)}`).join(' '),
    };
  }),
);

/* A season measured every week draws a readable dot; one measured every day draws a string of beads,
 * so the beads get smaller instead of merging into a fat line. */
const dotRadius = computed(() => (days.value.length > 40 ? 1.8 : 2.6));

function xFor(at) {
  const all = days.value;
  const first = all[0];
  const last = all[all.length - 1];
  const span = last - first;
  const width = PLOT.right - PLOT.left;
  //Everything on one day (or one point) sits in the middle instead of dividing by zero
  return span > 0 ? PLOT.left + ((at - first) / span) * width : PLOT.left + width / 2;
}

function yFor(value) {
  const floor = props.height - PLOT.gutter;
  const max = yMax.value;
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  return floor - ratio * (floor - PLOT.top);
}

/* 1, 2, 2.5, 5 or 10 times a power of ten: an axis that ends at 137 tells nobody anything. */
function niceCeiling(value) {
  if (!(value > 0)) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (step * magnitude >= value) return step * magnitude;
  }
  return 10 * magnitude;
}

function timeOf(date) {
  const parsed = parseServer(date);
  return parsed ? parsed.getTime() : null;
}

function shortDay(at) {
  return new Date(at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function unitSuffix() {
  return unit.value === '%' ? '%' : '';
}

function formatValue(value) {
  return Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

function round(value) {
  return Math.round(value * 10) / 10;
}

/* "11/09/2026 — 82% (3 registros)": the date in full, and out of how many rows the point was made. */
function hintOf(point) {
  const head = `${formatDate(point.date)} — ${formatValue(point.value)}${unitSuffix()}`;
  if (!point.sample) return head;
  return `${head} (${point.sample} ${point.sample === 1 ? 'registro' : 'registros'})`;
}
</script>
