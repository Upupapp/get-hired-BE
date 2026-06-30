import express from 'express';
import { googleFirebaseSession, chooseRole } from '../controllers/googleAuthController';

const router = express.Router();

// POST /api/auth/google/firebase-session
// Anonymous — accepts Google ID token from GIS, returns session or role_required
router.post('/auth/google/firebase-session', googleFirebaseSession);

// POST /api/auth/choose-role
// Anonymous-but-token-gated — accepts Firebase ID token + selectedRole, creates user record
router.post('/auth/choose-role', chooseRole);

export default router;
