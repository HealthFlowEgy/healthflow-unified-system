/**
 * OAuth2 Provider Service
 * Supports Google, Microsoft, and custom OAuth2 providers
 */

import { logger } from '../../utils/logger';
import * as crypto from 'crypto';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
}

export interface OAuthUserInfo {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  verified?: boolean;
}

export abstract class OAuthProvider {
  protected config: OAuthConfig;
  protected authorizationUrl: string;
  protected tokenUrl: string;
  protected userInfoUrl: string;

  constructor(config: OAuthConfig) {
    this.config = config;
  }

  abstract getAuthorizationUrl(state: string): string;
  abstract exchangeCodeForToken(code: string): Promise<OAuthTokenResponse>;
  abstract getUserInfo(accessToken: string): Promise<OAuthUserInfo>;

  protected generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  protected buildAuthUrl(baseUrl: string, params: Record<string, string>): string {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    return url.toString();
  }
}

// Google OAuth Provider
export class GoogleOAuthProvider extends OAuthProvider {
  constructor(config: OAuthConfig) {
    super(config);
    this.authorizationUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    this.tokenUrl = 'https://oauth2.googleapis.com/token';
    this.userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
  }

  getAuthorizationUrl(state: string): string {
    return this.buildAuthUrl(this.authorizationUrl, {
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scope.join(' '),
      state,
      access_type: 'offline',
      prompt: 'consent'
    });
  }

  async exchangeCodeForToken(code: string): Promise<OAuthTokenResponse> {
    try {
      // In production, use actual HTTP request
      // const response = await fetch(this.tokenUrl, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      //   body: new URLSearchParams({
      //     code,
      //     client_id: this.config.clientId,
      //     client_secret: this.config.clientSecret,
      //     redirect_uri: this.config.redirectUri,
      //     grant_type: 'authorization_code'
      //   })
      // });
      // return await response.json();

      logger.info('Exchanging Google OAuth code for token');
      
      return {
        access_token: 'mock_google_access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'mock_google_refresh_token',
        id_token: 'mock_google_id_token'
      };
    } catch (error) {
      logger.error('Failed to exchange Google OAuth code:', error);
      throw error;
    }
  }

  async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    try {
      // In production, use actual HTTP request
      // const response = await fetch(this.userInfoUrl, {
      //   headers: { Authorization: `Bearer ${accessToken}` }
      // });
      // const data = await response.json();

      logger.info('Fetching Google user info');

      return {
        id: 'google_user_123',
        email: 'user@gmail.com',
        name: 'Google User',
        firstName: 'Google',
        lastName: 'User',
        picture: 'https://example.com/avatar.jpg',
        verified: true
      };
    } catch (error) {
      logger.error('Failed to fetch Google user info:', error);
      throw error;
    }
  }
}

// Microsoft OAuth Provider
export class MicrosoftOAuthProvider extends OAuthProvider {
  constructor(config: OAuthConfig) {
    super(config);
    this.authorizationUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
    this.tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    this.userInfoUrl = 'https://graph.microsoft.com/v1.0/me';
  }

  getAuthorizationUrl(state: string): string {
    return this.buildAuthUrl(this.authorizationUrl, {
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scope.join(' '),
      state,
      response_mode: 'query'
    });
  }

  async exchangeCodeForToken(code: string): Promise<OAuthTokenResponse> {
    try {
      logger.info('Exchanging Microsoft OAuth code for token');
      
      return {
        access_token: 'mock_microsoft_access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'mock_microsoft_refresh_token'
      };
    } catch (error) {
      logger.error('Failed to exchange Microsoft OAuth code:', error);
      throw error;
    }
  }

  async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    try {
      logger.info('Fetching Microsoft user info');

      return {
        id: 'microsoft_user_123',
        email: 'user@outlook.com',
        name: 'Microsoft User',
        firstName: 'Microsoft',
        lastName: 'User',
        verified: true
      };
    } catch (error) {
      logger.error('Failed to fetch Microsoft user info:', error);
      throw error;
    }
  }
}

// OAuth Service Factory
export class OAuthService {
  private providers: Map<string, OAuthProvider> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Google
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      this.providers.set('google', new GoogleOAuthProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_REDIRECT_URI || `${process.env.API_URL}/auth/oauth/google/callback`,
        scope: ['openid', 'email', 'profile']
      }));
      logger.info('Google OAuth provider initialized');
    }

    // Microsoft
    if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
      this.providers.set('microsoft', new MicrosoftOAuthProvider({
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        redirectUri: process.env.MICROSOFT_REDIRECT_URI || `${process.env.API_URL}/auth/oauth/microsoft/callback`,
        scope: ['openid', 'email', 'profile']
      }));
      logger.info('Microsoft OAuth provider initialized');
    }
  }

  getProvider(providerName: string): OAuthProvider | undefined {
    return this.providers.get(providerName);
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  verifyState(state: string, storedState: string): boolean {
    return state === storedState;
  }
}

export const oauthService = new OAuthService();
