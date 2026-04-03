import { Router, Request, Response } from 'express';
import { google } from 'googleapis';
import { supabase } from '../lib/supabase';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Configure the Google OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID || 'mock_client_id',
  process.env.GOOGLE_CLIENT_SECRET || 'mock_client_secret',
  `${process.env.BACKEND_URL || 'http://localhost:4000'}/calendar/callback`
);

// 1. Generate Auth URL for the Tutor
router.get('/auth', authenticate, requireRole('tutor'), (req: Request, res: Response) => {
  const tutorId = req.user!.userId;
  
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Crucial: gets the refresh token
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state: tutorId, // Pass the tutor's ID so we know who authorized it in the callback
    prompt: 'consent' // Forces consent screen to ensure refresh token is provided
  });
  
  res.json({ url });
});

// 2. Handle Google Callback
router.get('/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const tutorId = req.query.state as string;
  
  if (!code || !tutorId) return res.status(400).send('Missing code or state');

  try {
    // In a real production app with valid keys:
    // const { tokens } = await oauth2Client.getToken(code);
    // const refreshToken = tokens.refresh_token; 
    
    // For this interview demo we will gracefully mock the token generation
    // if real keys aren't provided in the .env
    let refreshToken = 'mock_refresh_token_' + Date.now();
    
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'mock_client_id') {
      const { tokens } = await oauth2Client.getToken(code);
      if (tokens.refresh_token) refreshToken = tokens.refresh_token;
    }

    // Save refresh token to tutor's profile
    const { error } = await supabase
      .from('tutor_profiles')
      .update({ google_refresh_token: refreshToken })
      .eq('user_id', tutorId);
      
    if (error) throw new Error(error.message);
      
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?calendar=success`);
  } catch (error: any) {
    console.error('Google OAuth Error:', error.message);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?calendar=error`);
  }
});

export default router;
