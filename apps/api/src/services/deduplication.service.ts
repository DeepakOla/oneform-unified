import { prisma } from '../lib/prisma.js';

// ============================================================
// TYPES
// ============================================================

export type DeduplicationAction = 'CREATE' | 'UPDATE' | 'MANUAL_REVIEW' | 'DUPLICATE';

export interface DeduplicationCandidate {
  profileId: string;
  email?: string | undefined;
  phone?: string | undefined;
  firstName?: string | undefined;
  lastName?: string | undefined;
  fullName?: string | undefined;
  pan?: string | undefined;
  aadhaarLast4?: string | undefined;
  dob?: string | undefined;
  gstin?: string | undefined;
  companyName?: string | undefined;
}

export interface MatchResult {
  candidateId: string;
  existingProfileId: string;
  score: number;
  breakdown: ScoreBreakdown;
  action: DeduplicationAction;
  confidence: number;
}

export interface ScoreBreakdown {
  email: number;
  phone: number;
  name: number;
  pan: number;
  aadhaar: number;
  dob: number;
  gstin: number;
  companyName: number;
}

export interface DeduplicationResult {
  candidateId: string;
  action: DeduplicationAction;
  matchedProfileId?: string;
  score: number;
  breakdown: ScoreBreakdown;
  confidence: number;
  suggestedMergeFields?: string[] | undefined;
}

export interface BulkDeduplicationResult {
  total: number;
  create: number;
  update: number;
  manualReview: number;
  duplicate: number;
  results: DeduplicationResult[];
  processingTime: number;
}

export interface DeduplicationConfig {
  thresholds: {
    create: number;
    manualReview: number;
    update: number;
    duplicate: number;
  };
  weights: {
    email: number;
    phone: number;
    name: number;
    pan: number;
    aadhaar: number;
    dob: number;
    gstin: number;
    companyName: number;
  };
  fuzzyNameThreshold: number;
  maxCandidatesToCheck: number;
}

const DEFAULT_CONFIG: DeduplicationConfig = {
  thresholds: { create: 70, manualReview: 70, update: 95, duplicate: 98 },
  weights: { email: 70, phone: 60, name: 20, pan: 100, aadhaar: 30, dob: 15, gstin: 100, companyName: 25 },
  fuzzyNameThreshold: 0.8,
  maxCandidatesToCheck: 100,
};

// ============================================================
// MATCHING FUNCTIONS
// ============================================================

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('91') && cleaned.length > 10) cleaned = cleaned.substring(2);
  else if (cleaned.startsWith('0') && cleaned.length > 10) cleaned = cleaned.substring(1);
  return cleaned.slice(-10);
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^a-z\s]/g, '');
}

function levenshteinDistance(str1: string, str2: string): number {
  if (!str1) str1 = '';
  if (!str2) str2 = '';
  const m = str1.length, n = str2.length;
  if (m === 0) return n;
  if (n === 0) return m;
  
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) (dp[i] as number[])[0] = i;
  for (let j = 0; j <= n; j++) (dp[0] as number[])[j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) (dp[i] as number[])[j] = (dp[i - 1] as number[])[j - 1] ?? 0;
      else (dp[i] as number[])[j] = 1 + Math.min(((dp[i - 1] as number[])[j] ?? 0), ((dp[i] as number[])[j - 1] ?? 0), ((dp[i - 1] as number[])[j - 1] ?? 0));
    }
  }
  return (dp[m] as number[])[n] ?? 0;
}

function nameSimilarity(name1: string, name2: string): number {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  if (n1 === n2) return 1.0;
  if (!n1 || !n2) return 0;
  const maxLen = Math.max(n1.length, n2.length);
  return 1 - (levenshteinDistance(n1, n2) / maxLen);
}

