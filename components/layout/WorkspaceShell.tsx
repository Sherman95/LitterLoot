"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, PanInfo, motion } from "framer-motion";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";

type WorkspaceShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  icon: (props: { className?: string }) => JSX.Element;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/achievements", label: "Achievements", icon: AchievementsIcon },
  { href: "/profile", label: "Profile", icon: ProfileIcon },
  { href: "/history", label: "History", icon: HistoryIcon },
];

export default function WorkspaceShell({ title, subtitle, children }: WorkspaceShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [fabOpen, setFabOpen] = useState(false);
  const [sheet, setSheet] = useState<"filters" | "settings" | "quick-form" | null>(null);
  const [navHidden, setNavHidden] = useState(false);
  const lastScrollY = useRef(0);

  const activeLabel = useMemo(() => {
    return navItems.find((item) => pathname.startsWith(item.href))?.label ?? "Workspace";
  }, [pathname]);

  const activeIndex = useMemo(() => {
    const index = navItems.findIndex((item) => pathname.startsWith(item.href));
    return index >= 0 ? index : 0;
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;

      if (currentY <= 20) {
        setNavHidden(false);
        lastScrollY.current = currentY;
        return;
      }

      if (currentY > lastScrollY.current + 6) {
        setNavHidden(true);
      } else if (currentY < lastScrollY.current - 6) {
        setNavHidden(false);
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (sheet || fabOpen) {
      setNavHidden(false);
    }
  }, [fabOpen, sheet]);

  const handleSwipeEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 70;

    if (info.offset.x < -threshold) {
      const next = navItems[activeIndex + 1];
      if (next) router.push(next.href);
      return;
    }

    if (info.offset.x > threshold) {
      const previous = navItems[activeIndex - 1];
      if (previous) router.push(previous.href);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-4 pb-28 md:py-6 md:pb-6">
      <div className="grid gap-4 md:grid-cols-[240px_1fr] md:gap-6">
        <aside className="earth-card hidden h-fit rounded-2xl p-4 md:sticky md:top-6 md:block">
          <p className="earth-kicker text-xs font-semibold uppercase tracking-[0.16em]">Mission Console</p>
          <h2 className="mt-1 text-base font-bold">LitterLoot</h2>
          <p className="earth-muted mt-1 text-xs">Navigate sections cleanly and keep each page focused.</p>

          <nav className="mt-4 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={pathname.startsWith(item.href)}
              />
            ))}
          </nav>

          <div className="earth-soft mt-5 rounded-xl p-3 text-xs">
            <p className="earth-muted uppercase tracking-[0.1em]">Session</p>
            <p className="mt-1 font-semibold">Secure mode active</p>
            <p className="earth-muted mt-1">AI verification and wallet flow are enabled.</p>
          </div>
        </aside>

        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          onDragEnd={handleSwipeEnd}
          className="flex min-h-screen flex-col gap-4"
        >
          <header className="earth-card rounded-2xl p-4 backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="earth-kicker text-xs uppercase tracking-[0.14em]">{activeLabel}</p>
                <h1 className="text-xl font-bold">{title}</h1>
              </div>
              <span className="earth-pill inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.09em]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-water)]" />
                Active
              </span>
            </div>
            <p className="earth-muted mt-2 text-sm">{subtitle}</p>
          </header>

          {children}
        </motion.div>
      </div>

      <div className={`fixed inset-x-0 bottom-0 z-40 px-4 pb-4 pt-2 transition duration-300 md:hidden ${navHidden ? "translate-y-20 opacity-0" : "translate-y-0 opacity-100"}`}>
        <nav className="earth-card mx-auto flex max-w-md items-center justify-between rounded-2xl px-3 py-2 shadow-lg backdrop-blur">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex min-w-[72px] flex-col items-center rounded-xl px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.06em] transition ${
                pathname.startsWith(item.href)
                  ? "bg-[var(--brand-water-soft)] text-[var(--brand-earth)]"
                  : "earth-muted hover:text-[var(--brand-water)]"
              }`}
            >
              {pathname.startsWith(item.href) && (
                <span className="absolute left-3 right-3 top-1 h-0.5 rounded-full bg-[var(--brand-earth)]" />
              )}
              <item.icon className="mb-1 h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="fixed bottom-24 right-5 z-40 md:hidden">
        <AnimatePresence>
          {fabOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-2 flex flex-col items-end gap-2"
            >
              <FabOption icon={QuickFormIcon} label="Quick Form" onClick={() => { setSheet("quick-form"); setFabOpen(false); }} />
              <FabOption icon={FilterIcon} label="Filters" onClick={() => { setSheet("filters"); setFabOpen(false); }} />
              <FabOption icon={SettingsIcon} label="Settings" onClick={() => { setSheet("settings"); setFabOpen(false); }} />
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={() => setFabOpen((previous) => !previous)}
          className="earth-primary inline-flex h-14 w-14 items-center justify-center rounded-full shadow-lg focus-visible:earth-focus"
          aria-label="Open quick actions"
        >
          <motion.span animate={{ rotate: fabOpen ? 45 : 0 }} transition={{ duration: 0.2 }} className="text-2xl font-bold leading-none">
            +
          </motion.span>
        </button>
      </div>

      <AnimatePresence>
        {sheet && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              type="button"
              className="absolute inset-0 bg-black/35"
              onClick={() => setSheet(null)}
              aria-label="Close bottom sheet backdrop"
            />
            <motion.section
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 240, damping: 24 }}
              className="earth-card absolute bottom-0 left-0 right-0 rounded-t-3xl p-4"
            >
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[var(--card-border)]" />
              {sheet === "filters" && <FiltersSheet onClose={() => setSheet(null)} />}
              {sheet === "settings" && <SettingsSheet onClose={() => setSheet(null)} />}
              {sheet === "quick-form" && <QuickFormSheet onClose={() => setSheet(null)} />}
            </motion.section>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

type NavLinkProps = {
  href: string;
  label: string;
  icon: (props: { className?: string }) => JSX.Element;
  active: boolean;
};

function NavLink({ href, label, icon: Icon, active }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
        active
          ? "bg-[var(--brand-water-soft)] text-[var(--brand-earth)]"
          : "earth-muted bg-[var(--surface-soft)] hover:text-[var(--brand-water)]"
      }`}
    >
      <Icon className={`h-4 w-4 transition-transform ${active ? "scale-110" : "group-hover:-translate-y-0.5"}`} />
      {label}
    </Link>
  );
}

