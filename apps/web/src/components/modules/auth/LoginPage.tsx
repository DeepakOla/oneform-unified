import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Backpack, Loader2, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api/client';

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

export function LoginPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard';

  const form = useForm<z.infer<typeof loginSchema>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(loginSchema as any),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      const response = await api.post<{
        success: boolean;
        data: {
          tokens: { accessToken: string; refreshToken: string; expiresIn: number };
          user: { id: string; tenantId: string; email: string; firstName: string; lastName: string | null; role: string; status: string };
        };
      }>('/api/auth/login', values);

      const { tokens, user } = response.data.data;

      localStorage.setItem('refresh_token', tokens.refreshToken);
      login(tokens.accessToken, { ...user, role: user.role as import('@oneform/shared-types').UserRole });

      toast({ title: t('auth.welcomeBack'), description: t('auth.signedInAs', { name: user.firstName }) });
      window.location.href = from;
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: { message?: string } } } })
          .response?.data?.error?.message ?? t('auth.invalidCredentials');
      toast({ variant: 'destructive', title: t('auth.loginFailed'), description: msg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-muted/40 p-4">
      <div className="absolute top-4 left-4 md:top-8 md:left-8 flex items-center gap-2">
        <div className="flex bg-primary text-primary-foreground rounded-lg p-1.5 shadow-sm">
          <Backpack className="h-6 w-6" />
        </div>
        <span className="text-xl font-bold tracking-tight text-foreground hidden sm:inline-block">
          OneForm
        </span>
      </div>

      <Card className="w-full max-w-[400px] shadow-lg border-muted/50">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">{t('auth.signIn')}</CardTitle>
          <CardDescription>
            {t('auth.signInDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as typeof authMethod)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="email">{t('auth.emailTab')}</TabsTrigger>
              <TabsTrigger value="phone">{t('auth.phoneTab')}</TabsTrigger>
            </TabsList>

            <TabsContent value="email">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.emailAddress')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    {...form.register('email')}
                    disabled={isLoading}
                  />
                  {form.formState.errors.email && (
                    <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">{t('auth.password')}</Label>
                    <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                      {t('auth.forgotPassword')}
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    {...form.register('password')}
                    disabled={isLoading}
                  />
                  {form.formState.errors.password && (
                    <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                     <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('auth.authenticating')}</>
                  ) : (
                    t('auth.signInWithEmail')
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="phone">
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-4 border-2 border-dashed rounded-lg bg-muted/20">
                <div className="rounded-full bg-primary/10 p-3">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">{t('auth.phoneLogin')}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('auth.otpComingSoon')}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setAuthMethod('email')}>
                  {t('auth.useEmailInstead')}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">{t('auth.orContinueAs')}</span>
            </div>
          </div>

          <Button variant="secondary" className="w-full font-mono text-xs">
            {t('auth.guestSession')}
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 text-center">
          <div className="text-sm text-muted-foreground">
            {t('auth.noAccount')}{" "}
            <Link to="/register" className="font-semibold text-primary underline underline-offset-4 hover:text-primary/80">
              {t('auth.createOne')}
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default LoginPage;
