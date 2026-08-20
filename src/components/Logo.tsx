import { useTheme } from "next-themes";

import logoGlyph from "@/assets/logo-glyph.png";
import { useBranding } from "@/contexts/BrandingContext";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: { glyph: "w-7 h-7", text: "text-lg", img: "h-7" },
  md: { glyph: "w-9 h-9", text: "text-[22px]", img: "h-9" },
  lg: { glyph: "w-12 h-12", text: "text-2xl", img: "h-12" },
};

export function Logo({ size = "md", className = "" }: LogoProps) {
  const s = sizes[size];
  const { name, logoUrl, logoDarkUrl } = useBranding();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
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
