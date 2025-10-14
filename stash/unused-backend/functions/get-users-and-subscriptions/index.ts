
import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

// REQ-DOC: This protected function fetches all user profiles and all subscriptions for the admin user management page.

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // 1. Authenticate and verify admin status
    const authHeader = req.headers.get('Authorization')!
    const jwt = authHeader.split(' ')[1]
    const payload = JSON.parse(atob(jwt.split('.')[1]))
    const userId = payload.sub
    if (!userId) throw new Error('User not authenticated')

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', userId)
      .single()
    if (profileError || !profile.is_admin) {
      throw new Error('Access denied: User is not an admin')
    }

    // 2. Fetch all profiles and subscriptions
    const { data: profiles, error: profilesError } = await supabase.from('profiles').select('*')
    if (profilesError) throw profilesError

    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('*, profiles (*), plans (name_en)')
    if (subsError) throw subsError

    const responseData = {
      profiles,
      subscriptions,
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
