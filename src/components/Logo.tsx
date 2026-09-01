import { useTheme } from "next-themes";

import logoGlyph from "@/assets/logo-glyph.png";
import { useBranding } from "@/contexts/BrandingContext";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Force the dark-surface mark, even when the page theme is light. */
  onDark?: boolean;
  /** Force the light-surface mark (Pulse event pages stay light). */
  onLight?: boolean;
}

const sizes = {
  sm: { glyph: "w-6 h-6", text: "text-base", img: "h-6" },
  md: { glyph: "w-8 h-8", text: "text-lg", img: "h-8" },
  lg: { glyph: "w-10 h-10", text: "text-xl", img: "h-10" },
};

export function Logo({ size = "md", className = "", onDark = false, onLight = false }: LogoProps) {
  const s = sizes[size];
  const { name, logoUrl, logoDarkUrl } = useBranding();
  const { resolvedTheme } = useTheme();
  const isDark = onLight ? false : onDark || resolvedTheme === "dark";
  const uploaded = isDark ? logoDarkUrl || logoUrl : logoUrl || logoDarkUrl;

  if (uploaded) {
    return (
      <span className={`inline-flex items-center ${className}`}>
        <img
          src={uploaded}
          alt={name}
          className={`${s.img} w-auto max-w-[160px] object-contain`}
        />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      <img src={logoGlyph} alt="" className={`${s.glyph} object-contain`} />
      <span className={`font-display font-bold text-primary tracking-tight ${s.text}`}>
        {name}
      </span>
    </span>
  );
}
