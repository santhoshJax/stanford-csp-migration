// ── Date ──────────────────────────────────────────────────────────────────────

export function parseCourseDate(v: string | undefined | null): string | null {
  const s = (v ?? "").trim();
  if (!s || s === "00/00/0000" || s === "00/00/00") return null;
  const parts = s.split("/");
  if (parts.length !== 3) return null;
  const [m, d, y] = parts;
  const year = y.length === 2 ? "20" + y : y;
  const iso = `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  if (isNaN(Date.parse(iso))) return null;
  return iso + "T00:00:00.000Z";
}

// ── Duration ─────────────────────────────────────────────────────────────────

export function parseDuration(v: string | undefined | null): number | null {
  if (!v?.trim()) return null;
  const s = v.trim();
  const weekMatch = s.match(/(\d+\.?\d*)\s*week/i);
  if (weekMatch) return parseFloat(weekMatch[1]);
  if (/1\s*day/i.test(s)) return 0.14;
  const dayMatch = s.match(/(\d+)\s*day/i);
  if (dayMatch) return Math.round((parseInt(dayMatch[1], 10) / 7) * 100) / 100;
  return null;
}

// Parses "2 days" / "5 weeks" / "1 day" etc. into split value + unit for
// Duration_Value__c (Number) and Duration_Unit__c (Picklist: Days, Weeks).
export function parseDurationSplit(
  v: string | undefined | null,
): { value: number; unit: "Days" | "Weeks" } | null {
  if (!v?.trim()) return null;
  const s = v.trim();
  const weekMatch = s.match(/(\d+\.?\d*)\s*week/i);
  if (weekMatch) return { value: parseFloat(weekMatch[1]), unit: "Weeks" };
  const dayMatch = s.match(/(\d+\.?\d*)\s*day/i);
  if (dayMatch) return { value: parseFloat(dayMatch[1]), unit: "Days" };
  return null;
}

// ── Enrollment status ─────────────────────────────────────────────────────────

export function normaliseEnrollmentStatus(
  raw: string | undefined | null,
  cancelled: boolean,
): string {
  if (cancelled) return "Cancelled";
  const map: Record<string, string> = {
    open: "Open",
    pending: "Pending",
    closedweb: "ClosedWeb",
    closed: "Closed",
    cancelled: "Cancelled",
    full: "Full",
    true: "Open",
    false: "Closed",
    "1": "Open",
    "0": "Closed",
  };
  return map[(raw ?? "").toLowerCase().trim()] ?? "Closed";
}

// ── Catalog notes ─────────────────────────────────────────────────────────────

/**
 * Clean catalog notes for a Salesforce Rich Text Area field.
 * Replaces _4DNL_ tokens with newlines. HTML tags (<br>, <b>, <i>, etc.)
 * are preserved as-is since the target field is Rich Text Area.
 */
export function normaliseCatalogNotes(v: string | undefined | null): string | null {
  if (!v?.trim()) return null;
  return v.replace(/_4DNL_/g, "\n").trim();
}

/**
 * Strip HTML tags and cap the result to a max length, for plain Text fields
 * (unlike normaliseCatalogNotes above, which deliberately keeps HTML since
 * its targets are Rich Text Area fields). Some source titles contain inline
 * formatting tags (e.g. <span style="font-style:italic">) that push an
 * otherwise-short title past a 255-char Text field limit — stripping the
 * tags removes that bloat; the length cap is a safety net for any title
 * still too long after stripping.
 */
export function stripHtmlForTextField(
  v: string | undefined | null,
  maxLength = 255,
): string {
  const s = (v ?? "").replace(/<[^>]*>/g, "").trim();
  return s.slice(0, maxLength);
}

// ── Notes merge ───────────────────────────────────────────────────────────────

export function mergeNotes(
  a: string | undefined | null,
  b: string | undefined | null,
): string | null {
  const parts = [a, b]
    .map((s) => s?.trim())
    .filter((s): s is string => Boolean(s));
  return parts.length > 0 ? parts.join(" | ") : null;
}

// ── Boolean ───────────────────────────────────────────────────────────────────

export function parseBool(v: string | undefined | null): boolean | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).trim().toLowerCase();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return null;
}

// ── Roster email ──────────────────────────────────────────────────────────────

export function normaliseRosterEmail(v: string | undefined | null): string | null {
  if (!v?.trim()) return null;
  const s = v.trim();
  if (s === "FALSE" || s === "0") return null;
  return s;
}

// ── Closed_DTS ────────────────────────────────────────────────────────────────

export function parseClosedDTS(v: unknown): string | null {
  if (v === null || v === undefined || v === "" || v === "0" || v === 0)
    return null;
  if (typeof v === "number") return Math.round(v).toString();
  const s = String(v).trim();
  if (/e\+/i.test(s)) return Math.round(parseFloat(s)).toString();
  return s === "0" ? null : s;
}

// ── Format ────────────────────────────────────────────────────────────────────

export function normaliseFormat(
  format: string | undefined | null,
  hybrid: string | undefined | null,
): string | null {
  // Hybrid column: boolean true or text "Large Hybrid"/"Small Hybrid" → Flex Hybrid
  const h = (hybrid ?? "").trim().toLowerCase();
  if (parseBool(hybrid) === true || h === "large hybrid" || h === "small hybrid")
    return "Flex Hybrid";
  if (!format?.trim()) return null;
  const map: Record<string, string> = {
    "on campus": "On-campus",
    "on-campus course": "On-campus",
    "on-campus": "On-campus",
    "off-campus": "Off-campus",
    online: "Online",
    "online course": "Online",
    "flex online": "Flex Online",
    "flex hybrid": "Flex Hybrid",
    "live online": "Live Online",
  };
  // Org picklist: On-campus, Online, Flex Online, Flex Hybrid, Live Online,
  // Off-campus, Hybrid. Unmapped/junk source text must not be written raw.
  return map[format.trim().toLowerCase()] ?? null;
}

/**
 * Derive Format__c from the section suffix when the Format column is empty.
 * W = Flex Online, H = On-campus, Z = Live Online
 * A/B/C/D/E and others = parallel sections only, no format implied.
 */
export function formatFromSuffix(suffix: string | null): string | null {
  if (!suffix) return null;
  const s = suffix.toUpperCase();
  if (s === "W") return "Flex Online";
  if (s === "H") return "On-campus";
  if (s === "Z") return "Live Online";
  return null;
}

// ── Weekdays ──────────────────────────────────────────────────────────────────

export function parseWeekdays(s: string | undefined | null): Record<string, boolean> {
  const flags: Record<string, boolean> = {
    IsMonday: false,
    IsTuesday: false,
    IsWednesday: false,
    IsThursday: false,
    IsFriday: false,
    IsSaturday: false,
    IsSunday: false,
  };
  if (!s?.trim()) return flags;
  const parts = s
    .toLowerCase()
    .split(/[,/\s&]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  for (const part of parts) {
    if (part.startsWith("mon")) flags.IsMonday = true;
    if (part.startsWith("tue")) flags.IsTuesday = true;
    if (part.startsWith("wed")) flags.IsWednesday = true;
    if (part.startsWith("thu")) flags.IsThursday = true;
    if (part.startsWith("fri")) flags.IsFriday = true;
    if (part.startsWith("sat")) flags.IsSaturday = true;
    if (part.startsWith("sun")) flags.IsSunday = true;
  }
  return flags;
}

// ── Course time ───────────────────────────────────────────────────────────────

function normalizeTimeStr(t: string): string {
  return t
    .replace(/[–—]/g, "-")                     // em/en dash → hyphen
    .replace(/\b([ap])\.?m\.?\b/gi, "$1m")     // a.m. / p.m. / a.m → am/pm
    .trim();
}

function parseTime12h(t: string): string | null {
  let s = normalizeTimeStr(t).toLowerCase();
  if (s === "noon") return "12:00:00";
  // Expand shorthand "8 am" → "8:00 am"
  s = s.replace(/^(\d{1,2})\s*(am|pm)$/, "$1:00 $2");
  const m = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = m[3];
  if (ampm === "pm" && h !== 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${min}:00`;
}

