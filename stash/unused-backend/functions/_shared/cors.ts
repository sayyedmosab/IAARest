
// REQ-DOC: These are the standard CORS headers required by Supabase
// to allow browser-based clients to call Edge Functions.

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
