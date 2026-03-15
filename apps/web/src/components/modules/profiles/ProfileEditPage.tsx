import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useProfile, useUpdateProfile, useSectionA, useUpdateSectionA } from '@/hooks/use-api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Save,
  ArrowLeft,
  AlertTriangle,
  Shield,
  Lock,
  Eye,
  Loader2,
} from 'lucide-react';

export default function ProfileEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();

  const [sectionAEnabled, setSectionAEnabled] = useState(false);

  const { data: profile, isLoading } = useProfile(id ?? '');
  const updateProfile = useUpdateProfile(id ?? '');
  const sectionAQuery = useSectionA(id ?? '', sectionAEnabled);
  const updateSectionA = useUpdateSectionA(id ?? '');

  // Forms for each section
  const formB = useForm<Record<string, string>>({
    defaultValues: {},
    values: (profile?.sectionB as Record<string, string> | null) ?? {},
  });

  const formC = useForm<Record<string, string>>({
    defaultValues: {},
    values: (profile?.sectionC as Record<string, string> | null) ?? {},
  });

  const formD = useForm<Record<string, string>>({
    defaultValues: {},
    values: (profile?.sectionD as Record<string, string> | null) ?? {},
  });

  const formA = useForm<Record<string, string>>({
    defaultValues: {},
  });

  // When Section A data loads, reset formA
  const handleLoadSectionA = () => {
    if (!sectionAEnabled) {
      setSectionAEnabled(true);
      toast({
        title: 'Access Logged',
        description: 'Loading personal info has been recorded in your audit trail.',
      });
    }
  };

  // Once sectionA loads, reset the form
  if (sectionAEnabled && sectionAQuery.data && !sectionAQuery.isLoading) {
    const current = formA.getValues();
    const loaded = sectionAQuery.data as Record<string, string>;
    if (Object.keys(current).length === 0) {
      formA.reset(loaded);
    }
  }

  const handleSaveB = formB.handleSubmit(async (data) => {
    try {
      await updateProfile.mutateAsync({ sectionB: data as Record<string, unknown> });
      toast({ title: 'Section B saved', description: 'Demographics updated successfully.' });
    } catch {
      toast({ variant: 'destructive', title: 'Save failed', description: 'Could not save demographics.' });
    }
  });

  const handleSaveC = formC.handleSubmit(async (data) => {
    try {
      await updateProfile.mutateAsync({ sectionC: data as Record<string, unknown> });
      toast({ title: 'Section C saved', description: 'Qualifications updated successfully.' });
    } catch {
      toast({ variant: 'destructive', title: 'Save failed', description: 'Could not save qualifications.' });
    }
  });

  const handleSaveD = formD.handleSubmit(async (data) => {
    try {
      await updateProfile.mutateAsync({ sectionD: data as Record<string, unknown> });
      toast({ title: 'Section D saved', description: 'Operational data updated successfully.' });
    } catch {
      toast({ variant: 'destructive', title: 'Save failed', description: 'Could not save operational data.' });
    }
  });

  const handleSaveA = formA.handleSubmit(async (data) => {
    try {
      await updateSectionA.mutateAsync(data as Record<string, unknown>);
      toast({ title: 'Personal info updated', description: 'Encrypted and saved securely.' });
    } catch {
      toast({ variant: 'destructive', title: 'Save failed', description: 'Could not update personal info.' });
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
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

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 mb-1"
            onClick={() => navigate(`/dashboard/profiles/${id}`)}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Profile
          </Button>
          <h1 className="text-xl font-bold tracking-tight">
            Edit Profile
            {profile.profileCode && (
              <span className="ml-2 text-sm font-mono text-muted-foreground">
                {profile.profileCode}
              </span>
            )}
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sectionB">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sectionB">Demographics</TabsTrigger>
          <TabsTrigger value="sectionC">Qualifications</TabsTrigger>
          <TabsTrigger value="sectionD">Operational</TabsTrigger>
          <TabsTrigger value="sectionA">
            <Lock className="mr-1 h-3 w-3" />
            Personal Info
          </TabsTrigger>
        </TabsList>

        {/* ── Section B ─────────────────────────────────── */}
        <TabsContent value="sectionB">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('wizard.sectionB.title')}</CardTitle>
              <CardDescription>{t('wizard.sectionB.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveB} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="b-casteCategory">{t('wizard.sectionB.casteCategory')}</Label>
                    <Input id="b-casteCategory" {...formB.register('casteCategory')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="b-religion">{t('wizard.sectionB.religion')}</Label>
                    <Input id="b-religion" {...formB.register('religion')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="b-maritalStatus">{t('wizard.sectionB.maritalStatus')}</Label>
                    <Input id="b-maritalStatus" {...formB.register('maritalStatus')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="b-incomeBracket">{t('wizard.sectionB.incomeBracket')}</Label>
                    <Input id="b-incomeBracket" {...formB.register('incomeBracket')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="b-domicileState">{t('wizard.sectionB.domicileState')}</Label>
                    <Input id="b-domicileState" {...formB.register('domicileState')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="b-voterId">{t('wizard.sectionB.voterId')}</Label>
                    <Input id="b-voterId" {...formB.register('voterId')} />
                  </div>
                </div>

                <Separator />

                <Button type="submit" disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" /> Save Demographics</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Section C ─────────────────────────────────── */}
        <TabsContent value="sectionC">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('wizard.sectionC.title')}</CardTitle>
              <CardDescription>{t('wizard.sectionC.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveC} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="c-highestEducation">{t('wizard.sectionC.educationLevel')}</Label>
                    <Input id="c-highestEducation" {...formC.register('highestEducation')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-degree">{t('wizard.sectionC.degree')}</Label>
                    <Input id="c-degree" {...formC.register('degree')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-institution">{t('wizard.sectionC.institution')}</Label>
                    <Input id="c-institution" {...formC.register('institution')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-board">{t('wizard.sectionC.board')}</Label>
                    <Input id="c-board" {...formC.register('board')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-endYear">{t('wizard.sectionC.endYear')}</Label>
                    <Input id="c-endYear" type="number" {...formC.register('endYear')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-skills">{t('wizard.sectionC.skillsTitle')}</Label>
                    <Input id="c-skills" placeholder="e.g. Computers, English" {...formC.register('skills')} />
                  </div>
                </div>

                <Separator />

                <Button type="submit" disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" /> Save Qualifications</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Section D ─────────────────────────────────── */}
        <TabsContent value="sectionD">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('wizard.sectionD.title')}</CardTitle>
              <CardDescription>{t('wizard.sectionD.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveD} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="d-priority">{t('wizard.sectionD.priority')}</Label>
                    <Input
                      id="d-priority"
                      placeholder="normal / high / urgent"
                      {...formD.register('priority')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="d-tags">{t('wizard.sectionD.tags')}</Label>
                    <Input
                      id="d-tags"
                      placeholder="tag1, tag2"
                      {...formD.register('tags')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="d-operatorNotes">{t('wizard.sectionD.operatorNotes')}</Label>
                  <Textarea
                    id="d-operatorNotes"
                    rows={3}
                    {...formD.register('operatorNotes')}
                  />
                </div>

                {/* Profile-type specific fields */}
                {profile.profileType === 'student' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="d-currentInstitution">{t('wizard.sectionD.currentInstitution')}</Label>
                      <Input id="d-currentInstitution" {...formD.register('currentInstitution')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="d-currentClass">{t('wizard.sectionD.currentClass')}</Label>
                      <Input id="d-currentClass" {...formD.register('currentClass')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="d-stream">{t('wizard.sectionD.stream')}</Label>
                      <Input id="d-stream" {...formD.register('stream')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="d-rollNumber">{t('wizard.sectionD.rollNumber')}</Label>
                      <Input id="d-rollNumber" {...formD.register('rollNumber')} />
                    </div>
                  </div>
                )}

                {profile.profileType === 'farmer' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="d-totalAcres">{t('wizard.sectionD.landHolding')}</Label>
                      <Input id="d-totalAcres" type="number" step="0.01" {...formD.register('totalAcres')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="d-pmKisanId">{t('wizard.sectionD.pmKisanId')}</Label>
                      <Input id="d-pmKisanId" {...formD.register('pmKisanId')} />
                    </div>
                  </div>
                )}

                {profile.profileType === 'business' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="d-gstin">{t('wizard.sectionD.gstin')}</Label>
                      <Input id="d-gstin" {...formD.register('gstin')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="d-udyamNumber">{t('wizard.sectionD.udyamNumber')}</Label>
                      <Input id="d-udyamNumber" {...formD.register('udyamNumber')} />
                    </div>
                  </div>
                )}

                {profile.profileType === 'professional' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="d-professionalBody">{t('wizard.sectionD.professionalBody')}</Label>
                      <Input id="d-professionalBody" {...formD.register('professionalBody')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="d-membershipNumber">{t('wizard.sectionD.membershipNumber')}</Label>
                      <Input id="d-membershipNumber" {...formD.register('membershipNumber')} />
                    </div>
                  </div>
                )}

                <Separator />

                <Button type="submit" disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" /> Save Operational Data</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Section A — Encrypted PII ─────────────────── */}
        <TabsContent value="sectionA">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="h-4 w-4 text-destructive" />
                {t('wizard.sectionA.title')}
              </CardTitle>
              <CardDescription>
                All changes are encrypted with AES-256-GCM immediately on save. Access is permanently logged.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!sectionAEnabled ? (
                <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 p-8 text-center space-y-4">
                  <div className="mx-auto w-fit rounded-full bg-muted p-4">
                    <Shield className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Personal info is encrypted at rest</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Loading this data will be permanently recorded in your audit trail.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleLoadSectionA}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Load Personal Info
                  </Button>
                </div>
              ) : sectionAQuery.isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : (
                <form onSubmit={handleSaveA} className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="a-firstName">{t('wizard.sectionA.firstName')}</Label>
                      <Input
                        id="a-firstName"
                        className="field-sensitive"
                        defaultValue={
                          (sectionAQuery.data?.name as Record<string, string> | undefined)?.first ?? ''
                        }
                        {...formA.register('firstName')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="a-lastName">{t('wizard.sectionA.lastName')}</Label>
                      <Input
                        id="a-lastName"
                        className="field-sensitive"
                        defaultValue={
                          (sectionAQuery.data?.name as Record<string, string> | undefined)?.last ?? ''
                        }
                        {...formA.register('lastName')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="a-phone">{t('wizard.sectionA.phone')}</Label>
                      <Input
                        id="a-phone"
                        className="field-sensitive"
                        defaultValue={String(sectionAQuery.data?.phone ?? '')}
                        {...formA.register('phone')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="a-email">{t('wizard.sectionA.email')}</Label>
                      <Input
                        id="a-email"
                        type="email"
                        defaultValue={String(sectionAQuery.data?.email ?? '')}
                        {...formA.register('email')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="a-aadhaar">{t('wizard.sectionA.aadhaar')}</Label>
                      <Input
                        id="a-aadhaar"
                        className="field-sensitive"
                        placeholder="XXXX XXXX XXXX"
                        {...formA.register('aadhaar')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="a-pan">{t('wizard.sectionA.pan')}</Label>
                      <Input
                        id="a-pan"
                        className="field-sensitive"
                        placeholder="ABCDE1234F"
                        {...formA.register('pan')}
                      />
                    </div>
                  </div>

                  <Separator />

                  <Button type="submit" disabled={updateSectionA.isPending}>
                    {updateSectionA.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Encrypting & Saving...</>
                    ) : (
                      <><Save className="mr-2 h-4 w-4" /> Save Personal Info</>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}
