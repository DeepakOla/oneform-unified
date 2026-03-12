// Types
export type CRMDestination = 
  | 'zoho_crm' | 'zoho_books' | 'zoho_people'
  | 'salesforce' | 'hubspot' | 'freshworks' | 'freshsales'
  | 'pipedrive' | 'odoo' | 'microsoft_dynamics'
  | 'keka' | 'greythr' | 'darwinbox' | 'bamboohr'
  | 'tally' | 'sap' | 'oracle_netsuite'
  | 'salesforce_nonprofit' | 'bloomerang' | 'neon_crm' | 'little_green_light'
  | 'zapier' | 'custom_webhook' | 'government_portal';

export interface FieldTransformation {
  sourceField: string;
  destinationField: string;
  transformFn: (value: unknown) => unknown;
  validateFn: (value: unknown) => boolean;
  errorMessage: string;
  priority: number;
}

export interface TransformationResult {
  success: boolean;
  transformedData: Record<string, unknown>;
  validationErrors: ValidationError[];
  warnings: string[];
  stats: {
    fieldsTransformed: number;
    fieldsSkipped: number;
    fieldsFailed: number;
  };
}

export interface ValidationError {
  field: string;
  value: unknown;
  message: string;
  severity: 'error' | 'warning';
}

export interface ABCDProfile {
  sections: {
    A: {
      person: {
        name: {
          first?: string;
          middle?: string;
          last?: string;
          full?: string;
        };
        contact: {
          phone?: string;
          email?: string;
          alternatePhone?: string;
        };
        dob?: string;
        gender?: string;
        aadhaar?: string;
        pan?: string;
      };
      address: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        pincode?: string;
        country?: string;
      };
    };
    B: Record<string, unknown>;
    C: Record<string, unknown>;
    D: Record<string, unknown>;
  };
}

// Phone normalizer
export function normalizeIndianPhone(phone: string, prefix: string, spaced = false): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('91') && cleaned.length > 10) cleaned = cleaned.substring(2);
  else if (cleaned.startsWith('0') && cleaned.length > 10) cleaned = cleaned.substring(1);
  if (cleaned.length > 10) cleaned = cleaned.slice(-10);
  if (cleaned.length !== 10 || !/^[6-9]/.test(cleaned)) return phone;
  if (spaced) return `${prefix}${cleaned.substring(0, 5)} ${cleaned.substring(5)}`;
  return `${prefix}${cleaned}`;
}

export const PHONE_TRANSFORMERS: Record<CRMDestination, (phone: string) => string> = {
  zoho_crm: (phone) => normalizeIndianPhone(phone, '+91'),
  zoho_books: (phone) => normalizeIndianPhone(phone, '+91'),
  zoho_people: (phone) => normalizeIndianPhone(phone, '+91'),
  salesforce: (phone) => normalizeIndianPhone(phone, '+91 ', true),
  hubspot: (phone) => normalizeIndianPhone(phone, ''),
  freshworks: (phone) => normalizeIndianPhone(phone, ''),
  freshsales: (phone) => normalizeIndianPhone(phone, ''),
  pipedrive: (phone) => normalizeIndianPhone(phone, '+91'),
  odoo: (phone) => normalizeIndianPhone(phone, '+91'),
  microsoft_dynamics: (phone) => normalizeIndianPhone(phone, '+91'),
  keka: (phone) => normalizeIndianPhone(phone, ''),
  greythr: (phone) => normalizeIndianPhone(phone, ''),
  darwinbox: (phone) => normalizeIndianPhone(phone, '+91'),
  bamboohr: (phone) => normalizeIndianPhone(phone, '+1'),
  tally: (phone) => normalizeIndianPhone(phone, ''),
  sap: (phone) => normalizeIndianPhone(phone, '+91'),
  oracle_netsuite: (phone) => normalizeIndianPhone(phone, '+91'),
  salesforce_nonprofit: (phone) => normalizeIndianPhone(phone, '+91 ', true),
  bloomerang: (phone) => normalizeIndianPhone(phone, '+91'),
  neon_crm: (phone) => normalizeIndianPhone(phone, '+91'),
  little_green_light: (phone) => normalizeIndianPhone(phone, '+91'),
  zapier: (phone) => normalizeIndianPhone(phone, '+91'),
  custom_webhook: (phone) => normalizeIndianPhone(phone, '+91'),
  government_portal: (phone) => normalizeIndianPhone(phone, ''),
};

