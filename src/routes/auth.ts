import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase';
import { AuthPayload, authenticate } from '../middleware/auth';

const router = Router();
const SALT_ROUNDS = 10;

router.post('/signup', async (req: Request, res: Response) => {
  const { email, password, full_name, role } = req.body as {
    email?: string;
    password?: string;
    full_name?: string;
    role?: 'student' | 'tutor';
  };

  if (!email || !password || !full_name || !role) {
    return res.status(400).json({ error: 'email, password, full_name, and role are required' });
  }

  if (!['student', 'tutor'].includes(role)) {
    return res.status(400).json({ error: 'role must be student or tutor' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters' });
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  const { data: user, error } = await supabase
    .from('users')
    .insert({
      email: email.trim().toLowerCase(),
      full_name: full_name.trim(),
      role,
      password_hash,
    })
    .select('id, email, full_name, role, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    return res.status(500).json({ error: error.message });
  }

  if (role === 'tutor') {
    await supabase.from('tutor_profiles').insert({
      user_id: user.id,
      subjects: ['General'],
      curriculum: ['IB', 'GCSE'],
      hourly_rate: 45.0,
      bio: 'New tutor — update your profile.',
      is_verified: false,
    });
  }

  const token = signToken(user);
  return res.status(201).json({ token, user });
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, full_name, role, password_hash')
    .eq('email', email.trim().toLowerCase())
    .single();

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (!user.password_hash) {
    return res.status(401).json({
      error: 'This account has no password set. Use signup or run demo JWT for seed users.',
    });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const { password_hash: _, ...safe } = user;
  const token = signToken({ id: user.id, email: user.email, role: user.role });
  return res.json({ token, user: safe });
});

router.get('/me', authenticate, async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, role, created_at')
    .eq('id', req.user!.userId)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({ user: data });
});

function signToken(user: { id: string; email: string; role: AuthPayload['role'] }) {
  const payload: AuthPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
}

export default router;
