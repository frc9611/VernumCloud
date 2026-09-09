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

/** Short team label: "CyberRain #9611" or just the name. */
export function teamLabel(name, teamNumber) {
  return teamNumber ? `${name} #${teamNumber}` : name || '';
}

function sortedYears(affiliations) {
  const years = [];
  for (const item of affiliations) {
    const start = yearOf(item.startDate);
    const end = yearOf(item.endDate);
    if (start) years.push(start);
    if (end) years.push(end);
  }
  return years.sort((a, b) => a - b);
}

/**
 * The chips under the name. The first one is the headline; the rest add context (divisions, the
 * platform role). Returns [{ text, icon?, accent? }].
 */
export function headlineChips(profile) {
  const chips = [];
  const memberships = profile.memberships || [];
  const first = memberships[0];
  const more = memberships.length > 1 ? ` (+${memberships.length - 1})` : '';

  switch (profile.kind) {
    case 'MENTOR': {
      const role = first.role === 'COACH' ? 'Técnico(a)' : first.roleLabel;
      chips.push({ text: `${role} · ${first.tenantName}${more}`, accent: true });
      break;
    }
    case 'STUDENT': {
      chips.push({ text: `${first.roleLabel} · ${first.tenantName}${more}`, accent: true });
      for (const division of first.divisions || []) {
        chips.push({
          text: division.position ? `${division.divisionVisibleName} · ${division.position}` : division.divisionVisibleName,
          icon: division.leader ? 'shield' : '',
        });
      }
      break;
    }
    case 'ALUMNI': {
      const years = sortedYears(profile.affiliations || []);
      const range = years.length ? (years[0] === years[years.length - 1] ? String(years[0]) : `${years[0]} – ${years[years.length - 1]}`) : '';
      chips.push({ text: range ? `Alumni · ${range}` : 'Alumni', accent: true, icon: 'history' });
      const last = (profile.affiliations || [])[0];
      if (last) chips.push({ text: teamLabel(last.teamName, last.teamNumber) });
      break;
    }
    default:
      if (!profile.platformAdmin) chips.push({ text: profile.kindLabel || 'Recém-chegado', accent: true });
  }

  if (profile.platformAdmin) {
    chips.push({ text: 'Administrador da plataforma', icon: 'shield', accent: profile.kind === 'NEWCOMER' });
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
