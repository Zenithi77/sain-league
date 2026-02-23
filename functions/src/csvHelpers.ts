/**
 * csvHelpers.ts
 *
 * Utilities for parsing admin‑uploaded CSV data into boxscore rows:
 *
 *   - `parseCsv(input)`           – parse a CSV Buffer or string → raw rows
 *   - `mapHeaders(rawHeaders)`    – normalise raw header names to canonical
 *   - `validateRow(row)`          – checks that required fields are present
 *   - `safeInt(val)`              – safe parseInt with NaN → 0
 *   - `safeFloat(val)`            – safe parseFloat with NaN → 0
 *   - `parseSlashField(val)`      – "5/12" → { made: 5, attempted: 12 }
 *   - `normaliseRow(raw, headerMap)` – full pipeline: map + coerce types
 */

import { parse } from "csv-parse/sync";
import {
  HEADER_ALIAS_MAP,
  REQUIRED_BOXSCORE_FIELDS,
  NUMERIC_FIELDS,
  SLASH_FIELDS,
} from "./constants.js";

// ---------------------------------------------------------------------------
// Numeric helpers
// ---------------------------------------------------------------------------

/**
 * Safely parse a value to an integer. Returns 0 for any non‑numeric input.
 *
 * @param val - The value to parse
 * @returns The parsed integer, or 0 if non‑numeric
 */
