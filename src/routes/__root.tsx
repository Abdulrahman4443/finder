import { Outlet, Link, createRootRoute, useRouter, HeadContent } from "@tanstack/react-router";
import { Compass } from "lucide-react";

import { Nav } from "../components/Nav";
import { NotificationHost } from "../components/NotificationToast";
import { AuthProvider, useAuth } from "../hooks/useAuth";
import { AuthModal } from "../components/AuthModal";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass max-w-md rounded-2xl p-10 text-center">
        <Compass className="mx-auto h-10 w-10 text-gold" />
        <h1 className="mt-4 font-display text-6xl font-bold text-gold">404</h1>
        <h2 className="mt-3 text-xl font-semibold">Signal lost</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This route isn't on the map. Head back to base.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md gold-gradient px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass max-w-md rounded-2xl p-10 text-center">
        <h1 className="text-xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong. Try again or head home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-md gold-gradient px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Try again
          </button>
          <a href="/" className="rounded-md border border-panel-border px-4 py-2 text-sm">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootLayout() {
  const { isAuthModalOpen, setAuthModalOpen } = useAuth();
  return (
    <div className="min-h-screen">
      <HeadContent />
      <Nav />
      <main className="pt-16">
        <Outlet />
      </main>
      <NotificationHost />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <RootLayout />
    </AuthProvider>
  );
}
