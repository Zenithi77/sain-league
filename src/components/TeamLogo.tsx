import type { CSSProperties } from "react";

interface TeamLogoProps {
  /** Team logo image URL (from the team's `logo` field). */
  logo?: string | null;
  /** Team short name — first letter is used as the fallback. */
  shortName?: string | null;
  /** Fallback badge background color (the team's primary color). */
  color?: string | null;
  /** Class controlling the box size / border-radius (e.g. "team-logo"). */
  className?: string;
  /** Fallback initial when no shortName is available. */
  fallback?: string;
  style?: CSSProperties;
}

/**
 * Renders a team's real logo when available, falling back to a colored
 * circle/box with the team's initial. The `className` keeps the existing
 * size + border-radius from the surrounding CSS for both states.
 */
export default function TeamLogo({
  logo,
  shortName,
  color,
  className,
  fallback = "T",
  style,
}: TeamLogoProps) {
  if (logo) {
    return (
      <img
        src={logo}
        alt={shortName || "Team"}
        className={className}
        style={{
          objectFit: "contain",
          background: "#fff",
          padding: 3,
          ...style,
        }}
      />
    );
  }

  return (
    <div
      className={className}
      style={{ backgroundColor: color || "#333", ...style }}
    >
      {shortName?.charAt(0) || fallback}
    </div>
  );
}