export function safeInt(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  const n = parseInt(String(val), 10);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Safely parse a value to a float. Returns 0 for any non‑numeric input.
 *
 * @param val - The value to parse
 * @returns The parsed float, or 0 if non‑numeric
 */
export function safeFloat(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  const n = parseFloat(String(val));
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Parse a "made/attempted" slash field (e.g. "5/12") into an object.
 * If the input is not in that format, returns { made: 0, attempted: 0 }.
 *
 * @param val - The value to parse (e.g. "5/12")
 * @returns Object with made and attempted counts
 */
export function parseSlashField(val: unknown): {
  made: number;
  attempted: number;
} {
  if (val === null || val === undefined || val === "") {
    return { made: 0, attempted: 0 };
  }
  const str = String(val).trim();
  const parts = str.split("/");
  if (parts.length === 2) {
    return {
      made: safeInt(parts[0]),
      attempted: safeInt(parts[1]),
    };
  }
  // Fallback: treat the whole value as "made" with 0 attempted
  return { made: safeInt(str), attempted: 0 };
}

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

/** Raw parsed row from csv-parse (header → string value) */
export type RawCsvRow = Record<string, string>;

/**
 * Parse a CSV buffer or string into an array of objects keyed by the
 * first‑row headers.  Uses `csv-parse/sync` under the hood.
 *
 * @param input - CSV content as a Buffer or string
 * @returns Array of raw row objects { headerName: stringValue }
 */
export function parseCsv(input: Buffer | string): RawCsvRow[] {
  const rows: RawCsvRow[] = parse(input, {
    columns: true, // first row = headers
    skip_empty_lines: true,
    trim: true,
    bom: true, // strip UTF-8 BOM if present
    relax_column_count: true,
  });
  return rows;
}

// ---------------------------------------------------------------------------
// Header mapping
// ---------------------------------------------------------------------------

/**
 * Takes raw header names from the CSV and returns a Map from the raw name
 * to the canonical Firestore field name.
 *
 * Uses the HEADER_ALIAS_MAP from constants.  Unknown headers are kept as‑is
 * but flagged with a console warning so the admin can fix their CSV template.
 *
 * @param rawHeaders - array of header strings from the CSV first row
 * @returns Map<rawHeader, canonicalFieldName>
 */
export function mapHeaders(rawHeaders: string[]): Map<string, string> {
  const mapped = new Map<string, string>();
  for (const raw of rawHeaders) {
    const key = raw
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, "");
    const canonical = HEADER_ALIAS_MAP[key];
    if (canonical) {
      mapped.set(raw, canonical);
    } else {
      // Keep the original but warn – downstream code can decide to skip it
      console.warn(`[csvHelpers] Unknown CSV header: "${raw}"`);
      mapped.set(raw, raw);
    }
  }
  return mapped;
}

// ---------------------------------------------------------------------------
// Row validation
// ---------------------------------------------------------------------------

/**
 * Returns an array of missing required field names for a normalised row.
 * Empty array = valid.
 *
 * @param row - The normalised row to validate
 * @returns Array of missing required field names (empty if valid)
 */
export function validateRow(row: Record<string, unknown>): string[] {
  const missing: string[] = [];
  for (const field of REQUIRED_BOXSCORE_FIELDS) {
    const val = row[field];
    if (val === undefined || val === null || String(val).trim() === "") {
      missing.push(field);
    }
  }
  return missing;
}

// ---------------------------------------------------------------------------
// Full row normalisation
// ---------------------------------------------------------------------------

/**
 * Normalised boxscore row – all fields are coerced & typed.
 */
export interface NormalisedRow {
  /** Canonical key → value (number or string depending on field type) */
  [field: string]: unknown;
}

/**
 * Takes a single raw CSV row object and a header map (from `mapHeaders`)
 * and returns a fully normalised boxscore object ready for Firestore.
 *
 * Numeric fields are coerced via safeInt/safeFloat; slash fields are stored
 * as the original string AND expanded into `<field>Made` / `<field>Attempted`.
 *
 * @param rawRow    - raw row from parseCsv
 * @param headerMap - output of mapHeaders (rawHeader → canonicalField)
 * @returns A normalised row object
 */
export function normaliseRow(
  rawRow: RawCsvRow,
  headerMap: Map<string, string>,
): NormalisedRow {
  const out: NormalisedRow = {};

  for (const [rawHeader, rawValue] of Object.entries(rawRow)) {
    const field = headerMap.get(rawHeader) ?? rawHeader;

    // Slash fields: store original string + split numeric sub-fields
    if ((SLASH_FIELDS as readonly string[]).includes(field)) {
      out[field] = rawValue; // keep "5/12" as-is
      const { made, attempted } = parseSlashField(rawValue);
      out[`${field}Made`] = made;
      out[`${field}Attempted`] = attempted;
      continue;
    }

    // Numeric fields: coerce to number
    if ((NUMERIC_FIELDS as readonly string[]).includes(field)) {
      // Percentages can be decimal
      if (field.toLowerCase().includes("percentage")) {
        out[field] = safeFloat(rawValue);
      } else {
        out[field] = safeInt(rawValue);
      }
      continue;
    }

    // Everything else (e.g. playerName): keep as trimmed string
    out[field] = typeof rawValue === "string" ? rawValue.trim() : rawValue;
  }

  return out;
}

/**
 * Convenience: parse a full CSV buffer/string and return an array of
 * normalised, validated rows.  Invalid rows are collected in the `errors`
 * array (with row index and missing fields).
 *
 * @param input - CSV content as a Buffer or string
 * @returns Object with normalised rows and validation errors
 */
export function parseAndNormalise(input: Buffer | string): {
  rows: NormalisedRow[];
  errors: Array<{ rowIndex: number; missing: string[] }>;
} {
  const rawRows = parseCsv(input);
  if (rawRows.length === 0) {
    return { rows: [], errors: [] };
  }

  // Build header map from the first row's keys
  const headers = Object.keys(rawRows[0]);
  const headerMap = mapHeaders(headers);

  const rows: NormalisedRow[] = [];
  const errors: Array<{ rowIndex: number; missing: string[] }> = [];

  for (let i = 0; i < rawRows.length; i++) {
    const normalised = normaliseRow(rawRows[i], headerMap);
    const missing = validateRow(normalised);
    if (missing.length > 0) {
      errors.push({ rowIndex: i, missing });
    }
    // Still include the row – callers decide whether to reject
    rows.push(normalised);
  }

  return { rows, errors };
}
