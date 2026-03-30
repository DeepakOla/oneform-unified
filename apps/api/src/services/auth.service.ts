/**
 * OneForm Unified Platform — Auth Service
 *
 * Handles: registration, email login, token refresh, logout.
 * Anti-patterns fixed from v1:
 *   - Logout deletes ALL sessions (not just bearer token) to prevent stale-token auth loops
 *   - Argon2id password hashing (not bcrypt)
 *   - Refresh token rotation on every use (old session deleted, new one created)
 *   - JWT access tokens are short-lived (15 min); refresh tokens are DB-backed (7 days)
 *   - User status (ACTIVE/SUSPENDED) verified on every token use via auth.middleware.ts
 */
import { hash, verify } from 'argon2';
import { SignJWT } from 'jose';
import { createHash } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';
import type { UserRole } from '@oneform/shared-types';
import type { Prisma } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** 15 minutes in seconds */
const ACCESS_TOKEN_TTL_SECS = 15 * 60;
/** 7 days in milliseconds */
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getJWTSecret(): Uint8Array {
  const secret = process.env['JWT_ACCESS_SECRET'];
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not configured');
  return new TextEncoder().encode(secret);
}

/** SHA-256 hash of a token for safe DB storage */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function issueTokenPair(
  userId: string,
  tenantId: string,
  role: UserRole,
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = await new SignJWT({ sub: userId, tenantId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECS}s`)
    .sign(getJWTSecret());

  const refreshToken = `${crypto.randomUUID()}-${crypto.randomUUID()}`;

  return { accessToken, refreshToken };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUserSummary {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string | null;
  role: string;
  status: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Register
// ─────────────────────────────────────────────────────────────────────────────

export async function registerUser(input: {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  role?: UserRole;
}): Promise<{ tokens: AuthTokens; user: AuthUserSummary }> {
  const { email, password, firstName, lastName, role = 'CITIZEN' } = input;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AuthError('This email is already registered.', 409, 'EMAIL_ALREADY_EXISTS');
  }

  const passwordHash = await hash(password);

  const baseSlug = email
    .split('@')[0]
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .slice(0, 20) ?? 'user';
  const slug = `${baseSlug}-${Date.now()}`;
  const tenantName = lastName != null
    ? `${firstName} ${lastName}'s Workspace`
    : `${firstName}'s Workspace`;

  // Atomic: create Tenant + User + Session in one transaction
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const t = await tx.tenant.create({
      data: {
        name: tenantName,
        slug,
        type: 'INDIVIDUAL',
        email,
        status: 'ACTIVE',
      },
    });

    const u = await tx.user.create({
      data: {
        tenantId: t.id,
        email,
        firstName,
        lastName: lastName ?? null,
        role: role as UserRole,
        passwordHash,
        status: 'ACTIVE',
      },
    });

    const tokens = await issueTokenPair(u.id, t.id, role as UserRole);

    await tx.session.create({
      data: {
        userId: u.id,
        tokenHash: hashToken(tokens.refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return { tenant: t, user: u, refreshToken: tokens.refreshToken, accessToken: tokens.accessToken };
  });

  logger.info({ userId: result.user.id, tenantId: result.tenant.id, role }, 'User registered');

  return {
    tokens: { accessToken: result.accessToken, refreshToken: result.refreshToken, expiresIn: ACCESS_TOKEN_TTL_SECS },
    user: {
      id: result.user.id,
      tenantId: result.user.tenantId,
      email: result.user.email,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      role: result.user.role,
      status: result.user.status,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Email + Password Login
// ─────────────────────────────────────────────────────────────────────────────

export async function loginWithEmail(input: {
  email: string;
  password: string;
  userAgent?: string;
  ipAddress?: string;
}): Promise<{ tokens: AuthTokens; user: AuthUserSummary }> {
  const { email, password, userAgent, ipAddress } = input;

  const user = await prisma.user.findUnique({ where: { email } });

  if (user == null || user.passwordHash == null) {
    await hash('dummy-constant-time-work');
    throw new AuthError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  const valid = await verify(user.passwordHash, password);
  if (!valid) {
    throw new AuthError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  if (user.status !== 'ACTIVE') {
    throw new AuthError('Account is suspended or not active.', 403, 'ACCOUNT_SUSPENDED');
  }

  const { accessToken, refreshToken } = await issueTokenPair(
    user.id,
    user.tenantId,
    user.role as UserRole,
  );

  await prisma.$transaction([
    prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        userAgent: userAgent ?? null,
        ipAddress: ipAddress ?? null,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress ?? null,
      },
    }),
  ]);

  logger.info({ userId: user.id }, 'User logged in');

  return {
    tokens: { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_SECS },
    user: {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Refresh Tokens
// ─────────────────────────────────────────────────────────────────────────────

export async function rotateTokens(
  refreshToken: string,
): Promise<{ tokens: AuthTokens }> {
  const tokenHash = hashToken(refreshToken);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (session == null || session.expiresAt < new Date()) {
    throw new AuthError('Refresh token is expired or invalid.', 401, 'INVALID_TOKEN');
  }

  if (session.user.status !== 'ACTIVE') {
    throw new AuthError('Account is not active.', 403, 'ACCOUNT_SUSPENDED');
  }

  const { accessToken, refreshToken: newRefreshToken } = await issueTokenPair(
    session.user.id,
    session.user.tenantId,
    session.user.role as UserRole,
  );

  await prisma.$transaction([
    prisma.session.delete({ where: { id: session.id } }),
    prisma.session.create({
      data: {
        userId: session.userId,
        tokenHash: hashToken(newRefreshToken),
        userAgent: session.userAgent ?? null,
        ipAddress: session.ipAddress ?? null,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    }),
  ]);

  return {
    tokens: { accessToken, refreshToken: newRefreshToken, expiresIn: ACCESS_TOKEN_TTL_SECS },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────────────────────────────────────

/** Anti-pattern fix: deletes ALL sessions for a user (clears all devices). */
export async function logoutUser(userId: string): Promise<void> {
  const { count } = await prisma.session.deleteMany({ where: { userId } });
  logger.info({ userId, sessionsDeleted: count }, 'User logged out — all sessions cleared');
}
