/**
 * OneForm — Dashboard Shell
 *
 * Unified dashboard for all user types (CITIZEN / OPERATOR / BUSINESS / ADMIN).
 * The sidebar modules are dynamically loaded based on the user's role.
 * This is a placeholder — full implementation in Stage 2.
 */
export default function DashboardShell() {
  return (
    <div className="flex h-screen w-full bg-background">
      {/* Sidebar placeholder */}
      <aside className="hidden w-64 border-r bg-card md:flex flex-col p-4">
        <div className="mb-6">
          <div className="text-xl font-bold text-gradient">OneForm</div>
          <div className="text-xs text-muted-foreground mt-1">Unified Platform</div>
        </div>
        <nav className="space-y-1 flex-1">
          {['Dashboard', 'Profiles', 'Documents', 'Forms', 'Wallet', 'Settings'].map((item) => (
            <button
              key={item}
              className="w-full text-left px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {item}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content placeholder */}
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold mb-2">Welcome to OneForm</h1>
          <p className="text-muted-foreground mb-8">Your dashboard is being built. Check back soon!</p>

          {/* Quick action cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: 'Create Profile', desc: 'Set up your ABCD profile for autofill', icon: '👤' },
              { title: 'Upload Documents', desc: 'Upload Aadhaar, PAN, certificates', icon: '📄' },
              { title: 'Fill a Form', desc: '500+ government forms supported', icon: '📝' },
            ].map((card) => (
              <div key={card.title} className="rounded-lg border bg-card p-4 hover:border-primary transition-colors cursor-pointer">
                <div className="text-2xl mb-2">{card.icon}</div>
                <div className="font-semibold text-sm">{card.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{card.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
