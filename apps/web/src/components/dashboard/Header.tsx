import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useWallet, formatPaisa } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Menu, UserCircle, LogOut, Wallet } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar as MobileSidebar } from './Sidebar';
import { LanguageSwitcher } from '@/components/modules/i18n/LanguageSwitcher';

export function Header() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const { data: wallet } = useWallet();

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 z-10 sticky top-0 shadow-sm">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 lg:hidden focus-visible:ring-offset-0">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 border-none">
          <MobileSidebar />
        </SheetContent>
      </Sheet>

      <div className="w-full flex-1">
        {/* Placeholder for global search logic future implementation */}
        <h2 className="hidden md:flex text-lg font-medium text-foreground tracking-tight">
          {t('dashboard.welcome', { name: user?.firstName ?? 'User' })}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <LanguageSwitcher />

        {/* Quick Wallet Status */}
        <div className="hidden sm:flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm shadow-sm transition-colors hover:bg-muted cursor-pointer">
          <Wallet className="h-4 w-4 text-emerald-500" />
          <span className="font-semibold tabular-nums">
            {wallet ? formatPaisa(wallet.balancePaisa) : '₹0'}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary">
              <UserCircle className="h-6 w-6" />
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account
              <div className="text-xs font-normal text-muted-foreground mt-1 font-mono">
                {user?.email ?? 'Guest User'}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">Profile Settings</DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">Wallet Manager</DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">API Keys</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer focus:bg-destructive/10">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
