import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Logo from "../Logo";
import ThemeToggle from "../ThemeToggle";

const links = [
  { href: "#how", label: "How it works" },
  { href: "#integrations", label: "Integrations" },
  { href: "#pricing", label: "Pricing" },
];

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-surface-line bg-ink-900/75 py-3 shadow-lg shadow-nav backdrop-blur-xl"
          : "border-b border-transparent bg-transparent py-5"
      }`}
    >
      <nav className="container-wide flex items-center justify-between">
        <Logo />
        <div className="hidden items-center gap-8 text-sm text-fg-muted md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="relative transition hover:text-fg after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-brand-400 after:transition-all hover:after:w-full"
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/login" className="btn-ghost hidden px-4 py-2 sm:inline-flex">
            Log in
          </Link>
          <Link to="/signup" className="btn-primary group">
            Get started
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      </nav>
    </header>
  );
}
