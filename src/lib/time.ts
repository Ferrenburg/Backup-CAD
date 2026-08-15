import { toZonedTime, fromZonedTime, format as formatTz } from "date-fns-tz";

export const AGENCY_TIME_ZONE = "America/Chicago";

export interface ParsedManualTime {
  iso: string;
  rolledOverToNextDay: boolean;
}

/**
 * Parse a manually-typed 24-hour clock time (`HHMM` or `HH:MM`) against an
 * anchor instant (almost always the call's `received_at`). Combines the
 * typed clock time with the anchor's calendar date in the agency time zone.
 *
 * Midnight rollover (§7.3): if the typed clock time is earlier than the
 * anchor's clock time, the entry is assumed to be the next calendar day —
 * this is how a call received at 23:50 can be cleared at 00:15 without the
 * dispatcher having to think about the date.
 */
export function parseManualTime(input: string, anchorIso: string): ParsedManualTime | null {
  const digits = input.replace(/[^0-9]/g, "");
  if (digits.length !== 3 && digits.length !== 4) return null;

  const padded = digits.length === 3 ? "0" + digits : digits;
  const hours = Number(padded.slice(0, 2));
  const minutes = Number(padded.slice(2, 4));
  if (hours > 23 || minutes > 59) return null;

  const anchor = new Date(anchorIso);
  if (Number.isNaN(anchor.getTime())) return null;

  const zonedAnchor = toZonedTime(anchor, AGENCY_TIME_ZONE);
  const anchorMinutes = zonedAnchor.getHours() * 60 + zonedAnchor.getMinutes();
  const enteredMinutes = hours * 60 + minutes;

  const rolledOverToNextDay = enteredMinutes < anchorMinutes;
  const dayOffset = rolledOverToNextDay ? 1 : 0;

  const y = zonedAnchor.getFullYear();
  const m = zonedAnchor.getMonth();
  const d = zonedAnchor.getDate() + dayOffset;

  // Build the target date components in the agency zone, then convert to a
  // real UTC instant.
  const zonedTarget = new Date(y, m, d, hours, minutes, 0, 0);
  const utcInstant = fromZonedTime(zonedTarget, AGENCY_TIME_ZONE);

  return { iso: utcInstant.toISOString(), rolledOverToNextDay };
}

/** Resolved calendar date (agency zone) for display next to a time field. */
export function resolvedDateLabel(iso: string): string {
  const zoned = toZonedTime(new Date(iso), AGENCY_TIME_ZONE);
  return formatTz(zoned, "EEE MMM d", { timeZone: AGENCY_TIME_ZONE });
}

/** HH:MM display in the agency time zone, monospace-friendly. */
export function formatClock(iso: string | null): string {
  if (!iso) return "—";
  const zoned = toZonedTime(new Date(iso), AGENCY_TIME_ZONE);
  return formatTz(zoned, "HH:mm", { timeZone: AGENCY_TIME_ZONE });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const zoned = toZonedTime(new Date(iso), AGENCY_TIME_ZONE);
  return formatTz(zoned, "MM/dd/yyyy HH:mm", { timeZone: AGENCY_TIME_ZONE });
}

/** Seconds between two ISO instants, or null if either is missing. */
export function diffSeconds(fromIso: string | null, toIso: string | null): number | null {
  if (!fromIso || !toIso) return null;
  const seconds = (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 1000;
  return Math.round(seconds);
}

/** Live elapsed-time display, largest text in a call row (§8). */
export function formatElapsed(fromIso: string, nowMs: number = Date.now()): string {
  const totalSeconds = Math.max(0, Math.floor((nowMs - new Date(fromIso).getTime()) / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export interface CallDurations {
  dispatchDelaySeconds: number | null;
  responseSeconds: number | null;
  totalSeconds: number | null;
}

/**
 * Computed at read/export time, never stored (§4.3) — corrections would
 * otherwise go stale.
 *  - dispatch delay: received -> dispatched
 *  - response: received -> first on scene
 *  - total call time: received -> last cleared
 */
export function computeCallDurations(call: {
  received_at: string;
  dispatched_at: string | null;
  first_on_scene_at: string | null;
  last_cleared_at: string | null;
}): CallDurations {
  return {
    dispatchDelaySeconds: diffSeconds(call.received_at, call.dispatched_at),
    responseSeconds: diffSeconds(call.received_at, call.first_on_scene_at),
    totalSeconds: diffSeconds(call.received_at, call.last_cleared_at),
  };
}
