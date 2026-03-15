import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useInitiateTopup, useVerifyTopup } from '@/hooks/use-api';
import { useToast } from '@/hooks/use-toast';
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
const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

/** Load Razorpay checkout script (cached after first load) */
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${RAZORPAY_SCRIPT_URL}"]`)) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: () => void) => void;
    };
  }
}

export function TopUpDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(500);
  const [customAmount, setCustomAmount] = useState('');
  const topupMutation = useInitiateTopup();
  const verifyMutation = useVerifyTopup();

  const finalAmount = customAmount ? Number(customAmount) : selectedAmount;
  const isValid = finalAmount !== null && finalAmount >= MIN_AMOUNT_RUPEES;
  const isProcessing = topupMutation.isPending || verifyMutation.isPending;

  const handlePresetClick = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const handlePay = useCallback(async () => {
    if (!finalAmount) return;

    // 1. Load Razorpay script
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      toast({ title: 'Failed to load payment gateway', variant: 'destructive' });
      return;
    }

    try {
      // 2. Create Razorpay order via API
      const result = await topupMutation.mutateAsync(finalAmount * 100);

      // 3. Open Razorpay checkout modal
      const options: Record<string, unknown> = {
        key: result.key,
        amount: result.amountPaisa,
        currency: result.currency,
        name: 'OneForm',
        description: `Wallet Top-up ₹${finalAmount.toLocaleString('en-IN')}`,
        order_id: result.orderId,
        prefill: {
          email: user?.email ?? '',
          ...(user?.phone ? { contact: user.phone } : {}),
        },
        theme: {
          color: '#6366f1',
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          // 4. Verify payment on backend
          try {
            await verifyMutation.mutateAsync({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            toast({ title: `₹${finalAmount.toLocaleString('en-IN')} added to wallet!` });
            onOpenChange(false);
          } catch {
            toast({ title: 'Payment verification failed', variant: 'destructive' });
          }
        },
        modal: {
          ondismiss: () => {
            // User closed the Razorpay modal without paying
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      // Error handled by TanStack Query (useInitiateTopup)
    }
  }, [finalAmount, topupMutation, verifyMutation, user, toast, onOpenChange]);

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
          <Button onClick={handlePay} disabled={!isValid || isProcessing}>
            {isProcessing ? (
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
