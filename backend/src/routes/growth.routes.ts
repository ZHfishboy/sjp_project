import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { validate, body } from '../middleware/validator';
import {
  // Gift pack
  checkGiftEligibility,
  recordGiftShown,
  dismissGiftPopup,
  // Invite
  getMyInviteInfo,
  getMyInvitees,
  // Exit intent
  getExitCopy,
  logExitIntent,
  // Splash popup
  getSplashPopups,
  logSplashPopup,
} from '../controllers/growth.controller';

const router = Router();

// ====================================================================
// Gift Pack Routes — /api/v1/gift/*
// ====================================================================
const giftRouter = Router();
giftRouter.get('/first-purchase', requireAuth, checkGiftEligibility);
giftRouter.post('/first-purchase/shown', requireAuth, recordGiftShown);
giftRouter.post('/first-purchase/dismiss', requireAuth, dismissGiftPopup);

// ====================================================================
// Invite Routes — /api/v1/invite/*
// ====================================================================
const inviteRouter = Router();
inviteRouter.get('/my-code', requireAuth, getMyInviteInfo);
inviteRouter.get('/my-invitees', requireAuth, getMyInvitees);

// ====================================================================
// Exit Intent Routes — /api/v1/exit-intent/*
// ====================================================================
const exitIntentRouter = Router();
exitIntentRouter.get('/copy', optionalAuth, getExitCopy);
exitIntentRouter.post('/log', optionalAuth, logExitIntent);

// ====================================================================
// Splash Popup Routes — /api/v1/splash-popup/*
// ====================================================================
const splashRouter = Router();
splashRouter.get('/list', optionalAuth, getSplashPopups);
splashRouter.post('/log', optionalAuth, logSplashPopup);

// Mount all sub-routers
router.use('/gift', giftRouter);
router.use('/invite', inviteRouter);
router.use('/exit-intent', exitIntentRouter);
router.use('/splash-popup', splashRouter);

export default router;
