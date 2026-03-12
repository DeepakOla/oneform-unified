/**
 * Register Page — Placeholder
 *
 * IMPORTANT: Dashboard Role ≠ Profile Type (lesson from old project)
 * - User chooses their DASHBOARD TYPE at signup (General/Operator/Business/Admin)
 * - User creates PROFILES (Student/Farmer/etc) INSIDE the dashboard
 *
 * This prevents the UX confusion where users thought "Student/Farmer"
 * at login was their identity, not their dashboard category.
 */
export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 rounded-xl border bg-card shadow-sm">
        <h1 className="text-2xl font-bold mb-2">Create Account</h1>
        <p className="text-sm text-muted-foreground mb-6">Join thousands using OneForm for free</p>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input className="rounded-md border px-3 py-2 text-sm" placeholder="First name" />
            <input className="rounded-md border px-3 py-2 text-sm" placeholder="Last name" />
          </div>
          <input className="w-full rounded-md border px-3 py-2 text-sm" type="email" placeholder="Email address" />
          <input className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Mobile (+91)" />
          <input className="w-full rounded-md border px-3 py-2 text-sm" type="password" placeholder="Password (8+ chars, mixed case + number)" />

          {/* Dashboard Selection — NOT profile type! */}
          <div>
            <label className="block text-sm font-medium mb-1">Choose Your Dashboard</label>
            <p className="text-xs text-muted-foreground mb-2">
              You'll create profile types (Student, Farmer, etc.) <em>inside</em> your dashboard.
            </p>
            <select className="w-full rounded-md border px-3 py-2 text-sm bg-background">
              <option value="CITIZEN">🎓 General Dashboard — For students, farmers, individuals (FREE)</option>
              <option value="OPERATOR">🏢 Operator Dashboard — For CSC centers (help others fill forms)</option>
              <option value="BUSINESS">💼 Business Dashboard — For CA firms, HR companies, NGOs</option>
            </select>
          </div>

          <button className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            Create Free Account
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Already have an account? <a href="/login" className="underline text-primary">Sign in</a>
        </p>
      </div>
    </div>
  );
}
