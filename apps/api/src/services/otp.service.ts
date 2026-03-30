/**
 * OneForm API — OTP Service
 * Handles SMS OTP via MSG91
 */
import { Redis } from 'ioredis';
import crypto from 'crypto';

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY ?? '';
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID ?? '';
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID ?? 'ONFORM';
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

const redis = new Redis(REDIS_URL);

const OTP_EXPIRY = 300; // 5 minutes in seconds
const OTP_LENGTH = 6;

/**
 * Generate a random OTP
 */
function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Send OTP via MSG91
 */
export async function sendOTP(phone: string): Promise<{ success: boolean; message: string }> {
  // Validate phone number (Indian format)
  const phoneRegex = /^[6-9]\d{9}$/;
  if (!phoneRegex.test(phone)) {
    throw new Error('Invalid Indian phone number');
  }

  // Generate OTP
  const otp = generateOTP();

  // Store OTP in Redis with expiry
  const key = `otp:${phone}`;
  await redis.setex(key, OTP_EXPIRY, otp);

  // If MSG91 credentials are not configured, log OTP for development
  if (!MSG91_AUTH_KEY || !MSG91_TEMPLATE_ID) {
    console.log(`[DEV MODE] OTP for ${phone}: ${otp}`);
    return {
      success: true,
      message: 'OTP sent (dev mode - check server logs)',
    };
  }

  // Send OTP via MSG91
  try {
    const response = await fetch('https://control.msg91.com/api/v5/otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authkey': MSG91_AUTH_KEY,
      },
      body: JSON.stringify({
        template_id: MSG91_TEMPLATE_ID,
        sender: MSG91_SENDER_ID,
        mobile: `91${phone}`,
        otp,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('MSG91 API error:', errorText);
      throw new Error('Failed to send OTP');
    }

    return {
      success: true,
      message: 'OTP sent successfully',
    };
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw new Error('Failed to send OTP');
  }
}

/**
 * Verify OTP
 */
export async function verifyOTP(phone: string, otp: string): Promise<boolean> {
  const key = `otp:${phone}`;
  const storedOTP = await redis.get(key);

  if (!storedOTP) {
    return false;
  }

  if (storedOTP !== otp) {
    return false;
  }

  // OTP is valid, delete it from Redis
  await redis.del(key);

  return true;
}

/**
 * Check if OTP exists for a phone number
 */
export async function hasActiveOTP(phone: string): Promise<boolean> {
  const key = `otp:${phone}`;
  const ttl = await redis.ttl(key);
  return ttl > 0;
}

/**
 * Get remaining time for OTP
 */
export async function getOTPTTL(phone: string): Promise<number> {
  const key = `otp:${phone}`;
  return await redis.ttl(key);
}
