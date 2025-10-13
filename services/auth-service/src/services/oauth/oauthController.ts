/**
 * OAuth2 Controller
 */

import { Request, Response } from 'express';
import { oauthService } from './oauthProvider';
import { logger } from '../../utils/logger';

export class OAuthController {
  async initiateOAuth(req: Request, res: Response) {
    try {
      const { provider } = req.params;
      
      const oauthProvider = oauthService.getProvider(provider);
      
      if (!oauthProvider) {
        return res.status(400).json({
          success: false,
          error: `OAuth provider '${provider}' not configured`
        });
      }

      const state = oauthService.generateState();
      
      // Store state in session or database for verification
      // req.session.oauthState = state;
      
      const authUrl = oauthProvider.getAuthorizationUrl(state);
      
      res.json({
        success: true,
        data: {
          authUrl,
          state
        }
      });
    } catch (error: any) {
      logger.error('OAuth initiation failed:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async handleOAuthCallback(req: Request, res: Response) {
    try {
      const { provider } = req.params;
      const { code, state } = req.query;

      if (!code || !state) {
        return res.status(400).json({
          success: false,
          error: 'Missing code or state parameter'
        });
      }

      const oauthProvider = oauthService.getProvider(provider);
      
      if (!oauthProvider) {
        return res.status(400).json({
          success: false,
          error: `OAuth provider '${provider}' not configured`
        });
      }

      // Verify state
      // const storedState = req.session.oauthState;
      // if (!oauthService.verifyState(state as string, storedState)) {
      //   return res.status(400).json({
      //     success: false,
      //     error: 'Invalid state parameter'
      //   });
      // }

      // Exchange code for token
      const tokenResponse = await oauthProvider.exchangeCodeForToken(code as string);
      
      // Get user info
      const userInfo = await oauthProvider.getUserInfo(tokenResponse.access_token);
      
      // Find or create user in database
      // const user = await findOrCreateOAuthUser(provider, userInfo);
      
      // Generate JWT token
      // const jwtToken = generateJWT(user);
      
      logger.info('OAuth authentication successful', {
        provider,
        userId: userInfo.id
      });

      res.json({
        success: true,
        data: {
          user: userInfo,
          token: 'mock_jwt_token',
          expiresIn: 3600
        }
      });
    } catch (error: any) {
      logger.error('OAuth callback failed:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async listProviders(req: Request, res: Response) {
    try {
      const providers = oauthService.getAvailableProviders();
      
      res.json({
        success: true,
        data: {
          providers,
          count: providers.length
        }
      });
    } catch (error: any) {
      logger.error('Failed to list OAuth providers:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export const oauthController = new OAuthController();
