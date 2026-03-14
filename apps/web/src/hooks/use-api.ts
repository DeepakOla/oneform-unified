import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

// ── Types ──────────────────────────────────────────────────────────────────

interface Wallet {
  id: string;
  balancePaisa: number;
  totalEarnedPaisa: number;
  totalSpentPaisa: number;
}

interface WalletTransaction {
  id: string;
  type: string;
  amountPaisa: number;
  balanceAfterPaisa: number;
  description: string | null;
  createdAt: string;
}

interface TransactionsResponse {
  transactions: WalletTransaction[];
  total: number;
  page: number;
  limit: number;
}

interface TopupResult {
  orderId: string;
  amountPaisa: number;
  currency: string;
  key: string;
}

// ── Wallet Hooks ───────────────────────────────────────────────────────────

export function useWallet() {
  return useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Wallet }>('/api/wallet');
      return res.data.data;
    },
  });
}

export function useTransactions(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['wallet', 'transactions', page, limit],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: TransactionsResponse }>(
        '/api/wallet/transactions',
        { params: { page, limit } },
      );
      return res.data.data;
    },
  });
}

export function useInitiateTopup() {
  return useMutation({
    mutationFn: async (amountPaisa: number) => {
      const res = await api.post<{ success: boolean; data: TopupResult }>(
        '/api/wallet/topup',
        { amountPaisa },
      );
      return res.data.data;
    },
  });
}

export function useVerifyTopup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    }) => {
      const res = await api.post('/api/wallet/topup/verify', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

// ── Profile Types ──────────────────────────────────────────────────────────

interface Profile {
  id: string;
  profileType: string;
  sectionB: Record<string, unknown> | null;
  sectionC: Record<string, unknown> | null;
  sectionD: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

interface ProfileListResponse {
  profiles: Profile[];
  total: number;
  page: number;
  limit: number;
}

// ── Profile Hooks ──────────────────────────────────────────────────────────

export function useProfiles(page = 1, limit = 20, search?: string) {
  return useQuery({
    queryKey: ['profiles', page, limit, search],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: ProfileListResponse }>(
        '/api/profiles',
        { params: { page, limit, ...(search ? { search } : {}) } },
      );
      return res.data.data;
    },
  });
}

export function useProfile(id: string) {
  return useQuery({
    queryKey: ['profiles', id],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Profile }>(`/api/profiles/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** Convert paisa to formatted INR string (e.g., 10050 → "₹101") */
export function formatPaisa(paisa: number): string {
  return inrFormatter.format(paisa / 100);
}
