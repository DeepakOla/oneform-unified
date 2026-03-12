/**
 * OneForm Unified Platform — Profile ABCD Type Definitions
 *
 * Based on production-tested types from OneForm v2.6.5
 * Source: docs/unified-platform/04-DATA-MODELS.md
 *
 * ABCD Profile Structure:
 *   Section A: Personal/Sensitive  → AES-256-GCM encrypted at rest
 *   Section B: Demographics        → Row-Level Security enforced
 *   Section C: Qualifications      → Row-Level Security enforced
 *   Section D: Operational         → Role-specific fields
 *
 * USER TYPES:
 *   - Student    (48 fields)
 *   - Farmer     (51 fields)
 *   - Business   (51 fields)
 *   - Professional (51 fields)
 *
 * IMPORTANT: Dashboard Role ≠ Profile Type
 *   Dashboard Role (CITIZEN/OPERATOR/BUSINESS/ADMIN) is set at signup.
 *   Profile Type (Student/Farmer/Business/Professional) is chosen inside dashboard.
 *   One user can have MULTIPLE profiles (self + family members).
 *
 * @module profile-abcd
 */

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export type ProfileType =
  | "student"
  | "farmer"
  | "business"
  | "professional"
  | "general";

export type ProfileStatus = "DRAFT" | "PENDING_VERIFICATION" | "VERIFIED" | "SUSPENDED";

export type AddressType = "permanent" | "present" | "correspondence" | "office";

export type GenderType = "male" | "female" | "other" | "prefer_not_to_say";

export type MaritalStatus =
  | "single"
  | "married"
  | "divorced"
  | "widowed"
  | "separated";

export type BloodGroup =
  | "A+"
  | "A-"
  | "B+"
  | "B-"
  | "AB+"
  | "AB-"
  | "O+"
  | "O-";

export type CasteCategory = "general" | "obc" | "sc" | "st" | "ews";

export type EducationLevel =
  | "below_10th"
  | "10th"
  | "12th"
  | "diploma"
  | "graduate"
  | "postgraduate"
  | "doctorate";

export type ServiceBranch = "army" | "navy" | "air_force" | "paramilitary";

export type EmploymentType =
  | "full_time"
  | "part_time"
  | "contract"
  | "freelance"
  | "internship"
  | "self_employed";

export type LanguageProficiencyLevel =
  | "basic"
  | "intermediate"
  | "fluent"
  | "native";

export type IncomeBracket =
  | "below_1l"
  | "1l_3l"
  | "3l_5l"
  | "5l_10l"
  | "above_10l";

// ─────────────────────────────────────────────────────────────────────────────
// SECTION A — PERSONAL / SENSITIVE (Encrypted at rest AES-256-GCM)
// Security Level: HIGH
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Indian address with structured components.
 * Supports both raw (single string) and structured formats
 * since different government forms require different formats.
 */
export interface ProfileAddress {
  type: AddressType;
  isPrimary: boolean;
  /** Raw single-line format for forms that need it */
  raw?: string | undefined;
  line1: string;
  line2?: string | undefined;
  locality?: string | undefined;
  city: string;
  district: string;
  state: string;
  pincode: string;
  country: string;
  /** For correspondence/office — duration of stay */
  yearsAtAddress?: number | undefined;
}

/**
 * Name variants — different government forms need different formats.
 * E.g. some need "FirstName LastName", some need "LastName, FirstName",
 * some need initials only.
 */
export interface ProfileName {
  first: string;
  middle?: string | undefined;
  last: string;
  /**
   * Auto-computed: "First Middle Last" (trim + normalize whitespace).
   * Used for forms that accept full name in one field.
   */
  full: string;
  /**
   * Initials format: "F M Last" — used by some state forms.
   * E.g. "R K Sharma"
   */
  initials?: string | undefined;
  fatherName?: string | undefined;
  motherName?: string | undefined;
  spouseName?: string | undefined;
}

