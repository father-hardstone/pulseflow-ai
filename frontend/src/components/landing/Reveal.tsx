import { type ReactNode } from "react";
import { useInView } from "../../hooks/useInView";

type Direction = "up" | "down" | "left" | "right" | "scale" | "none";

const dirClass: Record<Direction, string> = {
  up: "reveal-from-up",
  down: "reveal-from-down",
  left: "reveal-from-left",
  right: "reveal-from-right",
  scale: "reveal-scale",
  none: "reveal-fade",
};

interface RevealProps {
  children: ReactNode;
  className?: string;
  direction?: Direction;
  delay?: number;
  duration?: number;
}

export default function Reveal({
  children,
  className = "",
  direction = "up",
  delay = 0,
  duration = 700,
}: RevealProps) {
  const [ref, inView] = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`reveal ${dirClass[direction]} ${inView ? "reveal-visible" : ""} ${className}`}
      style={{
        transitionDelay: `${delay}ms`,
        transitionDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  );
}

interface StaggerProps {
  children: ReactNode[];
  className?: string;
  staggerMs?: number;
  direction?: Direction;
}

export function Stagger({
  children,
  className = "",
  staggerMs = 90,
  direction = "up",
}: StaggerProps) {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.08 });

  return (
    <div ref={ref} className={className}>
      {children.map((child, i) => (
        <div
          key={i}
          className={`reveal ${dirClass[direction]} ${inView ? "reveal-visible" : ""}`}
          style={{ transitionDelay: `${i * staggerMs}ms`, transitionDuration: "650ms" }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
