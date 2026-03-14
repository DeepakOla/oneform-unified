import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInitiateTopup } from '@/hooks/use-api';
import { CreditCard, Loader2, Wallet } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PRESET_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];
const MIN_AMOUNT_RUPEES = 10;

export function TopUpDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(500);
  const [customAmount, setCustomAmount] = useState('');
  const topupMutation = useInitiateTopup();

  const finalAmount = customAmount ? Number(customAmount) : selectedAmount;
  const isValid = finalAmount !== null && finalAmount >= MIN_AMOUNT_RUPEES;

  const handlePresetClick = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const handlePay = async () => {
    if (!finalAmount) return;
    try {
      await topupMutation.mutateAsync(finalAmount * 100);
      // TODO: Open Razorpay checkout with result.orderId and result.key
      // For now, close the dialog — Razorpay integration requires the Razorpay script
      onOpenChange(false);
    } catch {
      // Error is handled by TanStack Query
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {t('wallet.topUpWallet')}
          </DialogTitle>
          <DialogDescription>{t('wallet.selectAmount')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Preset amounts */}
          <div className="grid grid-cols-3 gap-2">
            {PRESET_AMOUNTS.map((amount) => (
              <Button
                key={amount}
                variant={selectedAmount === amount && !customAmount ? 'default' : 'outline'}
                onClick={() => handlePresetClick(amount)}
                className="h-12"
              >
                ₹{amount.toLocaleString('en-IN')}
              </Button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="space-y-2">
            <Label>{t('wallet.customAmount')}</Label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="number"
                min={MIN_AMOUNT_RUPEES}
                placeholder={`Min ₹${MIN_AMOUNT_RUPEES}`}
                value={customAmount}
                onChange={(e) => handleCustomChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('wallet.minAmount', { amount: `₹${MIN_AMOUNT_RUPEES}` })}
            </p>
          </div>

          {/* Summary */}
          {isValid && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium">{t('wallet.summary')}</p>
              <p className="text-2xl font-bold mt-1">₹{finalAmount.toLocaleString('en-IN')}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handlePay} disabled={!isValid || topupMutation.isPending}>
            {topupMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="mr-2 h-4 w-4" />
            )}
            {t('wallet.payNow', { amount: isValid ? `₹${finalAmount.toLocaleString('en-IN')}` : '' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
