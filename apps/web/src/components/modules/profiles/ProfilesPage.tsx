import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProfiles } from '@/hooks/use-api';
import {
  Users,
  Plus,
  Search,
  Eye,
  MoreHorizontal,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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

const PROFILE_TYPE_COLORS: Record<string, string> = {
  student: 'bg-blue-100 text-blue-700',
  farmer: 'bg-green-100 text-green-700',
  business: 'bg-purple-100 text-purple-700',
  professional: 'bg-orange-100 text-orange-700',
  general: 'bg-gray-100 text-gray-700',
};

function ProfileTypeBadge({ type }: { type: string }) {
  const { t } = useTranslation();
  const colorClass = PROFILE_TYPE_COLORS[type] ?? PROFILE_TYPE_COLORS.general;
  const label = t(`profiles.${type}`, { defaultValue: type });
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${colorClass}`}>
      {label}
    </span>
  );
}

function calculateCompletion(profile: {
  sectionB: Record<string, unknown> | null;
  sectionC: Record<string, unknown> | null;
  sectionD: Record<string, unknown> | null;
}): number {
  let filled = 0;
  const total = 4; // A, B, C, D
  // Section A is always encrypted (assume filled if profile exists)
  filled += 1;
  if (profile.sectionB && Object.keys(profile.sectionB).length > 0) filled += 1;
  if (profile.sectionC && Object.keys(profile.sectionC).length > 0) filled += 1;
  if (profile.sectionD && Object.keys(profile.sectionD).length > 0) filled += 1;
  return Math.round((filled / total) * 100);
}

export default function ProfilesPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [page] = useState(1);
  const { data, isLoading } = useProfiles(page, 20, search || undefined);

  const profiles = data?.profiles ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('profiles.title')}</h1>
          <p className="text-muted-foreground">{t('profiles.subtitle')}</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t('profiles.createNew')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('profiles.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : profiles.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-muted-foreground/30 p-10 text-center">
              <Users className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">{t('profiles.noProfiles')}</p>
              <Button variant="outline" className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                {t('profiles.createNew')}
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('profiles.type')}</TableHead>
                    <TableHead>{t('profiles.completion')}</TableHead>
                    <TableHead>{t('profiles.lastUpdated')}</TableHead>
                    <TableHead className="text-right">{t('profiles.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => {
                    const completion = calculateCompletion(profile);
                    return (
                      <TableRow key={profile.id}>
                        <TableCell>
                          <ProfileTypeBadge type={profile.profileType} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  completion >= 75
                                    ? 'bg-emerald-500'
                                    : completion >= 50
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                }`}
                                style={{ width: `${completion}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {completion}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(profile.updatedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground text-right mt-2">
                {t('common.showing', { count: profiles.length, total: data?.total ?? profiles.length })}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
