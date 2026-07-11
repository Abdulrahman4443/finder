import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  ChevronDown,
  Compass,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Menu,
  MessagesSquare,
  PlayCircle,
  Plus,
  QrCode,
  Radar,
  RadioTower,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { pushToast } from "./NotificationToast";
import { markNotificationsRead, useNetworkState } from "@/lib/store";

const PRIMARY = [
  { to: "/report/new", label: "Report" },
  { to: "/matches", label: "Matches" },
  { to: "/map", label: "Map" },
  { to: "/broadcast", label: "Broadcast" },
] as const;

const MORE = [
  { to: "/tags", label: "QR Tags", icon: QrCode },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/demo", label: "Demo Mode", icon: PlayCircle },
] as const;

const MOBILE = [
  { to: "/report/new", label: "Report", icon: Plus },
  { to: "/matches", label: "Matches", icon: Radar },
  { to: "/map", label: "Live Map", icon: MapIcon },
  { to: "/broadcast", label: "Broadcast", icon: RadioTower },
  ...MORE,
] as const;

export function Nav() {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const { user, displayName, signOut, setAuthModalOpen } = useAuth();
  const { notifications } = useNetworkState();
  const unread = notifications.filter((n) => !n.read).length;
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setOpen(false);
    setMoreOpen(false);
    setMenuOpen(false);
    setBellOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    pushToast({ title: "Signed out", body: "See you soon." });
    navigate({ to: "/" });
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/[0.06] bg-[#090b10]/80 backdrop-blur-2xl">
      <div className="mx-auto flex h-[3.75rem] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="group flex shrink-0 items-center gap-2.5">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gold text-primary-foreground">
            <Compass className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <span className="font-display text-[1.05rem] font-semibold tracking-tight">
            Findr<span className="text-gold">AI</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {PRIMARY.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition hover:bg-white/[0.04] hover:text-foreground"
              activeProps={{ className: "text-foreground bg-white/[0.06]" }}
            >
              {l.label}
            </Link>
          ))}
          <div ref={moreRef} className="relative">
            <button
              onClick={() => setMoreOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition hover:bg-white/[0.04] hover:text-foreground"
            >
              More <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </button>
            <AnimatePresence>
              {moreOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute left-0 top-10 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#0c0e13]/95 py-1.5 shadow-panel backdrop-blur-xl"
                >
                  {MORE.map((l) => (
                    <Link
                      key={l.to}
                      to={l.to}
                      onClick={() => setMoreOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-muted-foreground transition hover:bg-white/[0.04] hover:text-foreground"
                    >
                      <l.icon className="h-4 w-4" />
                      {l.label}
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <div ref={bellRef} className="relative">
                <button
                  onClick={() => {
                    setBellOpen((v) => !v);
                    if (!bellOpen) markNotificationsRead();
                  }}
                  aria-label="Notifications"
                  className="relative rounded-lg p-2 text-muted-foreground transition hover:bg-white/[0.04] hover:text-foreground"
                >
                  <Bell className="h-4 w-4" />
                  {unread > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-primary-foreground">
                      {unread}
                    </span>
                  )}
                </button>
                <AnimatePresence>
                  {bellOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="absolute right-0 top-11 w-80 overflow-hidden rounded-xl border border-white/10 bg-[#0c0e13]/95 shadow-panel backdrop-blur-xl"
                    >
                      <div className="border-b border-white/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Notifications
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            Nothing yet — file a report to get matched.
                          </div>
                        ) : (
                          notifications.slice(0, 8).map((n) => (
                            <div
                              key={n.id}
                              className="border-b border-white/[0.04] px-4 py-3 last:border-0"
                            >
                              <div className="text-sm font-medium">{n.title}</div>
                              <div className="mt-0.5 text-xs text-muted-foreground">{n.body}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div ref={menuRef} className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-full border border-white/10 py-1 pl-1 pr-2.5 transition hover:bg-white/[0.04]"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold text-xs font-bold text-primary-foreground">
                    {displayName[0]?.toUpperCase() ?? "?"}
                  </span>
                  <span className="hidden max-w-28 truncate text-sm lg:inline">{displayName}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="absolute right-0 top-11 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#0c0e13]/95 py-1.5 shadow-panel backdrop-blur-xl"
                    >
                      <MenuItem to="/profile" icon={UserRound} onClick={() => setMenuOpen(false)}>
                        Profile
                      </MenuItem>
                      <MenuItem
                        to="/matches"
                        icon={MessagesSquare}
                        onClick={() => setMenuOpen(false)}
                      >
                        My recoveries
                      </MenuItem>
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground transition hover:bg-white/[0.04] hover:text-destructive"
                      >
                        <LogOut className="h-4 w-4" /> Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setAuthModalOpen(true)}
                className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground"
              >
                Sign in
              </button>
              <button
                onClick={() => setAuthModalOpen(true)}
                className="rounded-lg bg-gold px-3.5 py-1.5 text-sm font-semibold text-primary-foreground transition hover:opacity-95 active:scale-[0.98]"
              >
                Get started
              </button>
            </>
          )}
        </div>

        <button
          className="rounded-lg border border-white/10 p-2 md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-white/[0.06] bg-[#090b10]/95 backdrop-blur-xl md:hidden"
          >
            <div className="space-y-0.5 px-4 py-3">
              {MOBILE.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-white/[0.04] hover:text-foreground"
                  activeProps={{ className: "text-gold" }}
                >
                  <l.icon className="h-4 w-4" />
                  {l.label}
                </Link>
              ))}
              <div className="my-2 h-px bg-white/10" />
              {user ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                  >
                    <UserRound className="h-4 w-4" /> Profile
                  </Link>
                  <button
                    onClick={() => {
                      setOpen(false);
                      handleSignOut();
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-destructive hover:bg-white/[0.04]"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setOpen(false);
                    setAuthModalOpen(true);
                  }}
                  className="block w-full rounded-lg bg-gold px-3 py-2.5 text-center text-sm font-semibold text-primary-foreground"
                >
                  Sign in / Create account
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function MenuItem({
  to,
  icon: Icon,
  onClick,
  children,
}: {
  to: string;
  icon: typeof UserRound;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground transition hover:bg-white/[0.04] hover:text-foreground"
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}
