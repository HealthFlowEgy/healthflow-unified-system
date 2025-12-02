import jwt from 'jsonwebtoken';
import { promisify } from 'util';

const signAsync = promisify(jwt.sign);
const verifyAsync = promisify(jwt.verify);

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
  jti?: string;
  iat?: number;
  exp?: number;
}

export interface TokenOptions {
  expiresIn?: string | number;
  audience?: string;
  issuer?: string;
}

/**
 * Generate a JWT access token
 */
export async function generateAccessToken(
  payload: Omit<TokenPayload, 'iat' | 'exp' | 'jti'>,
  secret: string,
  options?: TokenOptions
): Promise<string> {
  const jti = generateTokenId();
  
  const tokenPayload: TokenPayload = {
    ...payload,
    jti
  };

  const token = await signAsync(tokenPayload, secret, {
    expiresIn: options?.expiresIn || '15m',
    audience: options?.audience || 'healthflow-api',
    issuer: options?.issuer || 'healthflow-auth-service',
    algorithm: 'HS256'
  });

  return token as string;
}

/**
 * Generate a JWT refresh token
 */
export async function generateRefreshToken(
  userId: string,
  secret: string,
  options?: TokenOptions
): Promise<string> {
  const jti = generateTokenId();
  
  const payload = {
    sub: userId,
    jti,
    type: 'refresh'
  };

  const token = await signAsync(payload, secret, {
    expiresIn: options?.expiresIn || '7d',
    audience: options?.audience || 'healthflow-api',
    issuer: options?.issuer || 'healthflow-auth-service',
    algorithm: 'HS256'
  });

  return token as string;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(
  token: string,
  secret: string,
  options?: jwt.VerifyOptions
): Promise<TokenPayload> {
  try {
    const decoded = await verifyAsync(token, secret, {
      audience: options?.audience || 'healthflow-api',
      issuer: options?.issuer || 'healthflow-auth-service',
      algorithms: ['HS256'],
      ...options
    });

    return decoded as TokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('INVALID_TOKEN');
    }
    throw error;
  }
}

/**
 * Decode token without verification (for debugging only)
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Generate a unique token ID
 */
function generateTokenId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Check if user has required permission
 */
export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  return userPermissions.includes(requiredPermission) || userPermissions.includes('*');
}

/**
 * Check if user has required role
 */
export function hasRole(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole);
}
