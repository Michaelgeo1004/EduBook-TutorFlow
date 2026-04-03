import { supabase } from './supabase';

export type ReadAiRecapInput = {
  session_id: string;
  meeting_id?: string | null;
  summary?: string | null;
  key_points?: string[] | null;
  action_items?: string[] | null;
  transcript_url?: string | null;
  raw_payload?: Record<string, unknown>;
};

export async function saveReadAiRecap(input: ReadAiRecapInput): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('ai_recaps').insert({
    session_id: input.session_id,
    meeting_id: input.meeting_id ?? null,
    summary: input.summary ?? null,
    key_points: input.key_points ?? [],
    action_items: input.action_items ?? [],
    transcript_url: input.transcript_url ?? null,
    raw_payload: input.raw_payload ?? {},
    received_at: new Date().toISOString(),
  });

  if (error) {
    return { error: new Error(error.message) };
  }

  const { error: sessErr } = await supabase
    .from('sessions')
    .update({ status: 'completed' })
    .eq('id', input.session_id);

  if (sessErr) {
    return { error: new Error(sessErr.message) };
  }

  return { error: null };
}
