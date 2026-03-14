import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useWallet, useProfiles, formatPaisa } from '@/hooks/use-api';
import {
  Users,
  CreditCard,
  FileText,
  ClipboardList,
  Plus,
  Wallet,
  Upload,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  gradient,
  isLoading,
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof Users;
  gradient: string;
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`rounded-lg p-2 ${gradient}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-bold tabular-nums">{value}</div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function OverviewPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { data: profilesData, isLoading: profilesLoading } = useProfiles(1, 1);

  const balanceDisplay = wallet ? formatPaisa(wallet.balancePaisa) : '₹0';
  const profileCount = profilesData?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('dashboard.welcome', { name: user?.firstName ?? 'User' })}
        </h1>
        <p className="text-muted-foreground">{t('dashboard.subtitle')}</p>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title={t('dashboard.totalProfiles')}
          value={String(profileCount)}
          description={t('dashboard.totalProfilesDesc')}
          icon={Users}
          gradient="bg-blue-500"
          isLoading={profilesLoading}
        />
        <MetricCard
          title={t('dashboard.walletBalance')}
          value={balanceDisplay}
          description={t('dashboard.walletBalanceDesc')}
          icon={CreditCard}
          gradient="bg-emerald-500"
          isLoading={walletLoading}
        />
        <MetricCard
          title={t('dashboard.formsFilled')}
          value="0"
          description={t('dashboard.formsFilledDesc')}
          icon={ClipboardList}
          gradient="bg-purple-500"
        />
        <MetricCard
          title={t('dashboard.documents')}
          value="0"
          description={t('dashboard.documentsDesc')}
          icon={FileText}
          gradient="bg-orange-500"
        />
      </div>

      {/* Quick actions + Recent activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.quickActions')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button
              variant="outline"
              className="justify-start gap-3 h-12"
              onClick={() => navigate('/dashboard/profiles')}
            >
              <Plus className="h-4 w-4" />
              {t('dashboard.createProfile')}
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-3 h-12"
              onClick={() => navigate('/dashboard/wallet')}
            >
              <Wallet className="h-4 w-4" />
              {t('dashboard.topUpWallet')}
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-3 h-12"
              onClick={() => navigate('/dashboard/documents')}
            >
              <Upload className="h-4 w-4" />
              {t('dashboard.uploadDocument')}
            </Button>
          </CardContent>
        </Card>

        {/* Wallet Summary */}
        <Card>
          <CardHeader>
            <CardTitle>{t('wallet.title')}</CardTitle>
            <CardDescription>{t('dashboard.walletBalanceDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {walletLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-32" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              </div>
            ) : wallet ? (
              <div className="space-y-4">
                <div className="text-3xl font-bold tabular-nums">{balanceDisplay}</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                      {t('wallet.totalEarned')}
                    </div>
                    <div className="text-lg font-semibold tabular-nums text-emerald-600">
                      {formatPaisa(wallet.totalEarnedPaisa)}
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ArrowDownRight className="h-3 w-3 text-red-500" />
                      {t('wallet.totalSpent')}
                    </div>
                    <div className="text-lg font-semibold tabular-nums text-red-600">
                      {formatPaisa(wallet.totalSpentPaisa)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('dashboard.noRecentActivity')}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