export function parseCourseTime(s: string | undefined | null): {
  startTime: string | null;
  endTime: string | null;
} {
  if (!s?.trim()) return { startTime: null, endTime: null };

  const norm = normalizeTimeStr(s);

  // Split into start/end parts
  let startRaw: string;
  let endRaw: string;

  if (norm.includes(" - ")) {
    const parts = norm.split(" - ");
    startRaw = parts[0].trim();
    endRaw = parts[1]?.trim() ?? "";
  } else {
    // Handle no-space hyphen like "10:15-1:00 pm"
    const m = norm.match(/^(\d{1,2}:\d{2}(?:\s*(?:am|pm))?)\s*-\s*(\d{1,2}:\d{2}.*)$/i);
    if (m) {
      startRaw = m[1].trim();
      endRaw = m[2].trim();
    } else {
      startRaw = norm;
      endRaw = "";
    }
  }

  // If start has no am/pm but end does, infer it
  if (!/\b(am|pm)\b/i.test(startRaw) && endRaw) {
    const endAmPmMatch = endRaw.match(/\b(am|pm)\b/i);
    if (endAmPmMatch) {
      const endAmPm = endAmPmMatch[1];
      const candidate = `${startRaw} ${endAmPm}`;
      const tryStart = parseTime12h(candidate);
      const tryEnd = parseTime12h(endRaw);
      if (tryStart && tryEnd && tryStart <= tryEnd) {
        startRaw = candidate;
      } else {
        // Start is earlier in the day than end — use opposite am/pm
        startRaw = `${startRaw} ${endAmPm.toLowerCase() === "am" ? "pm" : "am"}`;
      }
    }
  }

  // Salesforce Time fields require the full ISO form "HH:mm:ss.SSSZ" — a bare
  // "HH:mm:ss" is accepted by the API but is mishandled by the platform's own
  // end-after-start check, rejecting valid ranges (confirmed directly against
  // Stanford_UAT: the exact same literal value succeeds with ".000Z" appended
  // and fails without it).
  const start = startRaw ? parseTime12h(startRaw) : null;
  const end = endRaw ? parseTime12h(endRaw) : null;
  return {
    startTime: start ? `${start}.000Z` : null,
    endTime: end ? `${end}.000Z` : null,
  };
}

