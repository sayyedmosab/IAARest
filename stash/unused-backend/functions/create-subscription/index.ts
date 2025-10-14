
import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get user ID from JWT
    const authHeader = req.headers.get('Authorization')!
    const jwt = authHeader.split(' ')[1]
    const payload = JSON.parse(atob(jwt.split('.')[1]))
    const userId = payload.sub
    if (!userId) throw new Error('User not authenticated')

    const { planId } = await req.json()
    if (!planId) throw new Error('Plan ID is required')

    // Fetch plan details to get the price
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('base_price_aed, discounted_price_aed')
      .eq('id', planId)
      .single()
    if (planError) throw planError

    const priceCharged = plan.discounted_price_aed ?? plan.base_price_aed;

    const today = new Date();
    const endDate = new Date(today);
    endDate.setMonth(today.getMonth() + 1);

    const newSubscription = {
      user_id: userId,
      plan_id: planId,
      status: 'pending_payment',
      start_date: today.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      price_charged_aed: priceCharged,
    };

    const { data, error } = await supabase
      .from('subscriptions')
      .insert(newSubscription)
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