type FabOptionProps = {
  icon: (props: { className?: string }) => JSX.Element;
  label: string;
  onClick: () => void;
};

function FabOption({ icon: Icon, label, onClick }: FabOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="earth-card flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] focus-visible:earth-focus"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

type SheetProps = {
  onClose: () => void;
};

function FiltersSheet({ onClose }: SheetProps) {
  return (
    <div>
      <p className="earth-kicker text-xs uppercase tracking-[0.14em]">Bottom Sheet</p>
      <h3 className="mt-1 text-lg font-bold">Quick Filters</h3>
      <div className="mt-3 space-y-2 text-sm">
        <label className="earth-soft flex items-center gap-2 rounded-xl px-3 py-2">
          <input type="checkbox" /> Verified only
        </label>
        <label className="earth-soft flex items-center gap-2 rounded-xl px-3 py-2">
          <input type="checkbox" /> Reward sent only
        </label>
      </div>
      <button type="button" onClick={onClose} className="earth-primary mt-4 w-full rounded-xl px-4 py-3 text-sm font-bold">
        Apply Filters
      </button>
    </div>
  );
}

function SettingsSheet({ onClose }: SheetProps) {
  return (
    <div>
      <p className="earth-kicker text-xs uppercase tracking-[0.14em]">Bottom Sheet</p>
      <h3 className="mt-1 text-lg font-bold">Workspace Settings</h3>
      <div className="mt-3 space-y-2 text-sm">
        <label className="earth-soft flex items-center justify-between rounded-xl px-3 py-2">
          Haptic feedback <input type="checkbox" />
        </label>
        <label className="earth-soft flex items-center justify-between rounded-xl px-3 py-2">
          Compact cards <input type="checkbox" />
        </label>
      </div>
      <button type="button" onClick={onClose} className="earth-primary mt-4 w-full rounded-xl px-4 py-3 text-sm font-bold">
        Save Preferences
      </button>
    </div>
  );
}

function QuickFormSheet({ onClose }: SheetProps) {
  return (
    <div>
      <p className="earth-kicker text-xs uppercase tracking-[0.14em]">Bottom Sheet</p>
      <h3 className="mt-1 text-lg font-bold">Quick Action Form</h3>
      <div className="mt-3 space-y-2 text-sm">
        <input
          placeholder="Action title"
          className="earth-soft w-full rounded-xl px-3 py-2 outline-none"
        />
        <textarea
          placeholder="Notes"
          rows={3}
          className="earth-soft w-full rounded-xl px-3 py-2 outline-none"
        />
      </div>
      <button type="button" onClick={onClose} className="earth-primary mt-4 w-full rounded-xl px-4 py-3 text-sm font-bold">
        Submit
      </button>
    </div>
  );
}

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.6-3.5 4.4-5 8-5s6.4 1.5 8 5" />
    </svg>
  );
}

function AchievementsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 4h8v3a4 4 0 1 1-8 0V4Z" />
      <path d="M6 7H4a2 2 0 0 0 2 2" />
      <path d="M18 7h2a2 2 0 0 1-2 2" />
      <path d="M12 11v4" />
      <path d="M9 19h6" />
      <path d="M10 15h4v4h-4z" />
    </svg>
  );
}

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 12a9 9 0 1 0 2.6-6.4" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function QuickFormIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 6h16" />
      <path d="M4 12h10" />
      <path d="M4 18h8" />
      <path d="M18 15v6" />
      <path d="M15 18h6" />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.2 1.2 0 1 1-1.7 1.7l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V19a1.2 1.2 0 1 1-2.4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1.2 1.2 0 1 1-1.7-1.7l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H5a1.2 1.2 0 1 1 0-2.4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1.2 1.2 0 1 1 1.7-1.7l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V5a1.2 1.2 0 1 1 2.4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1.2 1.2 0 1 1 1.7 1.7l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H19a1.2 1.2 0 1 1 0 2.4h-.2a1 1 0 0 0-.9.6Z" />
    </svg>
  );
}
