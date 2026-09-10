/*
 * Every date the dashboard reads from the server or writes back to it.
 *
 * Why it exists: the server used to run in UTC and answer a bare LocalDateTime — "2026-09-09T22:01:10.548",
 * an hour with no zone at all. The browser read that as its own wall clock, so the television in the
 * room showed a clock three hours ahead of the room it was hanging in. The server now glues the
 * offset of the platform to every timestamp ("…-03:00"), which makes the instant unambiguous and
 * `new Date(value)` correct on any machine — but only for whoever hands the whole string over.
 * Screens that cut it apart to drop the fractional digits (`slice(0, 19)`) threw the offset away and
 * brought the same three hours straight back. So the parsing lives here, once, and the screens ask.
 *
 * Everything below shows in the timezone OF THE COMPUTER reading the screen, and everything typed
 * into a form leaves carrying that computer's offset — an hour typed in UTC-5 reaches the server as
 * that hour in UTC-5, not as an hour in Brasília. When the computer is not on UTC-3 the screens say
 * so out loud with `zoneNotice()`, because an hour is worth nothing without the zone it was read in.
 *
 * The trap, and everybody falls into it: Date.prototype.getTimezoneOffset() is INVERTED — a browser
 * in UTC-3 answers +180, not -180. `viewerOffsetMin()` negates it once so nothing else has to
 * remember; compare against PLATFORM_OFFSET_MIN only after that.
 */

/** The zone the platform keeps its hours in — the same default the server pins with VERNUM_TZ. */
export const PLATFORM_ZONE = 'America/Sao_Paulo';

/*
 * UTC-3, and only as the threshold of the notice: "is this computer on the hour of the team?".
 * Nothing converts with this number — `toPlatformValue` asks Intl for the zone itself, so a date
 * from before 2019 (when Brazil still moved its clocks) is not shifted by the hour of today.
 */
export const PLATFORM_OFFSET_MIN = -180;

/** Minutes east of UTC of the computer looking at the screen: -180 in Brasília. Sign already fixed. */
export function viewerOffsetMin() {
  return -new Date().getTimezoneOffset();
}

/** "America/New_York", or an empty string on a browser that will not name its zone. */
export function viewerZoneName() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch (error) {
    return '';
  }
}

export function isPlatformZone() {
  return viewerOffsetMin() === PLATFORM_OFFSET_MIN;
}

/*
 * The one sentence the screens share when the computer is not on UTC-3, so the wall, the register
 * and the wall administration cannot drift apart. Empty when there is nothing to warn about, which
 * is also what hides the notice.
 */
export function zoneNotice() {
  if (isPlatformZone()) return '';
  const zone = viewerZoneName();
  return zone ? `no fuso deste computador (${zone})` : 'no fuso deste computador';
}

/*
 * A timestamp from the API into a Date, whatever shape it arrives in:
 *
 *   "2026-09-09T22:01:10.548-03:00"  the instant it says
 *   "2026-09-09T05:58:00Z"           the same, in another zone
 *   "2026-09-09T22:01:10.548"        legacy, with no zone: the browser's own hour, which is what
 *                                    `new Date` already does and the least surprising reading
 *   "2026-09-09"                     a LocalDate, anchored at midday so no zone can push it a day
 *
 * Returns null for anything empty or unreadable, so a caller can print its own dash.
 */
export function parseServer(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const text = String(value).trim();
  if (!text) return null;
  //A LocalDate alone is read as UTC midnight, which is the day before in Brasília
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? `${text}T12:00:00`
    //Java writes six fractional digits and older browsers only take three
    : text.replace(/(\.\d{3})\d+/, '$1');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

/*
 * The three formatters. `options` REPLACES the default rather than merging into it, because Intl
 * refuses dateStyle and day/month in the same call.
 */
export function formatDateTime(value, options) {
  const date = parseServer(value);
  if (!date) return '';
  return date.toLocaleString('pt-BR', options || { dateStyle: 'short', timeStyle: 'short' });
}

export function formatDate(value, options) {
  const date = parseServer(value);
  if (!date) return '';
  return date.toLocaleDateString('pt-BR', options || { dateStyle: 'short' });
}

export function formatTime(value, options) {
  const date = parseServer(value);
  if (!date) return '';
  return date.toLocaleTimeString('pt-BR', options || { hour: '2-digit', minute: '2-digit' });
}

/*
 * "agora", "há 3 min", "há 2 h", "ontem", "há 4 d", and a plain date once it is a week old. A
 * timestamp in the future is a clock out of step, not something to print, so it reads "agora".
 */
export function formatAgo(value, reference) {
  const date = parseServer(value);
  if (!date) return '';
  const now = reference === undefined ? Date.now() : reference;
  const seconds = Math.max(0, Math.round((now - date.getTime()) / 1000));
  if (seconds < 60) return 'agora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ontem';
  if (days < 7) return `há ${days} d`;
  return formatDate(date);
}

function pad(value) {
  return String(value).padStart(2, '0');
}

/*
 * "YYYY-MM-DDTHH:mm" for an <input type="datetime-local">, in the hour of this computer.
 * Never toISOString() for this: it answers UTC, and the field then shows the wrong hour.
 */
export function toInputValue(value) {
  const date = parseServer(value);
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "YYYY-MM-DD" for an <input type="date">, in the day of this computer. Same reason. */
export function toDateInputValue(value) {
  const date = parseServer(value);
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/*
 * The other way: what a datetime-local holds becomes an ISO instant carrying THIS computer's
 * offset, so "18:00" typed in UTC-5 reaches the server as 18:00 of UTC-5 and not of Brasília. The
 * offset is taken from the date itself, not from today, so a value on the other side of a daylight
 * change is still the hour that was typed.
 */
export function fromInputValue(value) {
  if (!value) return null;
  const date = new Date(value); //A datetime-local has no zone, so this is already the local hour
  if (Number.isNaN(date.getTime())) return null;
  const offset = -date.getTimezoneOffset();
  const sign = offset < 0 ? '-' : '+';
  const abs = Math.abs(offset);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    + `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/*
 * The same instant, spelled as the wall clock of the PLATFORM and with no zone on it:
 * "YYYY-MM-DDTHH:mm:ss". Only for the endpoints that read a bare LocalDateTime straight out of the
 * query string — `POST /attendance/{id}/close?endTime=` is the one — where the tolerant reader of
 * the request bodies never runs and an offset would be a parse error. An hour typed in UTC-5 still
 * lands on the right instant, written the way that endpoint can read it.
 *
 * The zone does the conversion, not a fixed three hours: Brazil only stopped moving its clocks in
 * 2019, and subtracting today's offset from a date older than that lands an hour off.
 */
const platformClock = (() => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: PLATFORM_ZONE,
      hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch (error) {
    return null; //A browser without that zone in its database falls back to the fixed offset below
  }
})();

export function toPlatformValue(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (platformClock) {
    const part = {};
    for (const piece of platformClock.formatToParts(date)) part[piece.type] = piece.value;
    //An engine still on the old hour12:false writes midnight as "24" of the right day
    const hour = part.hour === '24' ? '00' : part.hour;
    return `${part.year}-${part.month}-${part.day}T${hour}:${part.minute}:${part.second}`;
  }
  const wall = new Date(date.getTime() + PLATFORM_OFFSET_MIN * 60000);
  return `${wall.getUTCFullYear()}-${pad(wall.getUTCMonth() + 1)}-${pad(wall.getUTCDate())}`
    + `T${pad(wall.getUTCHours())}:${pad(wall.getUTCMinutes())}:${pad(wall.getUTCSeconds())}`;
}