export const EMAIL_TRANSFORMERS: Record<CRMDestination, (email: string) => string> = {
  zoho_crm: (e) => e.toLowerCase().trim(),
  zoho_books: (e) => e.toLowerCase().trim(),
  zoho_people: (e) => e.toLowerCase().trim(),
  salesforce: (e) => e.toLowerCase().trim(),
  hubspot: (e) => e.toLowerCase().trim(),
  freshworks: (e) => e.toLowerCase().trim(),
  freshsales: (e) => e.toLowerCase().trim(),
  pipedrive: (e) => e.toLowerCase().trim(),
  odoo: (e) => e.toLowerCase().trim(),
  microsoft_dynamics: (e) => e.toLowerCase().trim(),
  keka: (e) => e.toLowerCase().trim(),
  greythr: (e) => e.toLowerCase().trim(),
  darwinbox: (e) => e.toLowerCase().trim(),
  bamboohr: (e) => e.toLowerCase().trim(),
  tally: (e) => e.toLowerCase().trim(),
  sap: (e) => e.toLowerCase().trim(),
  oracle_netsuite: (e) => e.toLowerCase().trim(),
  salesforce_nonprofit: (e) => e.toLowerCase().trim(),
  bloomerang: (e) => e.toLowerCase().trim(),
  neon_crm: (e) => e.toLowerCase().trim(),
  little_green_light: (e) => e.toLowerCase().trim(),
  zapier: (e) => e.toLowerCase().trim(),
  custom_webhook: (e) => e.toLowerCase().trim(),
  government_portal: (e) => e.toLowerCase().trim(),
};

function formatDate(dateStr: string, format: 'DD-MM-YYYY' | 'YYYY-MM-DD' | 'DD/MM/YYYY'): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    switch (format) {
      case 'DD-MM-YYYY': return `${day}-${month}-${year}`;
      case 'DD/MM/YYYY': return `${day}/${month}/${year}`;
      case 'YYYY-MM-DD': return `${year}-${month}-${day}`;
      default: return dateStr;
    }
  } catch {
    return dateStr;
  }
}

export const DATE_TRANSFORMERS: Record<CRMDestination, (date: string) => string> = {
  zoho_crm: (d) => formatDate(d, 'DD-MM-YYYY'),
  zoho_books: (d) => formatDate(d, 'DD-MM-YYYY'),
  zoho_people: (d) => formatDate(d, 'DD-MM-YYYY'),
  salesforce: (d) => formatDate(d, 'YYYY-MM-DD'),
  salesforce_nonprofit: (d) => formatDate(d, 'YYYY-MM-DD'),
  hubspot: (d) => { try { return new Date(d).getTime().toString(); } catch { return d; } },
  freshworks: (d) => formatDate(d, 'YYYY-MM-DD'),
  freshsales: (d) => formatDate(d, 'YYYY-MM-DD'),
  pipedrive: (d) => formatDate(d, 'YYYY-MM-DD'),
  odoo: (d) => formatDate(d, 'YYYY-MM-DD'),
  microsoft_dynamics: (d) => formatDate(d, 'YYYY-MM-DD'),
  keka: (d) => formatDate(d, 'DD-MM-YYYY'),
  greythr: (d) => formatDate(d, 'DD-MM-YYYY'),
  darwinbox: (d) => formatDate(d, 'DD-MM-YYYY'),
  bamboohr: (d) => formatDate(d, 'YYYY-MM-DD'),
  tally: (d) => formatDate(d, 'DD-MM-YYYY'),
  sap: (d) => formatDate(d, 'YYYY-MM-DD'),
  oracle_netsuite: (d) => formatDate(d, 'YYYY-MM-DD'),
  bloomerang: (d) => formatDate(d, 'YYYY-MM-DD'),
  neon_crm: (d) => formatDate(d, 'YYYY-MM-DD'),
  little_green_light: (d) => formatDate(d, 'YYYY-MM-DD'),
  zapier: (d) => formatDate(d, 'YYYY-MM-DD'),
  custom_webhook: (d) => formatDate(d, 'YYYY-MM-DD'),
  government_portal: (d) => formatDate(d, 'DD/MM/YYYY'),
};

