import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Backpack, Loader2, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// We'll use a local subset of the Zod schemas for the UI to handle quick validations
const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

export function LoginPage() {
  const location = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');

  // React Router v7 state hook to get return URL
  const from = location.state?.from?.pathname || '/dashboard';

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      // Mock API call based on old flow structure (until API is fully wired up)
      // const response = await api.post('/api/auth/login', values);
      
      // Simulating network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Simulate successful login with a mock token and user
      const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_token.signature";
      const mockUser = {
        id: "usr_mock123",
        phone: "+919876543210",
        email: values.email,
        role: "CITIZEN" as const,
        tenantId: "t_root"
      };

      login(mockToken, mockUser);
      
      toast({
        title: "Welcome back!",
        description: "Successfully logged into OneForm. Redirecting...",
      });

      // Hard navigation to reset React Router internal state and load dashboard clean
      window.location.href = from;
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.response?.data?.error || "Invalid credentials. Please try again.",
      });
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
          <CardTitle className="text-2xl font-bold tracking-tight">Sign in</CardTitle>
          <CardDescription>
            Access the unified dashboard tailored to your role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as typeof authMethod)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="phone">Phone + OTP</TabsTrigger>
            </TabsList>
            
            <TabsContent value="email">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
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
                    <Label htmlFor="password">Password</Label>
                    <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                      Forgot password?
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
                     <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Authenticating...</>
                  ) : (
                    "Sign in with Email"
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
                  <h4 className="text-sm font-semibold">Phone Login</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    OTP authentication via MSG91 is coming in Phase 2.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setAuthMethod('email')}>
                  Use email instead
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue as</span>
            </div>
          </div>

          <Button variant="secondary" className="w-full font-mono text-xs">
            ₹29 / Form Guest Session
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 text-center">
          <div className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="font-semibold text-primary underline underline-offset-4 hover:text-primary/80">
              Create one
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default LoginPage;
