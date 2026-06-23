import { useScrollY } from "../../hooks/useInView";

export default function HeroBackground() {
  const scrollY = useScrollY();

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black, transparent)",
          transform: `translateY(${scrollY * 0.15}px)`,
        }}
      />

      {/* Parallax orbs */}
      <div
        className="absolute left-1/2 top-[-12rem] h-[42rem] w-[42rem] rounded-full bg-brand-600/35 blur-[130px]"
        style={{ transform: `translate(-50%, ${scrollY * 0.35}px)`, opacity: "var(--hero-orb-opacity)" }}
      />
      <div
        className="absolute -right-32 top-32 h-[28rem] w-[28rem] rounded-full bg-fuchsia-600/25 blur-[110px]"
        style={{ transform: `translateY(${scrollY * 0.2}px)`, opacity: "var(--hero-orb-opacity)" }}
      />
      <div
        className="absolute -left-24 top-[28rem] h-72 w-72 rounded-full bg-cyan-500/15 blur-[100px]"
        style={{ transform: `translateY(${scrollY * 0.45}px)`, opacity: "var(--hero-orb-opacity)" }}
      />

      {/* Scan line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/40 to-transparent animate-scan" />

      {/* Grain */}
      <div className="landing-grain absolute inset-0 opacity-[0.04]" />
    </div>
  );
}

export function SectionGlow({ className = "" }: { className?: string }) {
  const scrollY = useScrollY();
  return (
    <div
      className={`pointer-events-none absolute -z-10 h-96 w-96 rounded-full bg-brand-600/20 blur-[120px] ${className}`}
      style={{ transform: `translateY(${scrollY * 0.08}px)` }}
    />
  );
}