// ── Numeric helpers ───────────────────────────────────────────────────────────

export function parseIntVal(v: string | undefined | null): number | null {
  if (!v?.trim()) return null;
  const s = v.trim();
  if (s === "0") return null;
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

export function parseFloatVal(v: string | undefined | null): number | null {
  if (!v?.trim()) return null;
  const s = v.trim();
  if (s === "0" || s === "0.0") return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// ── LearningCourse dedup ──────────────────────────────────────────────────────

export function stripSectionSuffix(code: string): string {
  return (
    code
      .trim()
      // Space-separated letter suffix: "OWC 303 A" → "OWC 303", "OWC 303 WA" → "OWC 303"
      .replace(/\s+[A-Za-z]+$/, "")
      // Hyphen-digit suffix: "WSP 400-01A" → "WSP 400"
      .replace(/-\d+[A-Z]*$/i, "")
      .trim()
  );
}

/** Returns the trailing section suffix letter(s), e.g. "OWC 303 A" → "A", or null if none. */
export function extractSectionSuffix(code: string): string | null {
  // Space-separated letter suffix
  const m = code.trim().match(/\s+([A-Za-z]+)$/);
  if (m) return m[1].toUpperCase();
  // Hyphen-digit suffix
  const h = code.trim().match(/-(\d+[A-Z]*)$/i);
  if (h) return h[1].toUpperCase();
  return null;
}

// ── Product2 per CourseOffering ───────────────────────────────────────────────

/** Standard Product2.Description is a 4,000-character Text Area. */
export const PRODUCT_DESCRIPTION_MAX = 4000;

/** Named HTML entities seen in 4D course descriptions. */
const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * Converts a 4D HTML course description into readable plain text for a
 * plain Text Area field such as Product2.Description.
 * - <br>, and the end of a paragraph, div, heading or list, become line breaks
 * - <li> becomes a "• " bullet
 * - every other tag is removed
 * - entities (&amp; &#39; &#x2019; ...) are decoded once
 * - runs of spaces and blank lines are collapsed
 */
export function htmlToPlainText(v: string | undefined | null): string {
  if (!v) return "";
  let text = v
    .replace(/_4DNL_/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|ul|ol|tr)\s*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/li\s*>/gi, "")
    .replace(/<[^>]*>/g, "");
  // Decode entities in a single pass so "&amp;lt;" becomes "&lt;", not "<".
  text = text.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (match, entity: string) => {
      const lower = entity.toLowerCase();
      if (lower.startsWith("#x"))
        return String.fromCodePoint(parseInt(lower.slice(2), 16));
      if (lower.startsWith("#"))
        return String.fromCodePoint(parseInt(lower.slice(1), 10));
      return HTML_ENTITIES[lower] ?? match;
    },
  );
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Length of a value as Salesforce counts it against a Text Area limit.
 * Salesforce escapes & < > " ' into entities and stores line breaks as CRLF,
 * so a value of 3,990 JavaScript characters can still be rejected with
 * STRING_TOO_LONG (seen on the 2-Year run of 2026-10-27, rows 75, 80, 81, 91).
 */
export function salesforceTextLength(v: string): number {
  let length = 0;
  for (const ch of v) {
    if (ch === "&")
      length += 5; // &amp;
    else if (ch === "<" || ch === ">")
      length += 4; // &lt; &gt;
    else if (ch === '"' || ch === "'")
      length += 6; // &quot; &#39;
    else if (ch === "\n")
      length += 2; // CRLF
    else length += ch.length; // surrogate pairs count as 2
  }
  return length;
}

/** Cuts a value so that salesforceTextLength() fits within maxLength. */
export function capForSalesforceText(v: string, maxLength: number): string {
  if (salesforceTextLength(v) <= maxLength) return v;
  let used = 0;
  let end = 0;
  for (const ch of v) {
    const size = salesforceTextLength(ch);
    if (used + size > maxLength) break;
    used += size;
    end += ch.length;
  }
  return v.slice(0, end).trimEnd();
}
/** Standard Product2.Name is a 255-character Text field. */
export const PRODUCT_NAME_MAX = 255;

export interface CourseProductInput {
  /** Course.ID — also the CourseOffering's External_ID_4D__c. */
  sourceId: string;
  /** Course.Code, e.g. "OWC 303 A". */
  code: string;
  /** Course.Title with _4DNL_ tokens already replaced. */
  title: string;
  /** Raw Course.Description. */
  description: string | undefined | null;
  /** Salesforce Id of the CourseOffering saved for this row. */
  courseOfferingId: string;
}

/**
 * Builds the Product2 payload for one Course row (mapping workbook, Course tab
 * rows 127-131, Oct 2026). One Product2 per CourseOffering.
 *   Course.Title       → Name (HTML stripped, max 255; falls back to Code / ID)
 *   Course.ID          → Course_Offering__c (lookup to the CourseOffering saved
 *                         for the same row — passed in as its Salesforce Id)
 *   Course.Description → Description (HTML → plain text, _4DNL_ → newline,
 *                         capped at 4,000 as Salesforce counts characters)
 *   Course.Code        → ProductCode (full code as-is, e.g. "OWC 303 A")
 *   (constant)         → IsActive = false
 *
 * The record itself is upserted on Product2.External_ID_4D__c = Course.ID
 * (e.g. "20081_WSP 138"). Course IDs are "<quarter>_<code>" text values, so
 * they cannot collide with the small numeric Purchase Inventory IDs that the
 * Purchase Inventory flow writes to the same field.
 */
export function buildCourseProductPayload(
  input: CourseProductInput,
): Record<string, unknown> {
  const code = input.code.trim();
  const name =
    stripHtmlForTextField(input.title, PRODUCT_NAME_MAX) ||
    (code || input.sourceId).slice(0, PRODUCT_NAME_MAX);
  const payload: Record<string, unknown> = {
    Name: name,
    IsActive: false,
    Course_Offering__c: input.courseOfferingId,
  };
  if (code) payload.ProductCode = code;
  const description = capForSalesforceText(
    htmlToPlainText(input.description),
    PRODUCT_DESCRIPTION_MAX,
  );
  if (description) payload.Description = description;
  return payload;
}

// ── PricebookEntry per course Product2 ────────────────────────────────────────
//
// Decisions (Oct 2026):
//   - One config var, "Price Books", a comma list of Pricebook2 names shared by
//     Course Import - All / 2-Year / 5-Year.
//   - The Standard Price Book is always included, even when it is not listed,
//     because Salesforce rejects a custom-book entry until the Product has a
//     Standard entry.
//   - At most ONE custom book: the keys below only give two distinct values.
//   - UnitPrice = Course.Tuition; blank or 0 → 0 (a free course still gets an
//     entry). Refreshed on every run. Entries are IsActive = true.
//   - No enrollment filter: every Product that saves gets its entries.

/** Default value of the "Price Books" config var. */
export const DEFAULT_PRICE_BOOKS =
  "Standard Price Book,StanfordContinuingStudies Price Book";

/** Prefix on PricebookEntry.External_ID_4D__c for Standard Price Book entries. */
export const STANDARD_ENTRY_KEY_PREFIX = "STD-";

/**
 * Splits the "Price Books" config var into distinct, trimmed names. Matching
 * is case-insensitive (as SOQL `Name IN` is), so "a, A" is one name.
 */
export function parsePriceBookNames(v: string | undefined | null): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const part of String(v ?? "").split(",")) {
    const name = part.trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    names.push(name);
  }
  return names;
}

