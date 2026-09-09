/*
 * Words and colours the profile page derives from a PersonProfileDto.
 *
 * The server tells the facts (memberships, affiliations, badges, `kind`); what to say about them
 * in the header — "Técnico(a) · CyberRain (+2)", "Alumni 2021 – 2024" — is decided here, in one
 * place, so the header, the strip and the timeline agree. `kind` is emphasis, never a fact: a
 * person can be a mentor in one team and a student in another, and the Teams section shows the
 * cargo per team regardless of what the chip says.
 */

/** Icon used when a badge carries none, by kind. */
export const BADGE_ICON_BY_KIND = {
  EVENT: 'calendar',
  AWARD_TEAM: 'award',
  AWARD_INDIVIDUAL: 'award',
  ALUMNI: 'history',
  CUSTOM: 'badge',
};

/** The order the badge groups are shown in: what was won first, what was attended next. */
export const BADGE_KIND_ORDER = ['AWARD_INDIVIDUAL', 'AWARD_TEAM', 'EVENT', 'ALUMNI', 'CUSTOM'];

/** Icons somebody may pick for a badge granted by hand. All exist in AppIcon. */
export const BADGE_ICON_CHOICES = [
  { value: 'badge', label: 'Selo' },
  { value: 'award', label: 'Medalha' },
  { value: 'star', label: 'Estrela' },
  { value: 'heart', label: 'Coração' },
  { value: 'history', label: 'História' },
  { value: 'calendar', label: 'Calendário' },
  { value: 'shield', label: 'Escudo' },
  { value: 'target', label: 'Alvo' },
  { value: 'flag', label: 'Bandeira' },
  { value: 'seedling', label: 'Broto' },
  { value: 'users', label: 'Pessoas' },
  { value: 'globe', label: 'Globo' },
];

/** The decorative treatments a hand-granted badge may wear, for the ones meant to stand out more. */
export const BADGE_FRAME_CHOICES = [
  { value: 'NONE', label: 'Sem moldura' },
  { value: 'RING', label: 'Anel' },
  { value: 'RIBBON', label: 'Fita' },
  { value: 'GLOW', label: 'Brilho' },
  { value: 'STARBURST', label: 'Estrela' },
];

/** The sections of a profile, in the default order — badges first, so what somebody achieved leads. */
export const SECTION_DEFAULT_ORDER = ['badges', 'teams', 'history', 'events'];

export const SECTION_LABELS = {
  badges: 'Badges',
  teams: 'Equipes',
  history: 'História',
  events: 'Eventos',
};

/**
 * Resolves whatever the server sent for `sectionOrder` into the four known keys, in order — a stale
 * cache or an older server that omits the field falls back to the default instead of showing nothing.
 */
export function resolveSectionOrder(order) {
  const known = (order || []).filter((key) => SECTION_LABELS[key]);
  const missing = SECTION_DEFAULT_ORDER.filter((key) => !known.includes(key));
  return [...known, ...missing];
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Parses "YYYY-MM-DD" or an ISO datetime without letting the timezone move the day. */
function parts(value) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function formatDate(value) {
  const date = parts(value);
  if (!date) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.day)}/${pad(date.month)}/${date.year}`;
}

export function formatMonthYear(value) {
  const date = parts(value);
  if (!date) return '';
  return `${MONTHS[date.month - 1]}/${date.year}`;
}

export function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function yearOf(value) {
  const date = parts(value);
  return date ? date.year : null;
}

/** "mar/2023 – jun/2024", "mar/2023 – hoje", "2024" or "" — whatever the two dates allow. */
export function formatRange(start, end, openEnded = false) {
  const from = formatMonthYear(start);
  const to = formatMonthYear(end);
  if (from && to) return from === to ? from : `${from} – ${to}`;
  if (from) return openEnded ? `${from} – hoje` : `desde ${from}`;
  if (to) return `até ${to}`;
  return '';
}

/** One-day events read as a date, longer ones as a span. */
export function formatEventDates(startDate, endDate) {
  if (!endDate || endDate === startDate) return formatDate(startDate);
  return `${formatDate(startDate)} – ${formatDate(endDate)}`;
}

export function badgeIcon(badge) {
  return badge.icon || BADGE_ICON_BY_KIND[badge.kind] || 'badge';
}

/** The `vc-badge-frame--*` class for a badge's decoration, or '' for the plain circle ("NONE"). */
export function badgeFrameClass(badge) {
  const frame = badge.frame;
  return frame && frame !== 'NONE' ? `vc-badge-frame--${frame.toLowerCase()}` : '';
}

/**
 * The colour a badge is painted with: its own, else the colour of the team that issued it, else the
 * accent of the page. `teamColorOf(tenantId)` is given by the caller because only the profile knows
 * every team on the page.
 */
export function badgeColor(badge, teamColorOf) {
  if (badge.color) return badge.color;
  const teamColor = badge.tenantId && teamColorOf ? teamColorOf(badge.tenantId) : null;
  return teamColor || 'var(--vc-purple)';
}

/** The card's background: the badge's own choice, else a soft glow mixed from its color. */
export function badgeBackground(badge, resolvedColor) {
  if (badge.backgroundColor) return badge.backgroundColor;
  return `color-mix(in srgb, ${resolvedColor} 14%, var(--vc-surface))`;
}

/** The colour the header banner is tinted with: the first team's, or the default accent with nobody. */
export function profileAccent(profile) {
  const first = (profile.memberships || [])[0];
  return (first && first.color) || 'var(--vc-purple)';
}

/** Short team label: "CyberRain #9611" or just the name. */
export function teamLabel(name, teamNumber) {
  return teamNumber ? `${name} #${teamNumber}` : name || '';
}

