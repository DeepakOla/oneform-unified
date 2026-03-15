import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProfile, useSectionA } from '@/hooks/use-api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Edit,
  Eye,
  EyeOff,
  Lock,
  Shield,
  AlertTriangle,
  User,
  GraduationCap,
  Settings2,
} from 'lucide-react';

const PROFILE_TYPE_COLORS: Record<string, string> = {
  student: 'bg-blue-100 text-blue-700',
  farmer: 'bg-green-100 text-green-700',
  business: 'bg-purple-100 text-purple-700',
  professional: 'bg-orange-100 text-orange-700',
  general: 'bg-gray-100 text-gray-700',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-700',
  PENDING_VERIFICATION: 'bg-blue-100 text-blue-700',
  VERIFIED: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-red-100 text-red-700',
};

/** Render an object as key:value pairs, skipping nulls */
function DataGrid({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(
    ([, v]) => v !== null && v !== undefined && v !== '',
  );
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No data</p>;
  }
  return (
    <dl className="grid grid-cols-1 gap-y-2 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="space-y-0.5">
          <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
          </dt>
          <dd className="text-sm font-medium">
            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function ProfileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [sectionAEnabled, setSectionAEnabled] = useState(false);
  const [sectionAVisible, setSectionAVisible] = useState(false);

  const { data: profile, isLoading } = useProfile(id ?? '');
  const sectionAQuery = useSectionA(id ?? '', sectionAEnabled);

  const handleViewSectionA = () => {
    if (!sectionAEnabled) {
      setSectionAEnabled(true);
      setSectionAVisible(true);
      toast({
        title: 'Access Logged',
        description: 'This access to personal info has been recorded in your audit trail.',
      });
    } else {
      setSectionAVisible((v) => !v);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-muted-foreground">
        <AlertTriangle className="h-10 w-10" />
        <p>Profile not found.</p>
        <Button variant="outline" onClick={() => navigate('/dashboard/profiles')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Profiles
        </Button>
      </div>
    );
  }

  const completion = profile.completeness ?? 0;
  const typeColor = PROFILE_TYPE_COLORS[profile.profileType] ?? PROFILE_TYPE_COLORS.general;
  const statusColor = STATUS_COLORS[profile.status] ?? STATUS_COLORS.DRAFT;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 mb-1"
            onClick={() => navigate('/dashboard/profiles')}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t('common.back')}
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${typeColor}`}>
              {t(`profiles.${profile.profileType}`, { defaultValue: profile.profileType })}
            </span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>
              {profile.status}
            </span>
            {profile.profileCode && (
              <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {profile.profileCode}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <Progress value={completion} className="w-32 h-2" />
            <span className="text-sm text-muted-foreground">{completion}% complete</span>
          </div>
        </div>
        <Button asChild>
          <Link to={`/dashboard/profiles/${profile.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            {t('profiles.editProfile')}
          </Link>
        </Button>
      </div>

      {/* Profile sections grid */}
      <div className="grid gap-6 md:grid-cols-2">

        {/* Section A — Encrypted PII */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="h-7 w-7 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Lock className="h-3.5 w-3.5 text-destructive" />
              </div>
              Section A — Personal Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!sectionAVisible ? (
              <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 p-5 text-center space-y-3">
                <div className="flex justify-center">
                  <div className="rounded-full bg-muted p-3">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">Encrypted at rest</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Contains Aadhaar, PAN, biometrics — AES-256-GCM
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewSectionA}
                  disabled={sectionAQuery.isLoading}
                  className="gap-1.5"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {sectionAQuery.isLoading ? 'Decrypting...' : 'View Personal Info'}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="destructive" className="text-xs gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Access Logged
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => setSectionAVisible(false)} className="h-6 gap-1 text-xs">
                    <EyeOff className="h-3 w-3" />
                    Hide
                  </Button>
                </div>
                <Separator />
                {sectionAQuery.data ? (
                  <DataGrid data={sectionAQuery.data} />
                ) : (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section B — Demographics */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              Section B — Demographics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profile.sectionB && Object.keys(profile.sectionB).length > 0 ? (
              <DataGrid data={profile.sectionB} />
            ) : (
              <EmptySection
                label="Demographics not filled"
                onFill={() => navigate(`/dashboard/profiles/${profile.id}/edit`)}
              />
            )}
          </CardContent>
        </Card>

        {/* Section C — Qualifications */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="h-7 w-7 rounded-lg bg-[hsl(27,100%,55%)]/10 flex items-center justify-center">
                <GraduationCap className="h-3.5 w-3.5 text-[hsl(27,100%,55%)]" />
              </div>
              Section C — Qualifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profile.sectionC && Object.keys(profile.sectionC).length > 0 ? (
              <DataGrid data={profile.sectionC} />
            ) : (
              <EmptySection
                label="Qualifications not filled"
                onFill={() => navigate(`/dashboard/profiles/${profile.id}/edit`)}
              />
            )}
          </CardContent>
        </Card>

        {/* Section D — Operational */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="h-7 w-7 rounded-lg bg-[hsl(135,70%,31%)]/10 flex items-center justify-center">
                <Settings2 className="h-3.5 w-3.5 text-[hsl(135,70%,31%)]" />
              </div>
              Section D — Operational
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profile.sectionD && Object.keys(profile.sectionD).length > 0 ? (
              <DataGrid data={profile.sectionD} />
            ) : (
              <EmptySection
                label="Operational data not filled"
                onFill={() => navigate(`/dashboard/profiles/${profile.id}/edit`)}
              />
            )}
          </CardContent>
        </Card>

      </div>

      {/* Metadata footer */}
      <div className="text-xs text-muted-foreground flex flex-wrap gap-4">
        <span>Created: {new Date(profile.createdAt).toLocaleString('en-IN')}</span>
        <span>Updated: {new Date(profile.updatedAt).toLocaleString('en-IN')}</span>
      </div>

    </div>
  );
}

function EmptySection({ label, onFill }: { label: string; onFill: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
      <Button variant="outline" size="sm" onClick={onFill}>
        <Edit className="mr-1.5 h-3.5 w-3.5" />
        Fill Now
      </Button>
    </div>
  );
}