export const NAME_TRANSFORMERS = {
  titleCase: (name: string): string => name.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
  upperCase: (name: string): string => name.toUpperCase(),
  clean: (name: string): string => name.replace(/\s+/g, ' ').trim(),
  splitName: (fullName: string): { first: string; middle?: string; last: string } => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return { first: parts[0] || '', last: '' };
    if (parts.length === 2) return { first: parts[0] || '', last: parts[1] || '' };
    return { first: parts[0] || '', middle: parts.slice(1, -1).join(' '), last: parts[parts.length - 1] || '' };
  },
};

export const ADDRESS_TRANSFORMERS = {
  combineLines: (line1?: string, line2?: string): string => [line1, line2].filter(Boolean).join(', '),
  formatPincode: (pincode: string): string => {
    const cleaned = pincode.replace(/\D/g, '');
    return cleaned.length === 6 ? cleaned : pincode;
  },
};

export const VALIDATORS = {
  phone: { indian: (phone: string): boolean => { const cleaned = phone.replace(/\D/g, ''); return cleaned.length === 10 && /^[6-9]/.test(cleaned); } },
  email: { valid: (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) },
  pan: { valid: (pan: string): boolean => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.toUpperCase()) },
  aadhaar: { 
    valid: (aadhaar: string): boolean => aadhaar.replace(/\D/g, '').length === 12,
    masked: (aadhaar: string): string => { const cleaned = aadhaar.replace(/\D/g, ''); return cleaned.length !== 12 ? aadhaar : `XXXX-XXXX-${cleaned.slice(-4)}`; }
  },
  gstin: { valid: (gstin: string): boolean => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9]{1}[A-Z]{1}[0-9A-Z]{1}$/.test(gstin.toUpperCase()) },
  pincode: { valid: (pincode: string): boolean => { const cleaned = pincode.replace(/\D/g, ''); return cleaned.length === 6 && /^[1-9]/.test(cleaned); } },
};

export const CRM_FIELD_MAPPINGS: Record<CRMDestination, Record<string, string>> = {
  zoho_crm: { 'firstName': 'First_Name', 'lastName': 'Last_Name', 'fullName': 'Full_Name', 'email': 'Email', 'phone': 'Phone', 'alternatePhone': 'Mobile', 'dob': 'Date_of_Birth', 'gender': 'Gender', 'addressLine1': 'Mailing_Street', 'city': 'Mailing_City', 'state': 'Mailing_State', 'pincode': 'Mailing_Zip', 'country': 'Mailing_Country', 'pan': 'PAN_Number', 'gstin': 'GSTIN' },
  salesforce: { 'firstName': 'FirstName', 'lastName': 'LastName', 'email': 'Email', 'phone': 'Phone', 'alternatePhone': 'MobilePhone', 'dob': 'Birthdate', 'addressLine1': 'MailingStreet', 'city': 'MailingCity', 'state': 'MailingState', 'pincode': 'MailingPostalCode', 'country': 'MailingCountry' },
  hubspot: { 'firstName': 'firstname', 'lastName': 'lastname', 'email': 'email', 'phone': 'phone', 'alternatePhone': 'mobilephone', 'dob': 'date_of_birth', 'addressLine1': 'address', 'city': 'city', 'state': 'state', 'pincode': 'zip', 'country': 'country' },
  zoho_books: {}, zoho_people: {}, freshworks: {}, freshsales: {}, pipedrive: {}, odoo: {}, microsoft_dynamics: {}, keka: {}, greythr: {}, darwinbox: {}, bamboohr: {}, tally: {}, sap: {}, oracle_netsuite: {}, salesforce_nonprofit: {}, bloomerang: {}, neon_crm: {}, little_green_light: {}, zapier: {}, custom_webhook: {}, government_portal: {},
};