/**
 * The one word (or two) that says what somebody is *in* a team: the division they lead if they lead
 * one, else the position they hold in a division if they have one ("Projetista"), else the plain
 * cargo of the membership ("Membro", "Proprietário", "Técnico(a)" for a COACH).
 */
export function membershipLabel(membership) {
  const divisions = membership.divisions || [];
  const leading = divisions.find((division) => division.leader);
  if (leading) return `Líder de ${leading.divisionVisibleName}`;
  const withPosition = divisions.find((division) => division.position);
  if (withPosition) return withPosition.position;
  return membership.role === 'COACH' ? 'Técnico(a)' : membership.roleLabel;
}

/**
 * The chips under the name: one per team the person is in, plus one per Alumni badge, plus the
 * platform administrator flag — every one of them its own item, in the team's own colour, and they
 * accumulate freely. Nothing here is ever collapsed into a "(+N)": somebody in six teams gets six
 * chips, wrapping onto as many lines as it takes, because that is exactly the six things the person
 * wants seen. Returns [{ text, color?, icon?, accent? }].
 *
 * `memberships` is only what THIS viewer may be told — a person who hid every team leaves it empty
 * for a stranger even though `kind` still correctly says MENTOR or STUDENT — so with nothing to show
 * at all the line falls back to the bare `kindLabel`.
 */
export function headlineChips(profile) {
  const chips = [];
  for (const membership of profile.memberships || []) {
    chips.push({ text: `${membershipLabel(membership)} • ${membership.tenantName}`, color: membership.color, accent: true });
  }
  for (const badge of profile.badges || []) {
    if (badge.kind !== 'ALUMNI') continue;
    chips.push({
      text: badge.issuerName ? `Alumni • ${badge.issuerName}` : 'Alumni',
      color: badge.color,
      icon: 'history',
    });
  }
  if (profile.platformAdmin) {
    chips.push({ text: 'Administrador da plataforma', icon: 'shield', accent: true });
  }
  if (!chips.length) {
    chips.push({ text: profile.kindLabel || 'Recém-chegado', accent: true });
  }
  return chips;
}

/** What the highlight line says while the person has not written their own. */
export function defaultHighlight(profile) {
  const memberships = profile.memberships || [];
  const oldest = memberships
    .map((membership) => yearOf(membership.joinedAt))
    .filter(Boolean)
    .sort((a, b) => a - b)[0];

  switch (profile.kind) {
    case 'MENTOR': {
      const coach = memberships.some((membership) => membership.role === 'COACH');
      if (coach) return oldest ? `Técnico desde ${oldest}` : 'Técnico';
      return oldest ? `Conduz a equipe desde ${oldest}` : 'Conduz a equipe';
    }
    case 'STUDENT': {
      const withPosition = memberships.flatMap((membership) => membership.divisions || []).find((division) => division.position);
      if (withPosition) return `${withPosition.position} · ${withPosition.divisionVisibleName}`;
      return oldest ? `Membro desde ${oldest}` : 'Membro';
    }
    case 'ALUMNI': {
      const last = (profile.affiliations || [])[0];
      return last ? `Alumni de ${last.teamName}` : 'Alumni';
    }
    default:
      return profile.platformAdmin ? 'Administra a plataforma' : '';
  }
}
