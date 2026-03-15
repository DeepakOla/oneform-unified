import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { useWizardStore } from '@/stores/profile-wizard.store';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
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

interface SectionBFormValues {
  casteCategory: string;
  subCaste: string;
  religion: string;
  maritalStatus: string;
  incomeBracket: string;
  bplCard: boolean;
  bplCardNumber: string;
  hasDisability: boolean;
  disabilityPercentage: string;
  domicileState: string;
  exServiceman: boolean;
  voterId: string;
}

export function SectionBStep() {
  const { t } = useTranslation();
  const { sectionB, updateSectionB } = useWizardStore();

  const defaultValues: SectionBFormValues = {
    casteCategory: (sectionB.caste as Record<string, string>)?.category ?? '',
    subCaste: (sectionB.caste as Record<string, string>)?.subCaste ?? '',
    religion: (sectionB.religion as string) ?? '',
    maritalStatus: (sectionB.maritalStatus as string) ?? '',
    incomeBracket: (sectionB.income as Record<string, string>)?.bracket ?? '',
    bplCard: (sectionB.income as Record<string, boolean>)?.bplCard ?? false,
    bplCardNumber: (sectionB.income as Record<string, string>)?.bplCardNumber ?? '',
    hasDisability: (sectionB.disability as Record<string, boolean>)?.hasDisability ?? false,
    disabilityPercentage: String((sectionB.disability as Record<string, number>)?.percentage ?? ''),
    domicileState: (sectionB.domicile as Record<string, string>)?.state ?? '',
    exServiceman: (sectionB.exServiceman as boolean) ?? false,
    voterId: (sectionB.voterId as string) ?? '',
  };

  const form = useForm<SectionBFormValues>({ defaultValues });

  const saveToStore = (values: SectionBFormValues) => {
    const data: Record<string, unknown> = {
      nationality: 'Indian',
    };

    if (values.casteCategory) {
      data.caste = {
        category: values.casteCategory,
        ...(values.subCaste ? { subCaste: values.subCaste } : {}),
      };
    }
    if (values.religion) data.religion = values.religion;
    if (values.maritalStatus) data.maritalStatus = values.maritalStatus;
    if (values.incomeBracket || values.bplCard) {
      data.income = {
        ...(values.incomeBracket ? { bracket: values.incomeBracket } : {}),
        ...(values.bplCard ? { bplCard: true } : {}),
        ...(values.bplCardNumber ? { bplCardNumber: values.bplCardNumber } : {}),
      };
    }
    if (values.hasDisability) {
      data.disability = {
        hasDisability: true,
        ...(values.disabilityPercentage ? { percentage: Number(values.disabilityPercentage) } : {}),
      };
    }
    if (values.domicileState) {
      data.domicile = { state: values.domicileState };
    }
    if (values.exServiceman) data.exServiceman = true;
    if (values.voterId) data.voterId = values.voterId;

    updateSectionB(data);
  };

  // Save to store when leaving the step
  useEffect(() => {
    return () => {
      saveToStore(form.getValues());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const watchBpl = form.watch('bplCard');
  const watchDisability = form.watch('hasDisability');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t('wizard.sectionB.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('wizard.sectionB.subtitle')}</p>
      </div>

      <Form {...form}>
        <form className="space-y-6">
          {/* Caste & Religion */}
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="casteCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionB.casteCategory')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="general">{t('wizard.sectionB.general')}</SelectItem>
                      <SelectItem value="obc">{t('wizard.sectionB.obc')}</SelectItem>
                      <SelectItem value="sc">{t('wizard.sectionB.sc')}</SelectItem>
                      <SelectItem value="st">{t('wizard.sectionB.st')}</SelectItem>
                      <SelectItem value="ews">{t('wizard.sectionB.ews')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subCaste"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionB.subCaste')}</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="religion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionB.religion')}</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* Marital Status & Income */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="maritalStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionB.maritalStatus')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="single">{t('wizard.sectionB.single')}</SelectItem>
                      <SelectItem value="married">{t('wizard.sectionB.married')}</SelectItem>
                      <SelectItem value="divorced">{t('wizard.sectionB.divorced')}</SelectItem>
                      <SelectItem value="widowed">{t('wizard.sectionB.widowed')}</SelectItem>
                      <SelectItem value="separated">{t('wizard.sectionB.separated')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="incomeBracket"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionB.incomeBracket')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="below_1l">{t('wizard.sectionB.below1l')}</SelectItem>
                      <SelectItem value="1l_3l">{t('wizard.sectionB.1l3l')}</SelectItem>
                      <SelectItem value="3l_5l">{t('wizard.sectionB.3l5l')}</SelectItem>
                      <SelectItem value="5l_10l">{t('wizard.sectionB.5l10l')}</SelectItem>
                      <SelectItem value="above_10l">{t('wizard.sectionB.above10l')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* BPL Card */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="bplCard"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal">{t('wizard.sectionB.bplCard')}</FormLabel>
                </FormItem>
              )}
            />
            {watchBpl && (
              <FormField
                control={form.control}
                name="bplCardNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('wizard.sectionB.bplCardNumber')}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <Separator />

          {/* Disability */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="hasDisability"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal">{t('wizard.sectionB.disability')}</FormLabel>
                </FormItem>
              )}
            />
            {watchDisability && (
              <FormField
                control={form.control}
                name="disabilityPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('wizard.sectionB.disabilityPercentage')}</FormLabel>
                    <FormControl><Input type="number" min={0} max={100} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          {/* Domicile, Ex-Serviceman, Voter ID */}
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="domicileState"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionB.domicileState')}</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="exServiceman"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-3 space-y-0 pt-8">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal">{t('wizard.sectionB.exServiceman')}</FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="voterId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionB.voterId')}</FormLabel>
                  <FormControl><Input maxLength={10} placeholder="ABC1234567" className="uppercase" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </form>
      </Form>
    </div>
  );
}
