import express from 'express';
import verifyFirebaseIdToken from '../middleware/verifyAuth';
import {
  linkedinStart,
  linkedinCallback,
  linkedinComplete,
  linkedinChooseRole,
  linkedinUnlink,
  linkedinLinkStatus,
} from '../controllers/linkedinAuthController';

var router = express.Router();

// Public — no auth required
router.get( '/auth/linkedin/start',       linkedinStart);
router.get( '/auth/linkedin/callback',    linkedinCallback);
router.post('/auth/linkedin/complete',    linkedinComplete);
router.post('/auth/linkedin/choose-role', linkedinChooseRole);

// Protected — requires valid Firebase ID token
router.delete('/auth/linkedin/unlink',      verifyFirebaseIdToken, linkedinUnlink);
router.get(   '/auth/linkedin/link-status', verifyFirebaseIdToken, linkedinLinkStatus);

export default router;
