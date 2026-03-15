import { useEffect, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { useWizardStore } from '@/stores/profile-wizard.store';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// Student extension fields
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StudentFields({ form }: { form: any }) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={form.control}
        name="ext_currentInstitution"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('wizard.sectionD.currentInstitution')}</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="ext_currentClass"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('wizard.sectionD.currentClass')}</FormLabel>
            <FormControl><Input placeholder="B.Tech 2nd Year" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="ext_stream"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('wizard.sectionD.stream')}</FormLabel>
            <FormControl><Input placeholder="Science / Commerce / Arts" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="ext_rollNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('wizard.sectionD.rollNumber')}</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

// Farmer extension fields
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FarmerFields({ form }: { form: any }) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={form.control}
        name="ext_totalAcres"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('wizard.sectionD.landHolding')}</FormLabel>
            <FormControl><Input type="number" min={0} step={0.1} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="ext_irrigatedAcres"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('wizard.sectionD.irrigatedAcres')}</FormLabel>
            <FormControl><Input type="number" min={0} step={0.1} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="ext_pmKisanId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('wizard.sectionD.pmKisanId')}</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="ext_irrigationSource"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('wizard.sectionD.irrigationSource')}</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="canal">{t('wizard.sectionD.canal')}</SelectItem>
                <SelectItem value="borewell">{t('wizard.sectionD.borewell')}</SelectItem>
                <SelectItem value="rainwater">{t('wizard.sectionD.rainwater')}</SelectItem>
                <SelectItem value="drip">{t('wizard.sectionD.drip')}</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

// Business extension fields
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BusinessFields({ form }: { form: any }) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={form.control}
        name="ext_gstin"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('wizard.sectionD.gstin')}</FormLabel>
            <FormControl><Input maxLength={15} className="uppercase" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="ext_udyamNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('wizard.sectionD.udyamNumber')}</FormLabel>
            <FormControl><Input placeholder="UDYAM-XX-00-0000000" className="uppercase" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="ext_businessType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('wizard.sectionD.businessType')}</FormLabel>
            <FormControl><Input placeholder="Proprietorship, Pvt Ltd, ..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="ext_employeeCount"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('wizard.sectionD.employeeCount')}</FormLabel>
            <FormControl><Input type="number" min={0} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

// Professional extension fields
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProfessionalFields({ form }: { form: any }) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={form.control}
        name="ext_professionalBody"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('wizard.sectionD.professionalBody')}</FormLabel>
            <FormControl><Input placeholder="ICAI, BCI, MCI, ..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="ext_membershipNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('wizard.sectionD.membershipNumber')}</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="ext_practiceType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('wizard.sectionD.practiceType')}</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="public">{t('wizard.sectionD.public')}</SelectItem>
                <SelectItem value="private">{t('wizard.sectionD.private')}</SelectItem>
                <SelectItem value="partnership">{t('wizard.sectionD.partnership')}</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="ext_specialization"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('wizard.sectionD.specialization')}</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

