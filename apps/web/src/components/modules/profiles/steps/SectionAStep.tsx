import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWizardStore } from '@/stores/profile-wizard.store';
import { Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
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

// Simplified SectionA schema for the wizard (less strict than server-side)
const sectionAFormSchema = z.object({
  firstName: z.string().min(1, 'Required').max(50),
  middleName: z.string().max(50).optional().or(z.literal('')),
  lastName: z.string().min(1, 'Required').max(50),
  fatherName: z.string().max(150).optional().or(z.literal('')),
  motherName: z.string().max(150).optional().or(z.literal('')),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
  bloodGroup: z.string().optional().or(z.literal('')),
  phone: z.string().min(10, 'Enter 10-digit mobile number').max(10),
  altPhone: z.string().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  aadhaar: z.string().optional().or(z.literal('')),
  pan: z.string().optional().or(z.literal('')),
  addressType: z.enum(['permanent', 'present', 'correspondence', 'office']),
  line1: z.string().min(3, 'Required').max(200),
  line2: z.string().max(200).optional().or(z.literal('')),
  locality: z.string().max(100).optional().or(z.literal('')),
  city: z.string().min(2, 'Required').max(100),
  district: z.string().min(2, 'Required').max(100),
  state: z.string().min(2, 'Required').max(100),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, '6-digit pincode required'),
  emergencyName: z.string().optional().or(z.literal('')),
  emergencyRelation: z.string().optional().or(z.literal('')),
  emergencyPhone: z.string().optional().or(z.literal('')),
});

type SectionAFormValues = z.infer<typeof sectionAFormSchema>;

