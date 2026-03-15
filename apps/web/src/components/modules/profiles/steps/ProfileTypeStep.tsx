import { useTranslation } from 'react-i18next';
import { useWizardStore, type ProfileType } from '@/stores/profile-wizard.store';
import { GraduationCap, Tractor, Building2, Briefcase, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const PROFILE_TYPES: {
  type: ProfileType;
  icon: typeof GraduationCap;
  labelKey: string;
  descKey: string;
  color: string;
}[] = [
  {
    type: 'student',
    icon: GraduationCap,
    labelKey: 'profiles.student',
    descKey: 'wizard.typeSelection.studentDesc',
    color: 'border-blue-200 bg-blue-50 hover:border-blue-400 data-[selected=true]:border-blue-500 data-[selected=true]:bg-blue-100',
  },
  {
    type: 'farmer',
    icon: Tractor,
    labelKey: 'profiles.farmer',
    descKey: 'wizard.typeSelection.farmerDesc',
    color: 'border-green-200 bg-green-50 hover:border-green-400 data-[selected=true]:border-green-500 data-[selected=true]:bg-green-100',
  },
  {
    type: 'business',
    icon: Building2,
    labelKey: 'profiles.business',
    descKey: 'wizard.typeSelection.businessDesc',
    color: 'border-purple-200 bg-purple-50 hover:border-purple-400 data-[selected=true]:border-purple-500 data-[selected=true]:bg-purple-100',
  },
  {
    type: 'professional',
    icon: Briefcase,
    labelKey: 'profiles.professional',
    descKey: 'wizard.typeSelection.professionalDesc',
    color: 'border-orange-200 bg-orange-50 hover:border-orange-400 data-[selected=true]:border-orange-500 data-[selected=true]:bg-orange-100',
  },
  {
    type: 'general',
    icon: User,
    labelKey: 'profiles.general',
    descKey: 'wizard.typeSelection.generalDesc',
    color: 'border-gray-200 bg-gray-50 hover:border-gray-400 data-[selected=true]:border-gray-500 data-[selected=true]:bg-gray-100',
  },
];

export function ProfileTypeStep() {
  const { t } = useTranslation();
  const { profileType, setProfileType } = useWizardStore();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold">{t('wizard.typeSelection.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('wizard.typeSelection.subtitle')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PROFILE_TYPES.map(({ type, icon: Icon, labelKey, descKey, color }) => (
          <button
            key={type}
            type="button"
            data-selected={profileType === type}
            onClick={() => setProfileType(type)}
            className={cn(
              'flex flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition-all',
              color,
            )}
          >
            <Icon className="h-8 w-8" />
            <div>
              <h3 className="font-semibold">{t(labelKey)}</h3>
              <p className="text-xs text-muted-foreground mt-1">{t(descKey)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
