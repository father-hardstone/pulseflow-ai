import { useEffect, useRef, useState, type RefObject } from "react";

interface UseInViewOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

function checkInView(el: HTMLElement, threshold: number, rootMargin: string): boolean {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const margin = parseRootMarginBottom(rootMargin, vh);
  const visible = Math.min(rect.bottom, vh - margin) - Math.max(rect.top, 0);
  return visible / Math.max(rect.height, 1) >= threshold;
}

function parseRootMarginBottom(rootMargin: string, vh: number): number {
  const parts = rootMargin.trim().split(/\s+/);
  const bottom = parts[2] ?? parts[0] ?? "0";
  if (bottom.endsWith("%")) return (parseFloat(bottom) / 100) * vh;
  if (bottom.endsWith("px")) return parseFloat(bottom);
  return 0;
}

export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: UseInViewOptions = {}
): [RefObject<T>, boolean] {
  const { threshold = 0.08, rootMargin = "0px 0px 0px 0px", once = true } = options;
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let observer: IntersectionObserver | null = null;

    const markVisible = () => {
      setInView(true);
      if (once) observer?.disconnect();
    };

    // Above-the-fold content: show immediately without waiting for scroll.
    if (checkInView(el, threshold, rootMargin)) {
      markVisible();
      if (once) return;
    }

    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) markVisible();
        else if (!once) setInView(false);
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer?.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, inView];
}

export function useScrollY(): number {
  const [y, setY] = useState(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setY(window.scrollY));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return y;
}
