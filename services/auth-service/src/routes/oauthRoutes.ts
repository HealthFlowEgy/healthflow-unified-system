import { Router } from 'express';
import { oauthController } from '../services/oauth/oauthController';

const router = Router();

router.get('/providers', oauthController.listProviders.bind(oauthController));
router.get('/:provider/authorize', oauthController.initiateOAuth.bind(oauthController));
router.get('/:provider/callback', oauthController.handleOAuthCallback.bind(oauthController));

export default router;
