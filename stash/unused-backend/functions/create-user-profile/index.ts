
import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

// REQ-DOC: This function is responsible for creating a user profile in the public.profiles table.
// It should be called after a user has successfully signed up via Supabase Auth.
// It receives the user's ID from the auth token and the profile data from the request body.

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get the user ID from the Authorization header
    const authHeader = req.headers.get('Authorization')!
    const jwt = authHeader.split(' ')[1]
    const payload = JSON.parse(atob(jwt.split('.')[1]))
    const userId = payload.sub

    if (!userId) {
      throw new Error('User ID not found in JWT')
    }

    const { email, firstName, lastName, phone } = await req.json()

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        email: email,
        first_name: firstName,
        last_name: lastName,
        phone_e164: phone,
      })
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify(data), {
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