export function SectionDStep() {
  const { t } = useTranslation();
  const { profileType, sectionD, updateSectionD } = useWizardStore();

  const [tags, setTags] = useState<string[]>(() => (sectionD.tags as string[]) ?? []);
  const [tagInput, setTagInput] = useState('');

  const extFromStore = (sectionD.extension as Record<string, Record<string, unknown>>)?.[profileType ?? ''] ?? {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<any>({
    defaultValues: {
      operatorNotes: (sectionD.operatorNotes as string) ?? '',
      priority: (sectionD.priority as string) ?? 'normal',
      // Student
      ext_currentInstitution: (extFromStore.currentInstitution as string) ?? '',
      ext_currentClass: (extFromStore.currentClass as string) ?? '',
      ext_stream: (extFromStore.stream as string) ?? '',
      ext_rollNumber: (extFromStore.rollNumber as string) ?? '',
      // Farmer
      ext_totalAcres: String((extFromStore.landHolding as Record<string, number>)?.totalAcres ?? ''),
      ext_irrigatedAcres: String((extFromStore.landHolding as Record<string, number>)?.irrigatedAcres ?? ''),
      ext_pmKisanId: (extFromStore.pmKisanId as string) ?? '',
      ext_irrigationSource: (extFromStore.irrigationSource as string) ?? '',
      // Business
      ext_gstin: (extFromStore.gstin as string) ?? '',
      ext_udyamNumber: (extFromStore.udyamNumber as string) ?? '',
      ext_businessType: (extFromStore.businessType as string) ?? '',
      ext_employeeCount: String((extFromStore.employeeCount as number) ?? ''),
      // Professional
      ext_professionalBody: (extFromStore.professionalBody as string) ?? '',
      ext_membershipNumber: (extFromStore.membershipNumber as string) ?? '',
      ext_practiceType: (extFromStore.practiceType as string) ?? '',
      ext_specialization: (extFromStore.specialization as string) ?? '',
    },
  });

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags((prev) => [...prev, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  // Save to store on unmount
  useEffect(() => {
    return () => {
      const values = form.getValues();
      const data: Record<string, unknown> = {};

      if (values.operatorNotes) data.operatorNotes = values.operatorNotes;
      if (values.priority && values.priority !== 'normal') data.priority = values.priority;
      if (tags.length > 0) data.tags = tags;

      // Build extension based on profile type
      if (profileType && profileType !== 'general') {
        const ext: Record<string, unknown> = {};

        if (profileType === 'student') {
          if (values.ext_currentInstitution) ext.currentInstitution = values.ext_currentInstitution;
          if (values.ext_currentClass) ext.currentClass = values.ext_currentClass;
          if (values.ext_stream) ext.stream = values.ext_stream;
          if (values.ext_rollNumber) ext.rollNumber = values.ext_rollNumber;
        } else if (profileType === 'farmer') {
          if (values.ext_totalAcres) {
            ext.landHolding = {
              totalAcres: Number(values.ext_totalAcres),
              irrigatedAcres: Number(values.ext_irrigatedAcres) || 0,
              rainfedAcres: Math.max(0, Number(values.ext_totalAcres) - (Number(values.ext_irrigatedAcres) || 0)),
            };
          }
          if (values.ext_pmKisanId) ext.pmKisanId = values.ext_pmKisanId;
          if (values.ext_irrigationSource) ext.irrigationSource = values.ext_irrigationSource;
        } else if (profileType === 'business') {
          if (values.ext_gstin) ext.gstin = values.ext_gstin;
          if (values.ext_udyamNumber) ext.udyamNumber = values.ext_udyamNumber;
          if (values.ext_businessType) ext.businessType = values.ext_businessType;
          if (values.ext_employeeCount) ext.employeeCount = Number(values.ext_employeeCount);
        } else if (profileType === 'professional') {
          if (values.ext_professionalBody) ext.professionalBody = values.ext_professionalBody;
          if (values.ext_membershipNumber) ext.membershipNumber = values.ext_membershipNumber;
          if (values.ext_practiceType) ext.practiceType = values.ext_practiceType;
          if (values.ext_specialization) ext.specialization = values.ext_specialization;
        }

        if (Object.keys(ext).length > 0) {
          data.extension = { [profileType]: ext };
        }
      }

      updateSectionD(data);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tags, profileType]);

  const typeLabel = t(`profiles.${profileType ?? 'general'}`);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t('wizard.sectionD.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('wizard.sectionD.subtitle')}</p>
      </div>

      <Form {...form}>
        <form className="space-y-6">
          {/* Common fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionD.priority')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">{t('wizard.sectionD.low')}</SelectItem>
                      <SelectItem value="normal">{t('wizard.sectionD.normal')}</SelectItem>
                      <SelectItem value="high">{t('wizard.sectionD.high')}</SelectItem>
                      <SelectItem value="urgent">{t('wizard.sectionD.urgent')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2">
              <FormLabel>{t('wizard.sectionD.tags')}</FormLabel>
              <div className="flex flex-wrap gap-1 mb-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder={t('wizard.sectionD.tagsPlaceholder')}
              />
            </div>
          </div>

          <FormField
            control={form.control}
            name="operatorNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('wizard.sectionD.operatorNotes')}</FormLabel>
                <FormControl><Textarea rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Profile type extension */}
          {profileType && profileType !== 'general' && (
            <>
              <Separator />
              <h3 className="font-medium">{t('wizard.sectionD.extensionTitle', { type: typeLabel })}</h3>
              {profileType === 'student' && <StudentFields form={form} />}
              {profileType === 'farmer' && <FarmerFields form={form} />}
              {profileType === 'business' && <BusinessFields form={form} />}
              {profileType === 'professional' && <ProfessionalFields form={form} />}
            </>
          )}
        </form>
      </Form>
    </div>
  );
}
