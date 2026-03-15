import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/modules/i18n/LanguageSwitcher';
import {
  Backpack,
  Zap,
  Lock,
  Users,
  User,
  Tractor,
  Building2,
  ArrowRight,
  CheckCircle2,
  FileText,
} from 'lucide-react';

export function LandingPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-primary p-1.5 text-primary-foreground shadow-sm">
              <Backpack className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">OneForm</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">{t('landing.nav.signIn')}</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/register">{t('landing.nav.register')}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">

        {/* ── Hero ───────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-[hsl(220,100%,97%)] py-20 md:py-28">
          {/* Background decoration */}
          <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-30" aria-hidden>
            <div className="absolute right-8 top-12 h-72 w-72 rounded-full bg-[hsl(220,85%,54%)]/20 blur-3xl" />
            <div className="absolute right-32 top-40 h-48 w-48 rounded-full bg-[hsl(27,100%,55%)]/20 blur-3xl" />
            <div className="absolute right-4 top-52 h-32 w-32 rounded-full bg-[hsl(135,70%,31%)]/20 blur-3xl" />
          </div>

          <div className="container relative">
            <div className="max-w-3xl">
              {/* Badge */}
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                <Zap className="h-3.5 w-3.5" />
                {t('landing.hero.badge')}
              </div>

              <h1 className="mb-5 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-foreground">
                {t('landing.hero.title')}
              </h1>

              <p className="mb-8 text-lg text-muted-foreground max-w-xl leading-relaxed">
                {t('landing.hero.subtitle')}
              </p>

              <div className="flex flex-wrap gap-3">
                <Button size="lg" asChild className="gap-2 shadow-md">
                  <Link to="/register">
                    {t('landing.hero.ctaRegister')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/login">{t('landing.hero.ctaSignIn')}</Link>
                </Button>
              </div>

              {/* Trust signals */}
              <div className="mt-8 flex flex-wrap gap-5 text-sm text-muted-foreground">
                {['Free to register', 'No data shared', 'Made in India'].map((item) => (
                  <div key={item} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[hsl(135,70%,31%)]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats Bar ──────────────────────────────────────────────── */}
        <section className="border-y border-border bg-muted/30">
          <div className="container py-8">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-extrabold text-[hsl(27,100%,55%)]">
                  {t('landing.stats.portals')}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{t('landing.stats.portalsLabel')}</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-[hsl(27,100%,55%)]">
                  {t('landing.stats.cost')}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{t('landing.stats.costLabel')}</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-[hsl(27,100%,55%)]">
                  {t('landing.stats.lang')}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{t('landing.stats.langLabel')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ───────────────────────────────────────────────── */}
        <section className="py-20">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight">{t('landing.features.title')}</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6 space-y-4">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">{t('landing.features.autofill.title')}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t('landing.features.autofill.desc')}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6 space-y-4">
                  <div className="h-11 w-11 rounded-xl bg-[hsl(135,70%,31%)]/10 flex items-center justify-center">
                    <Lock className="h-5 w-5 text-[hsl(135,70%,31%)]" />
                  </div>
                  <h3 className="font-semibold text-lg">{t('landing.features.secure.title')}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t('landing.features.secure.desc')}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6 space-y-4">
                  <div className="h-11 w-11 rounded-xl bg-[hsl(27,100%,55%)]/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-[hsl(27,100%,55%)]" />
                  </div>
                  <h3 className="font-semibold text-lg">{t('landing.features.operator.title')}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t('landing.features.operator.desc')}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ── User Types / Roles ─────────────────────────────────────── */}
        <section className="py-20 bg-muted/20 border-y border-border">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight">{t('landing.roles.title')}</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {/* Citizen */}
              <div className="rounded-2xl border border-border bg-background p-6 space-y-4 hover:shadow-md transition-shadow">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{t('landing.roles.citizen.title')}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('landing.roles.citizen.desc')}
                </p>
                <Button variant="outline" size="sm" asChild className="gap-1">
                  <Link to="/register">
                    Get Started <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>

              {/* Operator */}
              <div className="rounded-2xl border-2 border-primary bg-background p-6 space-y-4 relative hover:shadow-md transition-shadow">
                <div className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                  Most Popular
                </div>
                <div className="h-12 w-12 rounded-2xl bg-[hsl(27,100%,55%)]/10 flex items-center justify-center">
                  <Tractor className="h-6 w-6 text-[hsl(27,100%,55%)]" />
                </div>
                <h3 className="text-lg font-semibold">{t('landing.roles.operator.title')}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('landing.roles.operator.desc')}
                </p>
                <Button size="sm" asChild className="gap-1">
                  <Link to="/register">
                    Get Started <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>

              {/* Business */}
              <div className="rounded-2xl border border-border bg-background p-6 space-y-4 hover:shadow-md transition-shadow">
                <div className="h-12 w-12 rounded-2xl bg-[hsl(135,70%,31%)]/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-[hsl(135,70%,31%)]" />
                </div>
                <h3 className="text-lg font-semibold">{t('landing.roles.business.title')}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('landing.roles.business.desc')}
                </p>
                <Button variant="outline" size="sm" asChild className="gap-1">
                  <Link to="/register">
                    Get Started <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA Banner ─────────────────────────────────────────────── */}
        <section className="py-20">
          <div className="container">
            <div className="rounded-2xl bg-primary p-10 text-center text-primary-foreground shadow-lg">
              <FileText className="mx-auto h-10 w-10 mb-4 opacity-90" />
              <h2 className="text-2xl font-bold mb-3">Ready to fill your first form?</h2>
              <p className="text-primary-foreground/80 mb-6 max-w-lg mx-auto text-sm">
                Create your free account in 2 minutes. No credit card required.
              </p>
              <Button size="lg" variant="secondary" asChild className="gap-2 shadow">
                <Link to="/register">
                  Create Free Account <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-8">
        <div className="container">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg bg-primary p-1 text-primary-foreground">
                <Backpack className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold">OneForm</span>
              <span className="text-xs text-muted-foreground">— {t('landing.footer.tagline')}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">{t('landing.footer.privacy')}</a>
              <a href="#" className="hover:text-foreground transition-colors">{t('landing.footer.terms')}</a>
              <span>{t('landing.footer.copyright')}</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default LandingPage;
