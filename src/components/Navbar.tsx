import { useState, useEffect } from "react";
import { Menu, X, Zap } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "How it works", to: "/how-it-works" },
  { label: "For businesses", to: "/for-businesses" },
  { label: "For customers", to: "/for-customers" },
  { label: "Pricing", to: "/pricing" },
  { label: "Contact", to: "/contact" },
];

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed left-1/2 top-4 z-50 w-[min(1200px,94vw)] -translate-x-1/2 rounded-2xl transition-all duration-500",
        scrolled ? "bg-background/60 backdrop-blur-xl" : "bg-transparent",
      )}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-foreground">
            <Zap className="h-5 w-5 text-background" strokeWidth={2.5} />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">BizOrder</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Button variant="outline" size="sm" asChild>
            <Link to="/login">Log in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/pricing">See pricing</Link>
          </Button>
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          className="grid h-10 w-10 place-items-center rounded-lg bg-foreground/10 text-foreground md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="px-4 py-4 md:hidden animate-fade-in">
          <nav className="flex flex-col gap-1">
            {navLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-foreground/10"
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex justify-center">
              <ThemeToggle />
            </div>
            <Button variant="outline" asChild>
              <Link to="/login" onClick={() => setOpen(false)}>Log in</Link>
            </Button>
            <Button asChild>
              <Link to="/pricing" onClick={() => setOpen(false)}>See pricing</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};