export function transformProfileForCRM(profile: ABCDProfile, destination: CRMDestination): TransformationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  const transformed: Record<string, unknown> = {};
  let fieldsTransformed = 0, fieldsSkipped = 0, fieldsFailed = 0;
  
  const person = profile.sections.A.person;
  const address = profile.sections.A.address;
  const fieldMap = CRM_FIELD_MAPPINGS[destination] || {};
  
  if (person.contact?.phone) {
    const pt = PHONE_TRANSFORMERS[destination];
    if (pt) {
      const tp = pt(person.contact.phone);
      if (VALIDATORS.phone.indian(tp)) { transformed[fieldMap['phone'] || 'phone'] = tp; fieldsTransformed++; }
      else { errors.push({ field: 'phone', value: person.contact.phone, message: 'Invalid phone format', severity: 'error' }); fieldsFailed++; }
    }
  } else fieldsSkipped++;
  
  if (person.contact?.email) {
    const et = EMAIL_TRANSFORMERS[destination];
    if (et) {
      const te = et(person.contact.email);
      if (VALIDATORS.email.valid(te)) { transformed[fieldMap['email'] || 'email'] = te; fieldsTransformed++; }
      else { errors.push({ field: 'email', value: person.contact.email, message: 'Invalid email', severity: 'error' }); fieldsFailed++; }
    }
  } else fieldsSkipped++;
  
  if (person.name?.first || person.name?.full) {
    const fn = person.name.first || NAME_TRANSFORMERS.splitName(person.name.full || '').first;
    const ln = person.name.last || NAME_TRANSFORMERS.splitName(person.name.full || '').last;
    transformed[fieldMap['firstName'] || 'firstName'] = NAME_TRANSFORMERS.titleCase(fn);
    transformed[fieldMap['lastName'] || 'lastName'] = NAME_TRANSFORMERS.titleCase(ln);
    fieldsTransformed += 2;
  }
  
  if (person.dob) {
    const dt = DATE_TRANSFORMERS[destination];
    if (dt) { transformed[fieldMap['dob'] || 'dob'] = dt(person.dob); fieldsTransformed++; }
  }
  
  if (address) {
    if (address.line1) { transformed[fieldMap['addressLine1'] || 'address'] = address.line1; fieldsTransformed++; }
    if (address.city) { transformed[fieldMap['city'] || 'city'] = address.city; fieldsTransformed++; }
    if (address.state) { transformed[fieldMap['state'] || 'state'] = address.state; fieldsTransformed++; }
    if (address.pincode) {
      if (VALIDATORS.pincode.valid(address.pincode)) { transformed[fieldMap['pincode'] || 'pincode'] = ADDRESS_TRANSFORMERS.formatPincode(address.pincode); fieldsTransformed++; }
      else warnings.push(`Pincode ${address.pincode} may be invalid`);
    }
    if (address.country) { transformed[fieldMap['country'] || 'country'] = address.country; fieldsTransformed++; }
  }
  
  if (person.pan) {
    if (VALIDATORS.pan.valid(person.pan)) { transformed[fieldMap['pan'] || 'pan'] = person.pan.toUpperCase(); fieldsTransformed++; }
    else { errors.push({ field: 'pan', value: person.pan, message: 'Invalid PAN', severity: 'error' }); fieldsFailed++; }
  }
  
  return {
    success: errors.filter(e => e.severity === 'error').length === 0,
    transformedData: transformed,
    validationErrors: errors,
    warnings,
    stats: { fieldsTransformed, fieldsSkipped, fieldsFailed },
  };
}

export function batchTransformProfiles(profiles: ABCDProfile[], destination: CRMDestination, _dryRun = true) {
  const accepted: Array<{ profile: ABCDProfile; transformed: Record<string, unknown> }> = [];
  const rejected: Array<{ profile: ABCDProfile; errors: ValidationError[] }> = [];
  for (const profile of profiles) {
    const result = transformProfileForCRM(profile, destination);
    if (result.success) accepted.push({ profile, transformed: result.transformedData });
    else rejected.push({ profile, errors: result.validationErrors });
  }
  return {
    accepted,
    rejected,
    summary: { total: profiles.length, accepted: accepted.length, rejected: rejected.length, successRate: profiles.length > 0 ? Math.round((accepted.length / profiles.length) * 100) : 0 },
  };
}

export const fieldTransformer = {
  transformProfileForCRM, batchTransformProfiles, PHONE_TRANSFORMERS, EMAIL_TRANSFORMERS,
  DATE_TRANSFORMERS, NAME_TRANSFORMERS, ADDRESS_TRANSFORMERS, VALIDATORS, CRM_FIELD_MAPPINGS,
};
export default fieldTransformer;
