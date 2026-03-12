import { Link, useLocation } from 'react-router-dom';
import { 
  Building2, 
  CreditCard, 
  FileText, 
  LayoutDashboard, 
  Settings, 
  Users,
  Backpack,
  Briefcase
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  
  // Dashboard navigation routes dynamically load based on role
  // This helps enforce the fix for Dashboard vs Profile Type confusion
  const getNavItems = () => {
    const role = user?.role || 'CITIZEN';
    
    const navItems = [
      {
        title: 'Overview',
        href: '/dashboard',
        icon: LayoutDashboard,
        roles: ['ADMIN', 'CITIZEN', 'BUSINESS', 'OPERATOR'],
      },
      {
        title: 'Profiles',
        href: '/dashboard/profiles',
        icon: Users,
        roles: ['CITIZEN', 'BUSINESS'], // Only these roles create profiles
      },
      {
        title: 'Client Queue',
        href: '/dashboard/queue',
        icon: Briefcase,
        roles: ['OPERATOR'], // Operators manage citizen clients natively
      },
      {
        title: 'My Documents',
        href: '/dashboard/documents',
        icon: FileText,
        roles: ['CITIZEN', 'BUSINESS', 'OPERATOR'],
      },
      {
        title: 'Wallet',
        href: '/dashboard/wallet',
        icon: CreditCard,
        roles: ['ADMIN', 'CITIZEN', 'BUSINESS', 'OPERATOR'],
      },
      {
        title: 'Platform Manage',
        href: '/dashboard/admin',
        icon: Building2,
        roles: ['ADMIN'],
      },
      {
        title: 'Settings',
        href: '/dashboard/settings',
        icon: Settings,
        roles: ['ADMIN', 'CITIZEN', 'BUSINESS', 'OPERATOR'],
      },
    ];
    
    return navItems.filter((item) => item.roles.includes(role));
  };

  const navItems = getNavItems();

  return (
    <aside className="hidden w-64 flex-col border-r bg-card lg:flex">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <Backpack className="h-6 w-6 text-primary" />
          <span className="text-lg">OneForm UI</span>
        </Link>
      </div>
      
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          <div className="mb-2 px-2 py-1 text-xs font-semibold tracking-tight text-muted-foreground uppercase">
            {user?.role || 'General'} Dashboard
          </div>
          
          {navItems.map((item, index) => {
            const Icon = item.icon;
            // Match exactly or start with it (except the root dashboard path)
            const isActive = location.pathname === item.href || 
                            (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
            
            return (
              <Link
                key={index}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 my-0.5 text-muted-foreground transition-all hover:text-primary",
                  isActive ? "bg-muted text-primary font-medium" : "hover:bg-muted"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "")} />
                {item.title}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="mt-auto p-4 flex flex-col gap-4 border-t">
        <div className="rounded-xl bg-primary/10 p-4 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 size-24 rounded-full bg-primary/20 blur-xl"></div>
          <div className="relative">
            <h4 className="text-sm font-semibold">Need Help?</h4>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Connect with our support team on Telegram or WhatsApp.
            </p>
            <Button size="sm" variant="outline" className="w-full bg-background">
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
