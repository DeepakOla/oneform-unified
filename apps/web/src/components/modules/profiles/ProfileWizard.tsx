import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useWizardStore } from '@/stores/profile-wizard.store';
import { useCreateProfile } from '@/hooks/use-api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProfileTypeStep } from './steps/ProfileTypeStep';
import { SectionAStep } from './steps/SectionAStep';
import { SectionBStep } from './steps/SectionBStep';
import { SectionCStep } from './steps/SectionCStep';
import { SectionDStep } from './steps/SectionDStep';

const STEP_KEYS = ['type', 'personal', 'demographics', 'qualifications', 'operational'] as const;

export default function ProfileWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const createProfile = useCreateProfile();

  const {
    currentStep,
    profileType,
    sectionA,
    sectionB,
    sectionC,
    sectionD,
    setStep,
    reset,
  } = useWizardStore();

  const canGoNext = () => {
    if (currentStep === 0) return profileType !== null;
    return true; // Sections B/C/D are optional, Section A validated by form
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setStep(currentStep - 1);
    } else {
      navigate('/dashboard/profiles');
    }
  };

  const handleSubmit = async () => {
    if (!profileType) return;

    const payload: Record<string, unknown> = { profileType };

    if (Object.keys(sectionA).length > 0) {
      payload.sectionA = sectionA;
    }
    if (Object.keys(sectionB).length > 0) {
      payload.sectionB = sectionB;
    }
    if (Object.keys(sectionC).length > 0) {
      payload.sectionC = sectionC;
    }
    if (Object.keys(sectionD).length > 0) {
      payload.sectionD = sectionD;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await createProfile.mutateAsync(payload as any);
      reset();
      toast({
        title: t('wizard.success'),
      });
      navigate('/dashboard/profiles');
    } catch {
      // Error handled by TanStack Query
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <ProfileTypeStep />;
      case 1:
        return <SectionAStep onNext={handleNext} />;
      case 2:
        return <SectionBStep />;
      case 3:
        return <SectionCStep />;
      case 4:
        return <SectionDStep />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('wizard.title')}</h1>
        <p className="text-muted-foreground">{t('wizard.subtitle')}</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between">
        {STEP_KEYS.map((key, index) => (
          <div key={key} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                  index < currentStep
                    ? 'bg-primary text-primary-foreground'
                    : index === currentStep
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {index < currentStep ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span className={cn(
                'text-xs hidden sm:block',
                index <= currentStep ? 'text-foreground font-medium' : 'text-muted-foreground',
              )}>
                {t(`wizard.steps.${key}`)}
              </span>
            </div>
            {index < STEP_KEYS.length - 1 && (
              <div className={cn(
                'h-0.5 flex-1 mx-2',
                index < currentStep ? 'bg-primary' : 'bg-muted',
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Current step content */}
      <Card>
        <CardContent className="pt-6">
          {renderStep()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back')}
        </Button>

        <div className="flex gap-2">
          {currentStep > 0 && currentStep < 4 && (
            <Button variant="ghost" onClick={handleNext}>
              {t('wizard.skipSection')}
            </Button>
          )}

          {currentStep < 4 ? (
            <Button
              onClick={handleNext}
              disabled={!canGoNext()}
            >
              {t('common.next')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={createProfile.isPending}
            >
              {createProfile.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('wizard.creating')}
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {t('common.submit')}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