/**
 * Section A: Personal and Sensitive Information.
 *
 * SECURITY: This section is encrypted with AES-256-GCM before storage.
 * The Data Encryption Key (DEK) is wrapped by a server-side Key Encryption Key (KEK).
 * Neither the database nor the ORM ever sees plaintext values.
 *
 * Decryption happens: Server-side only, on authenticated requests, with audit log.
 * Encryption happens: At save point (form submit), NOT at display.
 */
export interface SectionA {
  /** 12-digit Aadhaar number — stored encrypted */
  aadhaar?: string | undefined;
  aadhaarVerified?: boolean | undefined;

  /** 10-character PAN — stored encrypted */
  pan?: string | undefined;
  panVerified?: boolean | undefined;

  name: ProfileName;

  /**
   * ISO 8601 date only: "YYYY-MM-DD"
   * E.g. "1990-05-15" — NOT "1990-15-05" (month-first is wrong!)
   */
  dob: string;
  /** Computed field: current age in years */
  age?: number | undefined;

  gender: GenderType;
  bloodGroup?: BloodGroup | undefined;

  /** Primary mobile number — 10 digits, Indian format [6-9]XXXXXXXXX */
  phone: string;
  altPhone?: string | undefined;
  email?: string | undefined;

  addresses: ProfileAddress[];

  /** Passport-size photograph — URL to R2 storage (not base64 in DB!) */
  photoUrl?: string | undefined;
  /** Digital signature image — URL to R2 storage */
  signatureUrl?: string | undefined;
  /** Thumb impression — URL to R2 storage */
  thumbImpressionUrl?: string | undefined;

  emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  } | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION B — DEMOGRAPHICS / CATEGORIES
// Security Level: MEDIUM (Row-Level Security)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Section B: Demographic and Eligibility Information.
 * Used to determine eligibility for government schemes (reservations, subsidies).
 */
export interface SectionB {
  caste?: {
    category: CasteCategory;
    subCaste?: string | undefined;
    certificateNumber?: string | undefined;
    certificateDate?: string | undefined;
    issuingAuthority?: string | undefined;
    issuingState?: string | undefined;
  } | undefined;

  religion?: string | undefined;
  nationality: string; // Default: "Indian"

  maritalStatus?: MaritalStatus | undefined;
  familyMembersCount?: number | undefined;
  dependentsCount?: number | undefined;

  income?: {
    annualAmount?: number | undefined;     // INR
    bracket?: IncomeBracket | undefined;
    bplCard?: boolean | undefined;
    bplCardNumber?: string | undefined;
    rationCardNumber?: string | undefined;
  } | undefined;

  exServiceman?: boolean | undefined;
  exServicemanDetails?: {
    service: ServiceBranch;
    rank?: string | undefined;
    retirementDate?: string | undefined;    // ISO 8601
    ppoNumber?: string | undefined;         // Pension Payment Order
  } | undefined;

  disability?: {
    hasDisability: boolean;
    types?: string[] | undefined;           // ['visual', 'hearing', 'locomotor', 'intellectual']
    percentage?: number | undefined;        // 0-100
    certificateNumber?: string | undefined;
    udidNumber?: string | undefined;        // Unique Disability ID
  } | undefined;

  domicile?: {
    state: string;
    since?: number | undefined;             // Year
    certificateNumber?: string | undefined;
  } | undefined;

  minorityStatus?: boolean | undefined;

