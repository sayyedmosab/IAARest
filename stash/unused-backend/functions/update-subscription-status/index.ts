
import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

// REQ-DOC: This protected function updates the status of a subscription.

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

    // 2. Get subscriptionId and newStatus from request body
    const { subscriptionId, newStatus } = await req.json()
    if (!subscriptionId || !newStatus) {
      throw new Error('Subscription ID and new status are required')
    }

    // 3. Update the subscription
    const { data, error } = await supabase
      .from('subscriptions')
      .update({ status: newStatus })
      .eq('id', subscriptionId)
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