function calculateMatchScore(candidate: DeduplicationCandidate, existing: DeduplicationCandidate, config: DeduplicationConfig): { score: number; breakdown: ScoreBreakdown } {
  const breakdown: ScoreBreakdown = { email: 0, phone: 0, name: 0, pan: 0, aadhaar: 0, dob: 0, gstin: 0, companyName: 0 };
  
  if (candidate.email && existing.email && normalizeEmail(candidate.email) === normalizeEmail(existing.email)) breakdown.email = config.weights.email ?? 0;
  if (candidate.phone && existing.phone && normalizePhone(candidate.phone) === normalizePhone(existing.phone)) breakdown.phone = config.weights.phone ?? 0;
  
  const candidateName = candidate.fullName || `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim();
  const existingName = existing.fullName || `${existing.firstName || ''} ${existing.lastName || ''}`.trim();
  if (candidateName && existingName) {
    const similarity = nameSimilarity(candidateName, existingName);
    if (similarity >= config.fuzzyNameThreshold) breakdown.name = Math.round(config.weights.name * similarity);
  }
  
  if (candidate.pan && existing.pan && candidate.pan.toUpperCase() === existing.pan.toUpperCase()) breakdown.pan = config.weights.pan ?? 0;
  if (candidate.aadhaarLast4 && existing.aadhaarLast4 && candidate.aadhaarLast4 === existing.aadhaarLast4) breakdown.aadhaar = config.weights.aadhaar ?? 0;
  if (candidate.dob && existing.dob && candidate.dob === existing.dob) breakdown.dob = config.weights.dob ?? 0;
  if (candidate.gstin && existing.gstin && candidate.gstin.toUpperCase() === existing.gstin.toUpperCase()) breakdown.gstin = config.weights.gstin ?? 0;
  if (candidate.companyName && existing.companyName) {
    const similarity = nameSimilarity(candidate.companyName, existing.companyName);
    if (similarity >= 0.9) breakdown.companyName = Math.round((config.weights.companyName ?? 0) * similarity);
  }
  
  const totalWeight = Object.values(config.weights).reduce((a, b) => (a ?? 0) + (b ?? 0), 0);
  const score = totalWeight > 0 ? Math.round((Object.values(breakdown).reduce((a, b) => a + b, 0) / totalWeight) * 100) : 0;
  return { score, breakdown };
}

function determineAction(score: number, config: DeduplicationConfig): DeduplicationAction {
  if (score >= config.thresholds.duplicate) return 'DUPLICATE';
  if (score >= config.thresholds.update) return 'UPDATE';
  if (score >= config.thresholds.manualReview) return 'MANUAL_REVIEW';
  return 'CREATE';
}

// ============================================================
// DEDUPLICATION SQL FUNCTIONS
// ============================================================

async function findPotentialMatches(candidate: DeduplicationCandidate, tenantId: string, config: DeduplicationConfig): Promise<Array<any>> {
  // Use Prisma's JSONB raw queries and field exact matches
  const conditions = [];
  
  if (candidate.email) conditions.push(`email = '${normalizeEmail(candidate.email)}'`);
  if (candidate.phone) conditions.push(`"phoneNormalized" = '${normalizePhone(candidate.phone)}'`);
  if (candidate.pan) conditions.push(`UPPER(pan) = '${candidate.pan.toUpperCase()}'`);
  if (candidate.gstin) conditions.push(`UPPER(gstin) = '${candidate.gstin.toUpperCase()}'`);

  if (conditions.length === 0) return [];
  
  // NOTE: Assuming there's a JSON profile format using SQL Raw to leverage JSONB GIN indexes. For now, pseudo-Prisma call.
  const rawResults: any[] = await prisma.$queryRawUnsafe(`
    SELECT * FROM "Profile" 
    WHERE "tenantId" = $1 
    AND (${conditions.join(' OR ')})
    LIMIT $2
  `, tenantId, config.maxCandidatesToCheck);
  
  return rawResults;
}

export async function checkDuplicate(candidate: DeduplicationCandidate, tenantId: string, config: DeduplicationConfig = DEFAULT_CONFIG): Promise<DeduplicationResult> {
  const potentialMatches = await findPotentialMatches(candidate, tenantId, config);
  const emptyResult = { 
    candidateId: candidate.profileId, action: 'CREATE' as DeduplicationAction, score: 0, 
    breakdown: { email: 0, phone: 0, name: 0, pan: 0, aadhaar: 0, dob: 0, gstin: 0, companyName: 0 }, 
    confidence: 100 
  };
  if (potentialMatches.length === 0) return emptyResult;
  
  let bestMatch: MatchResult | null = null;
  for (const matchDoc of potentialMatches) {
    const existing: DeduplicationCandidate = {
      profileId: matchDoc.id,
      email: matchDoc.email,
      phone: matchDoc.phoneString,
      firstName: matchDoc.firstName,
      lastName: matchDoc.lastName,
      fullName: matchDoc.firstName ? `${matchDoc.firstName} ${matchDoc.lastName}` : undefined,
      pan: matchDoc.pan,
      aadhaarLast4: matchDoc.aadhaarLast4,
      dob: matchDoc.dob,
      gstin: matchDoc.gstin,
      companyName: matchDoc.companyName,
    };
    
    const { score, breakdown } = calculateMatchScore(candidate, existing, config);
    const action = determineAction(score, config);
    
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { candidateId: candidate.profileId, existingProfileId: matchDoc.id, score, breakdown, action, confidence: Math.min(score, 100) };
    }
  }
  
  if (!bestMatch) return emptyResult;
  
  const suggestedMergeFields: string[] = [];
  if (bestMatch.breakdown.email > 0) suggestedMergeFields.push('email');
  if (bestMatch.breakdown.phone > 0) suggestedMergeFields.push('phone');
  if (bestMatch.breakdown.name > 0) suggestedMergeFields.push('name');
  if (bestMatch.breakdown.pan > 0) suggestedMergeFields.push('pan');
  if (bestMatch.breakdown.aadhaar > 0) suggestedMergeFields.push('aadhaar');
  
  return {
    candidateId: candidate.profileId,
    action: bestMatch.action,
    matchedProfileId: bestMatch.existingProfileId,
    score: bestMatch.score,
    breakdown: bestMatch.breakdown,
    confidence: bestMatch.confidence,
    suggestedMergeFields: suggestedMergeFields.length > 0 ? suggestedMergeFields : undefined,
  };
}

export async function checkDuplicatesBulk(candidates: DeduplicationCandidate[], tenantId: string, config: DeduplicationConfig = DEFAULT_CONFIG): Promise<BulkDeduplicationResult> {
  const startTime = Date.now();
  const results: DeduplicationResult[] = [];
  let createCount = 0, updateCount = 0, manualReviewCount = 0, duplicateCount = 0;
  
  for (const candidate of candidates) {
    const result = await checkDuplicate(candidate, tenantId, config);
    results.push(result);
    switch (result.action) {
      case 'CREATE': createCount++; break;
      case 'UPDATE': updateCount++; break;
      case 'MANUAL_REVIEW': manualReviewCount++; break;
      case 'DUPLICATE': duplicateCount++; break;
    }
  }
  
  return { total: candidates.length, create: createCount, update: updateCount, manualReview: manualReviewCount, duplicate: duplicateCount, results, processingTime: Date.now() - startTime };
}

export const deduplicationService = {
  checkDuplicate,
  checkDuplicatesBulk
};
export default deduplicationService;