export interface PricebookRecord {
  Id: string;
  Name: string;
  IsStandard: boolean;
  IsActive: boolean;
}

export interface ResolvedPriceBooks {
  standard: PricebookRecord;
  /** The one custom book, or null when only Standard is configured. */
  custom: PricebookRecord | null;
  /** True when Standard was not in the config var and was added anyway. */
  standardAdded: boolean;
  /** Non-fatal notes for the run log. */
  warnings: string[];
}

/**
 * Checks the configured names against the Pricebook2 records found in the org
 * (the query returns every listed name plus the Standard book). Throws before
 * any row is written when:
 *   - a listed name has no Pricebook2, or that Pricebook2 is inactive
 *   - more than one custom (non-Standard) book is listed
 *   - the org has no Standard Price Book
 */
export function resolvePriceBooks(
  configuredNames: string[],
  found: PricebookRecord[],
): ResolvedPriceBooks {
  const standard = found.find((b) => b.IsStandard);
  if (!standard) {
    throw new Error(
      "[Price Books] No Standard Price Book found (Pricebook2.IsStandard = true).",
    );
  }
  const byName = new Map(found.map((b) => [b.Name.trim().toLowerCase(), b]));
  const missing: string[] = [];
  const inactive: string[] = [];
  const customs: PricebookRecord[] = [];
  let standardListed = false;
  for (const name of configuredNames) {
    const book = byName.get(name.toLowerCase());
    if (!book) {
      missing.push(name);
      continue;
    }
    if (!book.IsActive) inactive.push(name);
    if (book.IsStandard) standardListed = true;
    else if (!customs.some((c) => c.Id === book.Id)) customs.push(book);
  }
  if (missing.length > 0) {
    throw new Error(
      `[Price Books] Not found in Salesforce: ${missing.map((m) => `"${m}"`).join(", ")}. ` +
        "Check the spelling in the Price Books config var, or create the price book first.",
    );
  }
  if (inactive.length > 0) {
    throw new Error(
      `[Price Books] Inactive in Salesforce: ${inactive.map((m) => `"${m}"`).join(", ")}. ` +
        "Activate the price book, or remove it from the Price Books config var.",
    );
  }
  if (customs.length > 1) {
    throw new Error(
      `[Price Books] Only one custom price book is supported, but ${customs.length} are listed: ` +
        `${customs.map((c) => `"${c.Name}"`).join(", ")}. ` +
        "Entry keys are Course.ID for the custom book and STD-<Course.ID> for Standard, so a second custom book would overwrite the first.",
    );
  }
  const warnings: string[] = [];
  if (!standardListed) {
    warnings.push(
      `"${standard.Name}" is not in the Price Books config var — added anyway, because custom price book entries need a Standard entry first.`,
    );
  }
  if (!standard.IsActive) {
    warnings.push(
      `"${standard.Name}" is inactive — entries are still created in it, but orders cannot use an inactive price book.`,
    );
  }
  return {
    standard,
    custom: customs[0] ?? null,
    standardAdded: !standardListed,
    warnings,
  };
}

/**
 * Course.Tuition → PricebookEntry.UnitPrice. Unlike parseFloatVal, 0 is kept
 * as 0, and a blank or unreadable value also becomes 0. "$1,250.00" → 1250.
 */
export function parseListPrice(v: string | undefined | null): number {
  const s = String(v ?? "")
    .replace(/[$,\s]/g, "")
    .trim();
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** PricebookEntry.External_ID_4D__c for one Product in one book. */
export function pricebookEntryKey(
  sourceId: string,
  isStandard: boolean,
): string {
  const id = sourceId.trim();
  return isStandard ? `${STANDARD_ENTRY_KEY_PREFIX}${id}` : id;
}
