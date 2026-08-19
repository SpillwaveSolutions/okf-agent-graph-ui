import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-6 text-fg">
      <div className="w-full max-w-sm space-y-5 rounded-lg border border-border bg-surface p-6">
        <div>
          <p className="text-xs tracking-[0.18em] text-subtle uppercase">AGER</p>
          <h1 className="mt-1 text-xl font-medium tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted">
            Optional. Graphs stay on this device either way.
          </p>
        </div>
        {authEnabled ? (
          GROK_PROVIDERS.map((p) => (
            <button
              key={p.providerId}
              type="button"
              onClick={() => signIn(p.providerId, { callbackURL: "/" })}
              className="w-full rounded-sm border border-border bg-raised px-4 py-2.5 text-sm font-medium hover:bg-line"
            >
              Continue with {p.label}
            </button>
          ))
        ) : (
          <p className="text-sm text-muted">Sign-in is disabled.</p>
        )}
        <Link to="/" className="block text-center text-sm text-muted underline-offset-4 hover:underline">
          Back to designer
        </Link>
      </div>
    </main>
  );
}