  /** Voter ID — not sensitive but used for scheme eligibility */
  voterId?: string | undefined;
  voterIdVerified?: boolean | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION C — QUALIFICATIONS
// Security Level: MEDIUM (Row-Level Security)
// ─────────────────────────────────────────────────────────────────────────────

export interface EducationRecord {
  id: string;
  type: "school" | "diploma" | "graduate" | "postgraduate" | "doctorate";
  level: EducationLevel;
  degree?: string | undefined;           // "B.Tech", "M.Sc.", "MBA"
  institution: string;
  board?: string | undefined;            // "CBSE", "ICSE", "State Board"
  university?: string | undefined;
  startYear?: number | undefined;
  endYear: number;
  marks: {
    type: "percentage" | "cgpa" | "grade";
    value: number | string;
    outOf?: number | undefined;          // 100 for %, 10 for CGPA, undefined for grade
    equivalentPercentage?: number | undefined;
  };
  major?: string | undefined;
  minor?: string | undefined;
  specialization?: string | undefined;
  rollNumber?: string | undefined;
  certificateNumber?: string | undefined;
  certificateUrl?: string | undefined;   // R2 storage URL
  verified?: boolean | undefined;
  verificationSource?: "DigiLocker" | "Manual" | "AI" | undefined;
}

export interface Certification {
  id: string;
  name: string;
  issuingBody: string;
  issueDate: string;                     // ISO 8601
  expiryDate?: string | undefined;
  credentialId?: string | undefined;
  credentialUrl?: string | undefined;
  verified?: boolean | undefined;
}

export interface WorkExperience {
  id: string;
  type: EmploymentType;
  company: string;
  designation: string;
  department?: string | undefined;
  startDate: string;                     // ISO 8601
  endDate?: string | undefined;          // undefined if current
  isCurrent: boolean;
  salary?: {
    amount: number;
    currency: string;                    // "INR"
    period: "monthly" | "annual";
  } | undefined;
  responsibilities?: string[] | undefined;
}

export interface LanguageProficiency {
  language: string;                      // BCP 47: "hi", "en", "ta", "te"
  canRead: boolean;
  canWrite: boolean;
  canSpeak: boolean;
  proficiency: LanguageProficiencyLevel;
}

/**
 * Section C: Educational and Professional Qualifications.
 * Forms requesting education history map to these records.
 */
export interface SectionC {
  education: EducationRecord[];
  certifications?: Certification[] | undefined;
  experience?: WorkExperience[] | undefined;
  skills?: string[] | undefined;
  languages?: LanguageProficiency[] | undefined;
  academicHonors?: string[] | undefined;
  trainingPrograms?: {
    name: string;
    institution: string;
    year: number;
    duration?: string | undefined;
  }[] | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION D — OPERATIONAL / ROLE-SPECIFIC
// Security Level: LOW-MEDIUM (Editable by operators with consent)
// ─────────────────────────────────────────────────────────────────────────────

/** Role-specific extension for Student profile type */
export interface StudentExtension {
  currentInstitution?: string | undefined;
  currentClass?: string | undefined;     // "10th", "B.Tech 2nd Year"
  stream?: string | undefined;           // "Science", "Commerce", "Arts"
  admissionNumber?: string | undefined;
  rollNumber?: string | undefined;
  examScores?: {
    examName: string;                    // "JEE Mains", "NEET", "CAT"
    score: number | string;
    rank?: number | undefined;
    year: number;
  }[] | undefined;
  scholarships?: {
    name: string;
    amount: number;
    status: "applied" | "approved" | "rejected" | "disbursed";
    year?: number | undefined;
  }[] | undefined;
  preferredColleges?: string[] | undefined;
  statementOfPurpose?: string | undefined;
  portfolio?: string | undefined;        // URL
  extracurricular?: string[] | undefined;
}

/** Role-specific extension for Farmer profile type */
export interface FarmerExtension {
  landHolding?: {
    totalAcres: number;
    irrigatedAcres: number;
    rainfedAcres: number;
    khasraNumbers?: string[] | undefined;
  } | undefined;
  pmKisanId?: string | undefined;
  soilHealthCardNumber?: string | undefined;
  kisanCreditCardNumber?: string | undefined;
  crops?: {
    name: string;                        // Supports regional names
    seasonType: "kharif" | "rabi" | "zaid";
    areaAcres: number;
  }[] | undefined;
  livestock?: {
    type: string;
    count: number;
  }[] | undefined;
  farmEquipment?: string[] | undefined;
  irrigationSource?: "canal" | "borewell" | "rainwater" | "drip" | string | undefined;
  organicFarming?: boolean | undefined;
  farmerGroupMembership?: string | undefined;
}

/** Role-specific extension for Business profile type */
export interface BusinessExtension {
  gstin?: string | undefined;
  udyamNumber?: string | undefined;      // MSME registration
  shopEstablishmentNumber?: string | undefined;
  tradeLicenseNumber?: string | undefined;
  fssaiLicenseNumber?: string | undefined;
  businessType?: string | undefined;    // "Proprietorship", "Partnership", "Pvt Ltd"
  industryNature?: string | undefined;
  annualTurnover?: number | undefined;  // INR
  employeeCount?: number | undefined;
  bankAccountNumber?: string | undefined;
  ifscCode?: string | undefined;
  auditorName?: string | undefined;
  panOfBusiness?: string | undefined;
}

/** Role-specific extension for Professional profile type (CA, Doctor, Lawyer) */
export interface ProfessionalExtension {
  professionalBody?: string | undefined; // "ICAI", "BCI", "MCI"
  membershipNumber?: string | undefined;
  membershipExpiryDate?: string | undefined;
  practiceType?: "public" | "private" | "partnership" | undefined;
  practiceAddress?: string | undefined;
  specialization?: string | undefined;
  yearsOfPractice?: number | undefined;
  clientBaseSize?: "small" | "medium" | "large" | undefined;
  professionalIndemnityPolicyNumber?: string | undefined;
  continuingEducationHours?: number | undefined;
  awards?: string[] | undefined;
  publications?: string[] | undefined;
}

/**
 * Section D: Operational and Role-Specific Information.
 * Extensions are loaded based on the profile type chosen by the user.
 */
export interface SectionD {
  /** Notes added by operators — NOT visible to citizens by default */
  operatorNotes?: string | undefined;
  /** Tags for search/categorization */
  tags?: string[] | undefined;
  /** Priority level for operator queue */
  priority?: "low" | "normal" | "high" | "urgent" | undefined;
  /** Custom fields per tenant (tenant-specific requirements) */
  customFields?: Record<string, unknown> | undefined;
  /** Role-specific extension — only one will be populated */
  extension?: {
    student?: StudentExtension | undefined;
    farmer?: FarmerExtension | undefined;
    business?: BusinessExtension | undefined;
    professional?: ProfessionalExtension | undefined;
  } | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL PROFILE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Profile completion percentage per section (0-100).
 */
export interface ProfileCompleteness {
  sectionA: number;
  sectionB: number;
  sectionC: number;
  sectionD: number;
  /** Weighted overall: A=40%, B=25%, C=25%, D=10% */
  overall: number;
}

/**
 * The complete OneForm ABCD Profile.
 *
 * Used in API responses, frontend state, and as Prisma model type.
 * Section A is ALWAYS encrypted in the database — only decrypted on demand
 * with audit log entry.
 */
export interface Profile {
  id: string;
  tenantId: string;
  ownerId: string;
  operatorId?: string | undefined;
  profileCode: string;                 // Human-readable: "P-2026-001234"
  profileType: ProfileType;

  sectionA?: SectionA | undefined;
  sectionAMeta?: {
    encryptedFields: string[];
    keyVersion: number;
    lastUpdated: string;
  } | undefined;

  sectionB?: SectionB | undefined;
  sectionC?: SectionC | undefined;
  sectionD?: SectionD | undefined;

  completeness: ProfileCompleteness;
  status: ProfileStatus;
  verifiedAt?: string | undefined;
  verifiedBy?: string | undefined;

  createdAt: string;
  updatedAt: string;
}

/**
 * Lightweight profile for list views (no sensitive sections).
 */
export interface ProfileSummary {
  id: string;
  profileCode: string;
  profileType: ProfileType;
  displayName: string;               // Derived from sectionA.name.full
  completeness: ProfileCompleteness;
  status: ProfileStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Partial profile for creation/update requests.
 */
export type CreateProfileRequest = {
  profileType: ProfileType;
  sectionA?: Partial<SectionA> | undefined;
  sectionB?: Partial<SectionB> | undefined;
  sectionC?: Partial<SectionC> | undefined;
  sectionD?: Partial<SectionD> | undefined;
};

export type UpdateProfileRequest = Partial<CreateProfileRequest>;
