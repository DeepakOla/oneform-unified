import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Backpack, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const registerSchema = z.object({
  fullName: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email address" }),
  phone: z.string().regex(/^[6-9]\d{9}$/, { message: "Invalid Indian mobile number" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

export function RegisterPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
    },
  });

  const onSubmit = async (_values: z.infer<typeof registerSchema>) => {
    setIsLoading(true);
    try {
      // API call to be connected later
      await new Promise(resolve => setTimeout(resolve, 800));
      
      toast({
        title: "Account Created!",
        description: "Your CITIZEN dashboard has been initialized. Please log in.",
      });

      navigate('/login');
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: "An error occurred creating your profile.",
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

      <Card className="w-full max-w-[450px] shadow-lg border-muted/50">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Create an account</CardTitle>
          <CardDescription>
            Start using AI autofill for 500+ Indian government portals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input 
                id="fullName" 
                placeholder="Rahul Kumar" 
                {...form.register('fullName')}
                disabled={isLoading}
              />
              {form.formState.errors.fullName && (
                <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Mobile (10 digit)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">+91</span>
                  <Input 
                    id="phone" 
                    className="pl-10"
                    placeholder="9876543210" 
                    {...form.register('phone')}
                    disabled={isLoading}
                  />
                </div>
                {form.formState.errors.phone && (
                  <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
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
            </div>
            
            <div className="space-y-2 pt-2">
              <Label htmlFor="password">Create Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••"
                {...form.register('password')}
                disabled={isLoading}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
            
            <Button type="submit" className="w-full mt-2" disabled={isLoading}>
              {isLoading ? (
                 <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Account...</>
              ) : (
                "Register & Create Workspace"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-6 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary ml-1 hover:underline">
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default RegisterPage;
