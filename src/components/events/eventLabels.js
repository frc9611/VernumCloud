/*
 * Vocabulary and date helpers shared by the events screen and its panels.
 *
 * The server answers `kindLabel` and `scopeLabel` on every DTO; these maps exist for the forms,
 * where a value has to be shown before it was ever sent.
 */

export const EVENT_KINDS = [
  { value: 'COMPETITION', label: 'Competição' },
  { value: 'WORKSHOP', label: 'Oficina' },
  { value: 'OUTREACH', label: 'Ação social' },
  { value: 'OTHER', label: 'Outro' },
];

export const AWARD_SCOPES = [
  { value: 'TEAM', label: 'Equipe', hint: 'todo mundo que foi ao evento recebe, inclusive quem for adicionado depois' },
  { value: 'INDIVIDUAL', label: 'Individual', hint: 'só as pessoas escolhidas entre os participantes' },
];

export function kindLabel(kind) {
  return EVENT_KINDS.find((item) => item.value === kind)?.label || 'Outro';
}

/** The chip flavour of an event kind: competitions carry the team colour, the rest a soft tone. */
export function kindChip(kind) {
  if (kind === 'COMPETITION') return 'vc-chip--purple';
  if (kind === 'WORKSHOP') return 'vc-chip--info';
  if (kind === 'OUTREACH') return 'vc-chip--success';
  return '';
}

/**
 * dd/mm/yyyy from the yyyy-MM-dd the server sends. Split by hand: `new Date('2026-09-09')` is
 * midnight UTC, which in São Paulo is still the day before.
 */
export function formatDate(value) {
  if (!value) return '';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  if (!year || !month || !day) return String(value);
  return `${day}/${month}/${year}`;
}

/** "09/09/2026" for a one-day event, "09/09/2026 – 12/09/2026" otherwise. */
export function formatRange(startDate, endDate) {
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  if (!end || end === start) return start;
  return `${start} – ${end}`;
}

/** Today as yyyy-MM-dd in the browser's own calendar, for the default of a new event. */
export function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
