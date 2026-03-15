import { useEffect, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { useWizardStore } from '@/stores/profile-wizard.store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, X } from 'lucide-react';
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

interface EducationEntry {
  id: string;
  level: string;
  degree: string;
  institution: string;
  board: string;
  endYear: string;
  marksType: string;
  marksValue: string;
}

interface LanguageEntry {
  language: string;
  proficiency: string;
}

interface SectionCFormValues {
  level: string;
  degree: string;
  institution: string;
  board: string;
  endYear: string;
  marksType: string;
  marksValue: string;
}

export function SectionCStep() {
  const { t } = useTranslation();
  const { sectionC, updateSectionC } = useWizardStore();

  // Initialize education list from store
  const [educationList, setEducationList] = useState<EducationEntry[]>(() => {
    const stored = (sectionC.education as EducationEntry[]) ?? [];
    return stored.length > 0 ? stored : [];
  });

  const [skills, setSkills] = useState<string[]>(() => (sectionC.skills as string[]) ?? []);
  const [skillInput, setSkillInput] = useState('');

  const [languages, setLanguages] = useState<LanguageEntry[]>(() =>
    (sectionC.languages as LanguageEntry[]) ?? [],
  );

  const form = useForm<SectionCFormValues>({
    defaultValues: {
      level: '10th',
      degree: '',
      institution: '',
      board: '',
      endYear: '',
      marksType: 'percentage',
      marksValue: '',
    },
  });

  const addEducation = () => {
    const values = form.getValues();
    if (!values.institution || !values.endYear) return;

    const entry: EducationEntry = {
      id: crypto.randomUUID(),
      level: values.level,
      degree: values.degree,
      institution: values.institution,
      board: values.board,
      endYear: values.endYear,
      marksType: values.marksType,
      marksValue: values.marksValue,
    };

    setEducationList((prev) => [...prev, entry]);
    form.reset({
      level: '10th',
      degree: '',
      institution: '',
      board: '',
      endYear: '',
      marksType: 'percentage',
      marksValue: '',
    });
  };

  const removeEducation = (id: string) => {
    setEducationList((prev) => prev.filter((e) => e.id !== id));
  };

  const handleSkillKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      if (!skills.includes(skillInput.trim())) {
        setSkills((prev) => [...prev, skillInput.trim()]);
      }
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
  };

  const [langForm, setLangForm] = useState({ language: '', proficiency: 'intermediate' });

  const addLanguage = () => {
    if (!langForm.language) return;
    setLanguages((prev) => [...prev, { ...langForm }]);
    setLangForm({ language: '', proficiency: 'intermediate' });
  };

  const removeLanguage = (index: number) => {
    setLanguages((prev) => prev.filter((_, i) => i !== index));
  };

  // Save to store on unmount
  useEffect(() => {
    return () => {
      const data: Record<string, unknown> = {};

      if (educationList.length > 0) {
        data.education = educationList.map((e) => ({
          id: e.id,
          type: e.level === 'below_10th' || e.level === '10th' || e.level === '12th' ? 'school' : 'graduate',
          level: e.level,
          institution: e.institution,
          endYear: Number(e.endYear),
          marks: {
            type: e.marksType,
            value: e.marksType === 'grade' ? e.marksValue : Number(e.marksValue),
            ...(e.marksType === 'percentage' ? { outOf: 100 } : {}),
            ...(e.marksType === 'cgpa' ? { outOf: 10 } : {}),
          },
          ...(e.degree ? { degree: e.degree } : {}),
          ...(e.board ? { board: e.board } : {}),
        }));
      }

      if (skills.length > 0) data.skills = skills;
      if (languages.length > 0) {
        data.languages = languages.map((l) => ({
          language: l.language,
          proficiency: l.proficiency,
          canRead: true,
          canWrite: true,
          canSpeak: true,
        }));
      }

      updateSectionC(data);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [educationList, skills, languages]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t('wizard.sectionC.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('wizard.sectionC.subtitle')}</p>
      </div>

      {/* Education List */}
      <div className="space-y-3">
        <h3 className="font-medium">{t('wizard.sectionC.educationTitle')}</h3>

        {educationList.length > 0 && (
          <div className="space-y-2">
            {educationList.map((edu) => (
              <div key={edu.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <span className="font-medium">{edu.institution}</span>
                  <span className="text-muted-foreground ml-2">
                    ({edu.level}{edu.degree ? ` — ${edu.degree}` : ''}, {edu.endYear})
                  </span>
                  {edu.marksValue && (
                    <span className="text-muted-foreground ml-2">
                      {edu.marksValue}{edu.marksType === 'percentage' ? '%' : edu.marksType === 'cgpa' ? ' CGPA' : ''}
                    </span>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeEducation(edu.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add education form */}
        <Form {...form}>
          <div className="rounded-lg border p-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('wizard.sectionC.educationLevel')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="below_10th">Below 10th</SelectItem>
                        <SelectItem value="10th">10th</SelectItem>
                        <SelectItem value="12th">12th</SelectItem>
                        <SelectItem value="diploma">Diploma</SelectItem>
                        <SelectItem value="graduate">Graduate</SelectItem>
                        <SelectItem value="postgraduate">Postgraduate</SelectItem>
                        <SelectItem value="doctorate">Doctorate</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="degree"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('wizard.sectionC.degree')}</FormLabel>
                    <FormControl><Input placeholder="B.Tech, M.Sc., ..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="institution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('wizard.sectionC.institution')} *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <FormField
                control={form.control}
                name="board"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('wizard.sectionC.board')}</FormLabel>
                    <FormControl><Input placeholder="CBSE, ICSE, ..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('wizard.sectionC.endYear')} *</FormLabel>
                    <FormControl><Input type="number" min={1950} max={2030} placeholder="2024" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="marksType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('wizard.sectionC.marksType')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="percentage">{t('wizard.sectionC.percentage')}</SelectItem>
                        <SelectItem value="cgpa">{t('wizard.sectionC.cgpa')}</SelectItem>
                        <SelectItem value="grade">{t('wizard.sectionC.grade')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="marksValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('wizard.sectionC.marksValue')}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addEducation}>
              <Plus className="mr-2 h-4 w-4" />
              {t('wizard.sectionC.addEducation')}
            </Button>
          </div>
        </Form>
      </div>

      <Separator />

      {/* Skills */}
      <div className="space-y-3">
        <h3 className="font-medium">{t('wizard.sectionC.skillsTitle')}</h3>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <Badge key={skill} variant="secondary" className="gap-1">
              {skill}
              <button type="button" onClick={() => removeSkill(skill)} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <Input
          value={skillInput}
          onChange={(e) => setSkillInput(e.target.value)}
          onKeyDown={handleSkillKeyDown}
          placeholder={t('wizard.sectionC.skillsPlaceholder')}
        />
      </div>

      <Separator />

      {/* Languages */}
      <div className="space-y-3">
        <h3 className="font-medium">{t('wizard.sectionC.languagesTitle')}</h3>
        {languages.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {languages.map((lang, i) => (
              <Badge key={`${lang.language}-${i}`} variant="outline" className="gap-1">
                {lang.language} ({lang.proficiency})
                <button type="button" onClick={() => removeLanguage(i)} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={langForm.language}
            onChange={(e) => setLangForm((prev) => ({ ...prev, language: e.target.value }))}
            placeholder={t('wizard.sectionC.language')}
            className="flex-1"
          />
          <select
            value={langForm.proficiency}
            onChange={(e) => setLangForm((prev) => ({ ...prev, proficiency: e.target.value }))}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          >
            <option value="basic">{t('wizard.sectionC.basic')}</option>
            <option value="intermediate">{t('wizard.sectionC.intermediate')}</option>
            <option value="fluent">{t('wizard.sectionC.fluent')}</option>
            <option value="native">{t('wizard.sectionC.native')}</option>
          </select>
          <Button type="button" variant="outline" size="sm" onClick={addLanguage}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
