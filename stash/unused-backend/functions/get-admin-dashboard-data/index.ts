
import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

// REQ-DOC: This protected function calculates and returns all data needed for the admin dashboard.

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

    // 2. Fetch all subscriptions for calculations
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('*, plans (name_en)')

    if (subsError) throw subsError

    const activeSubs = subscriptions.filter(s => s.status === 'active');

    // 3. Calculate KPIs
    const mrr = activeSubs.reduce((sum, sub) => sum + sub.price_charged_aed, 0);
    const activeSubscribersCount = activeSubs.length;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newSubscribersLast30Days = subscriptions.filter(s => new Date(s.created_at) >= thirtyDaysAgo).length;
    
    const upcomingCancellations = subscriptions.filter(s => s.status === 'cancelled').length; // Placeholder

    // 4. Prepare chart data
    const subscribersByPlan = activeSubs.reduce((acc, sub) => {
      const planName = sub.plans.name_en;
      acc[planName] = (acc[planName] || 0) + 1;
      return acc;
    }, {});

    const responseData = {
      mrr,
      activeSubscribersCount,
      newSubscribersLast30Days,
      upcomingCancellations,
      subscribersByPlan,
      // TODO: Add cashflow calendar data
    };

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
