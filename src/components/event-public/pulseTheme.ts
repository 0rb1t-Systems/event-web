export const PULSE = {
  teal: "#2ECFC2",
  tealDark: "#22B8AC",
  navy: "#0A2156",
  navyMid: "#163D86",
  sky: "#4B8FE8",
  mint: "#D4F4F0",
  paper: "#FFFFFF",
  ink: "#0F172A",
  muted: "#64748B",
  black: "#0B0B0B",
} as const;

export type HeroPortrait = {
  name: string;
  src: string;
};
