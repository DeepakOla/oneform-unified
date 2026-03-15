import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ProfileType = 'student' | 'farmer' | 'business' | 'professional' | 'general';

interface WizardState {
  currentStep: number;
  profileType: ProfileType | null;
  sectionA: Record<string, unknown>;
  sectionB: Record<string, unknown>;
  sectionC: Record<string, unknown>;
  sectionD: Record<string, unknown>;
  setStep: (step: number) => void;
  setProfileType: (type: ProfileType) => void;
  updateSectionA: (data: Record<string, unknown>) => void;
  updateSectionB: (data: Record<string, unknown>) => void;
  updateSectionC: (data: Record<string, unknown>) => void;
  updateSectionD: (data: Record<string, unknown>) => void;
  reset: () => void;
}

const initialState = {
  currentStep: 0,
  profileType: null as ProfileType | null,
  sectionA: {},
  sectionB: {},
  sectionC: {},
  sectionD: {},
};

export const useWizardStore = create<WizardState>()(
  persist(
    (set) => ({
      ...initialState,
      setStep: (step) => set({ currentStep: step }),
      setProfileType: (type) => set({ profileType: type }),
      updateSectionA: (data) => set({ sectionA: data }),
      updateSectionB: (data) => set({ sectionB: data }),
      updateSectionC: (data) => set({ sectionC: data }),
      updateSectionD: (data) => set({ sectionD: data }),
      reset: () => set(initialState),
    }),
    {
      name: 'oneform-profile-wizard',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
