import { NextResponse } from "next/server";

// Common validation utilities

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Sanitize string input
export function sanitizeString(input: unknown): string | null {
  if (typeof input !== "string") return null;
  // Remove potentially dangerous characters, trim whitespace
  return input.trim().slice(0, 500); // Limit length
}

// Validate required fields
export function validateRequired(
  obj: Record<string, unknown>,
  fields: string[],
): ValidationResult {
  const errors: string[] = [];

  for (const field of fields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === "") {
      errors.push(`${field} заавал оруулах шаардлагатай`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Validate player input
export function validatePlayerInput(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return { valid: false, errors: ["Буруу өгөгдлийн формат"] };
  }

  const data = body as Record<string, unknown>;
  const errors: string[] = [];

  // Required fields
  if (
    !data.name ||
    typeof data.name !== "string" ||
    data.name.trim().length < 2
  ) {
    errors.push("Нэр заавал оруулах шаардлагатай (2+ тэмдэгт)");
  }

  if (!data.teamId || typeof data.teamId !== "string") {
    errors.push("Багийн ID заавал оруулах шаардлагатай");
  }

  // Optional fields validation
  if (
    data.number !== undefined &&
    (typeof data.number !== "number" || data.number < 0 || data.number > 99)
  ) {
    errors.push("Дугаар 0-99 хооронд байх ёстой");
  }

  if (
    data.age !== undefined &&
    (typeof data.age !== "number" || data.age < 0 || data.age > 100)
  ) {
    errors.push("Нас 0-100 хооронд байх ёстой");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Validate team input
export function validateTeamInput(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return { valid: false, errors: ["Буруу өгөгдлийн формат"] };
  }

  const data = body as Record<string, unknown>;
  const errors: string[] = [];

  // Required fields
  if (
    !data.name ||
    typeof data.name !== "string" ||
    data.name.trim().length < 2
  ) {
    errors.push("Багийн нэр заавал оруулах шаардлагатай (2+ тэмдэгт)");
  }

  if (
    !data.shortName ||
    typeof data.shortName !== "string" ||
    data.shortName.trim().length < 2
  ) {
    errors.push("Товчилсон нэр заавал оруулах шаардлагатай");
  }

  if (!data.city || typeof data.city !== "string") {
    errors.push("Хот заавал оруулах шаардлагатай");
  }

  if (
    !data.conference ||
    (data.conference !== "east" && data.conference !== "west")
  ) {
    errors.push("Бүс (east/west) заавал оруулах шаардлагатай");
  }

  if (
    !data.school ||
    typeof data.school !== "string" ||
    (data.school as string).trim().length < 2
  ) {
    errors.push("Сургуулийн нэр заавал оруулах шаардлагатай (2+ тэмдэгт)");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Validate game input
export function validateGameInput(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return { valid: false, errors: ["Буруу өгөгдлийн формат"] };
  }

  const data = body as Record<string, unknown>;
  const errors: string[] = [];

  // Required fields
  if (!data.date || typeof data.date !== "string") {
    errors.push("Огноо заавал оруулах шаардлагатай");
  }

  if (!data.homeTeamId || typeof data.homeTeamId !== "string") {
    errors.push("Зочин багийн ID заавал оруулах шаардлагатай");
  }

  if (!data.awayTeamId || typeof data.awayTeamId !== "string") {
    errors.push("Гадны багийн ID заавал оруулах шаардлагатай");
  }

  if (data.homeTeamId === data.awayTeamId) {
    errors.push("Хоёр баг өөр байх ёстой");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Create error response helper
export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

// Create validation error response
export function validationErrorResponse(errors: string[]) {
  return NextResponse.json(
    { error: "Validation алдаа", details: errors },
    { status: 400 },
  );
}

// Unauthorized response
export function unauthorizedResponse(message: string = "Нэвтрэх шаардлагатай") {
  return NextResponse.json({ error: message }, { status: 401 });
}

// Forbidden response
export function forbiddenResponse(message: string = "Хандах эрхгүй") {
  return NextResponse.json({ error: message }, { status: 403 });
}