export function SectionAStep({ onNext }: { onNext: () => void }) {
  const { t } = useTranslation();
  const { sectionA, updateSectionA } = useWizardStore();

  // Restore from store
  const defaultValues: SectionAFormValues = {
    firstName: (sectionA.name as Record<string, string>)?.first ?? '',
    middleName: (sectionA.name as Record<string, string>)?.middle ?? '',
    lastName: (sectionA.name as Record<string, string>)?.last ?? '',
    fatherName: (sectionA.name as Record<string, string>)?.fatherName ?? '',
    motherName: (sectionA.name as Record<string, string>)?.motherName ?? '',
    dob: (sectionA.dob as string) ?? '',
    gender: (sectionA.gender as SectionAFormValues['gender']) ?? 'male',
    bloodGroup: (sectionA.bloodGroup as string) ?? '',
    phone: (sectionA.phone as string) ?? '',
    altPhone: (sectionA.altPhone as string) ?? '',
    email: (sectionA.email as string) ?? '',
    aadhaar: (sectionA.aadhaar as string) ?? '',
    pan: (sectionA.pan as string) ?? '',
    addressType: ((sectionA.addresses as Record<string, unknown>[])?.[0]?.type as SectionAFormValues['addressType']) ?? 'permanent',
    line1: ((sectionA.addresses as Record<string, unknown>[])?.[0]?.line1 as string) ?? '',
    line2: ((sectionA.addresses as Record<string, unknown>[])?.[0]?.line2 as string) ?? '',
    locality: ((sectionA.addresses as Record<string, unknown>[])?.[0]?.locality as string) ?? '',
    city: ((sectionA.addresses as Record<string, unknown>[])?.[0]?.city as string) ?? '',
    district: ((sectionA.addresses as Record<string, unknown>[])?.[0]?.district as string) ?? '',
    state: ((sectionA.addresses as Record<string, unknown>[])?.[0]?.state as string) ?? '',
    pincode: ((sectionA.addresses as Record<string, unknown>[])?.[0]?.pincode as string) ?? '',
    emergencyName: (sectionA.emergencyContact as Record<string, string>)?.name ?? '',
    emergencyRelation: (sectionA.emergencyContact as Record<string, string>)?.relation ?? '',
    emergencyPhone: (sectionA.emergencyContact as Record<string, string>)?.phone ?? '',
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<SectionAFormValues>({ resolver: zodResolver(sectionAFormSchema as any), defaultValues });

  const onSubmit = (values: SectionAFormValues) => {
    const fullName = [values.firstName, values.middleName, values.lastName].filter(Boolean).join(' ');

    const data: Record<string, unknown> = {
      name: {
        first: values.firstName,
        last: values.lastName,
        full: fullName,
        ...(values.middleName ? { middle: values.middleName } : {}),
        ...(values.fatherName ? { fatherName: values.fatherName } : {}),
        ...(values.motherName ? { motherName: values.motherName } : {}),
      },
      dob: values.dob,
      gender: values.gender,
      phone: values.phone,
      addresses: [
        {
          type: values.addressType,
          isPrimary: true,
          line1: values.line1,
          city: values.city,
          district: values.district,
          state: values.state,
          pincode: values.pincode,
          country: 'India',
          ...(values.line2 ? { line2: values.line2 } : {}),
          ...(values.locality ? { locality: values.locality } : {}),
        },
      ],
    };

    if (values.bloodGroup) data.bloodGroup = values.bloodGroup;
    if (values.altPhone) data.altPhone = values.altPhone;
    if (values.email) data.email = values.email;
    if (values.aadhaar) data.aadhaar = values.aadhaar;
    if (values.pan) data.pan = values.pan.toUpperCase();
    if (values.emergencyName && values.emergencyPhone) {
      data.emergencyContact = {
        name: values.emergencyName,
        relation: values.emergencyRelation || '',
        phone: values.emergencyPhone,
      };
    }

    updateSectionA(data);
    onNext();
  };

  // Auto-save to store on unmount (if user navigates away via Back)
  useEffect(() => {
    return () => {
      const values = form.getValues();
      if (values.firstName) {
        const fullName = [values.firstName, values.middleName, values.lastName].filter(Boolean).join(' ');
        updateSectionA({
          name: { first: values.firstName, last: values.lastName, full: fullName },
          dob: values.dob,
          gender: values.gender,
          phone: values.phone,
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t('wizard.sectionA.title')}</h2>
        <div className="flex items-center gap-2 mt-1">
          <Shield className="h-4 w-4 text-emerald-500" />
          <p className="text-xs text-muted-foreground">{t('wizard.sectionA.subtitle')}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} id="section-a-form" className="space-y-6">
          {/* Name Fields */}
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionA.firstName')} *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="middleName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionA.middleName')}</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionA.lastName')} *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="fatherName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionA.fatherName')}</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="motherName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionA.motherName')}</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* DOB, Gender, Blood Group */}
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="dob"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionA.dob')} *</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionA.gender')} *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">{t('wizard.sectionA.male')}</SelectItem>
                      <SelectItem value="female">{t('wizard.sectionA.female')}</SelectItem>
                      <SelectItem value="other">{t('wizard.sectionA.other')}</SelectItem>
                      <SelectItem value="prefer_not_to_say">{t('wizard.sectionA.preferNotToSay')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bloodGroup"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionA.bloodGroup')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                        <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* Contact Info */}
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionA.phone')} *</FormLabel>
                  <FormControl><Input type="tel" maxLength={10} placeholder="9876543210" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="altPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionA.altPhone')}</FormLabel>
                  <FormControl><Input type="tel" maxLength={10} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionA.email')}</FormLabel>
                  <FormControl><Input type="email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Identity Documents */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="aadhaar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionA.aadhaar')}</FormLabel>
                  <FormControl><Input maxLength={12} placeholder="XXXXXXXXXXXX" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionA.pan')}</FormLabel>
                  <FormControl><Input maxLength={10} placeholder="ABCDE1234F" className="uppercase" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* Address */}
          <h3 className="font-medium">{t('wizard.sectionA.addressTitle')}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="addressType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionA.addressType')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="permanent">{t('wizard.sectionA.permanent')}</SelectItem>
                      <SelectItem value="present">{t('wizard.sectionA.present')}</SelectItem>
                      <SelectItem value="correspondence">{t('wizard.sectionA.correspondence')}</SelectItem>
                      <SelectItem value="office">{t('wizard.sectionA.office')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="line1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionA.line1')} *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="line2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionA.line2')}</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="locality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionA.locality')}</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionA.city')} *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="district"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionA.district')} *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionA.state')} *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pincode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionA.pincode')} *</FormLabel>
                  <FormControl><Input maxLength={6} placeholder="110001" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* Emergency Contact */}
          <h3 className="font-medium">{t('wizard.sectionA.emergencyTitle')}</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="emergencyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionA.emergencyName')}</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="emergencyRelation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionA.emergencyRelation')}</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="emergencyPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wizard.sectionA.emergencyPhone')}</FormLabel>
                  <FormControl><Input type="tel" maxLength={10} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Hidden submit — triggered by wizard's Next button via form id */}
          <button type="submit" className="hidden" />
        </form>
      </Form>
    </div>
  );
}
