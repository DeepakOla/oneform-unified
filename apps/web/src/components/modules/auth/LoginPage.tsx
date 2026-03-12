/**
 * Login Page — Placeholder
 * Full implementation includes 5 login methods:
 * 1. Email + Password
 * 2. Phone + OTP (MSG91)
 * 3. Google OAuth
 * 4. DigiLocker OAuth (auto-populates ABCD profile!)
 * 5. Guest mode (₹29/form, 8hr session)
 *
 * Anti-Pattern Fixed: On logout, the caller clears ALL localStorage + hard redirect
 * (not navigate()) to prevent the auth loop bug from v2.6.5.
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 rounded-xl border bg-card shadow-sm">
        <h1 className="text-2xl font-bold mb-2">Welcome to OneForm</h1>
        <p className="text-sm text-muted-foreground mb-6">Sign in to auto-fill government forms</p>

        <div className="space-y-3">
          <input className="w-full rounded-md border px-3 py-2 text-sm" type="email" placeholder="Email address" />
          <input className="w-full rounded-md border px-3 py-2 text-sm" type="password" placeholder="Password" />
          <button className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            Sign In with Email
          </button>
        </div>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs text-muted-foreground"><span className="bg-card px-2">or continue with</span></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center justify-center gap-2 rounded-md border py-2 text-sm hover:bg-accent transition-colors">
            📱 Phone OTP
          </button>
          <button className="flex items-center justify-center gap-2 rounded-md border py-2 text-sm hover:bg-accent transition-colors">
            🔵 DigiLocker
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Don't have an account? <a href="/register" className="underline text-primary">Register free</a>
          {' · '}
          <a href="/guest" className="underline">Try as guest ₹29/form</a>
        </p>
      </div>
    </div>
  );
}
