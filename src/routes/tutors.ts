import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const { data: profiles, error: pErr } = await supabase
    .from('tutor_profiles')
    .select('user_id, hourly_rate, subjects, curriculum, bio, is_verified');

  if (pErr) {
    return res.status(500).json({ error: pErr.message });
  }

  const userIds = [...new Set((profiles || []).map((p) => p.user_id).filter(Boolean))];
  if (userIds.length === 0) {
    return res.json({ tutors: [] });
  }

  const { data: users, error: uErr } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .in('id', userIds)
    .eq('role', 'tutor');

  if (uErr) {
    return res.status(500).json({ error: uErr.message });
  }

  const byUser = new Map((profiles || []).map((p) => [p.user_id, p]));

  const tutors = (users || []).map((u) => {
    const p = byUser.get(u.id);
    return {
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      hourly_rate: p?.hourly_rate ?? null,
      subjects: p?.subjects ?? [],
      curriculum: p?.curriculum ?? [],
      bio: p?.bio ?? null,
      is_verified: p?.is_verified ?? false,
    };
  });

  tutors.sort((a, b) => a.full_name.localeCompare(b.full_name));
  return res.json({ tutors });
});

// GET /me — Fetch the logged-in tutor's profile
router.get('/me', authenticate, requireRole('tutor'), async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const { data: user } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .eq('id', userId)
    .single();

  const { data: profile } = await supabase
    .from('tutor_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  return res.json({
    id: user?.id,
    full_name: user?.full_name,
    email: user?.email,
    profile: profile || null,
  });
});

// PATCH /me — Update the logged-in tutor's profile
router.patch('/me', authenticate, requireRole('tutor'), async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { hourly_rate, subjects, curriculum, bio } = req.body;

  const { data, error } = await supabase
    .from('tutor_profiles')
    .update({ hourly_rate, subjects, curriculum, bio })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  return res.json({ message: 'Profile updated', profile: data });
});

// ADMIN: PATCH /:id/verify — Admin marks a tutor as verified
router.patch('/:id/verify', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('tutor_profiles')
    .update({ is_verified: true })
    .eq('user_id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  return res.json({ message: 'Tutor verified successfully', profile: data });
});

export default router;
