import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWallet, useTransactions, formatPaisa } from '@/hooks/use-api';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Search,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TopUpDialog } from './TopUpDialog';

function BalanceStatusBadge({ balancePaisa }: { balancePaisa: number }) {
  const { t } = useTranslation();
  const rupees = balancePaisa / 100;
  if (rupees >= 100) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        {t('wallet.healthy')}
      </span>
    );
  }
  if (rupees >= 50) {
    return (
      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
        {t('wallet.low')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
      {t('wallet.critical')}
    </span>
  );
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function WalletPage() {
  const { t } = useTranslation();
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const [page] = useState(1);
  const { data: txData, isLoading: txLoading } = useTransactions(page, 20);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [topUpOpen, setTopUpOpen] = useState(false);

  const transactions = txData?.transactions ?? [];
  const filteredTx = transactions.filter((tx) => {
    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'credits' && tx.amountPaisa > 0) ||
      (typeFilter === 'debits' && tx.amountPaisa < 0);
    const matchesSearch =
      !searchTerm ||
      (tx.description ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleExportCsv = () => {
    const header = 'Type,Description,Amount (₹),Balance (₹),Date\n';
    const rows = filteredTx
      .map((tx) =>
        [
          tx.amountPaisa > 0 ? 'Credit' : 'Debit',
          `"${tx.description ?? ''}"`,
          (tx.amountPaisa / 100).toFixed(2),
          (tx.balanceAfterPaisa / 100).toFixed(2),
          new Date(tx.createdAt).toLocaleDateString('en-IN'),
        ].join(','),
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oneform-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t('wallet.title')}</h1>
        <Button onClick={() => setTopUpOpen(true)}>
          <Wallet className="mr-2 h-4 w-4" />
          {t('wallet.topUp')}
        </Button>
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('wallet.balance')}</CardTitle>
            <CardDescription>{t('dashboard.walletBalanceDesc')}</CardDescription>
          </div>
          {wallet && <BalanceStatusBadge balancePaisa={wallet.balancePaisa} />}
        </CardHeader>
        <CardContent>
          {walletLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-40" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            </div>
          ) : wallet ? (
            <div className="space-y-4">
              <div className="text-4xl font-bold tabular-nums">
                {formatPaisa(wallet.balancePaisa)}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border bg-background p-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                    {t('wallet.totalEarned')}
                  </div>
                  <div className="text-lg font-semibold tabular-nums text-emerald-600">
                    {formatPaisa(wallet.totalEarnedPaisa)}
                  </div>
                </div>
                <div className="rounded-lg border bg-background p-3">
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
          ) : null}
        </CardContent>
      </Card>

      {/* Low balance warning */}
      {wallet && wallet.balancePaisa / 100 < 50 && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800">{t('wallet.lowBalanceWarning')}</p>
        </div>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>{t('wallet.transactions')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('wallet.allTypes')}</SelectItem>
                <SelectItem value="credits">{t('wallet.credits')}</SelectItem>
                <SelectItem value="debits">{t('wallet.debits')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={filteredTx.length === 0}>
              <Download className="mr-2 h-3 w-3" />
              {t('common.export')}
            </Button>
          </div>

          {/* Table */}
          {txLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredTx.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-muted-foreground/30 p-8 text-center">
              <Wallet className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">{t('wallet.noTransactions')}</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('wallet.transactionType')}</TableHead>
                    <TableHead>{t('wallet.description')}</TableHead>
                    <TableHead className="text-right">{t('wallet.amount')}</TableHead>
                    <TableHead className="text-right">{t('wallet.runningBalance')}</TableHead>
                    <TableHead className="text-right">{t('wallet.date')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTx.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            tx.amountPaisa > 0
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {tx.amountPaisa > 0 ? 'Credit' : 'Debit'}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {tx.description ?? t(`wallet.${tx.type}`, { defaultValue: tx.type })}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium tabular-nums ${
                          tx.amountPaisa > 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {tx.amountPaisa > 0 ? '+' : ''}
                        {formatPaisa(tx.amountPaisa)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPaisa(tx.balanceAfterPaisa)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatRelativeDate(tx.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground text-right">
                {t('common.showing', {
                  count: filteredTx.length,
                  total: txData?.total ?? filteredTx.length,
                })}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <TopUpDialog open={topUpOpen} onOpenChange={setTopUpOpen} />
    </div>
  );
}
