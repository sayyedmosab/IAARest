
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

    const { data: plans, error: plansError } = await supabase
      .from('plans')
      .select('*')
      .eq('status', 'active')
      .order('base_price_aed', { ascending: true })

    if (plansError) throw plansError

    const { data: meals, error: mealsError } = await supabase
      .from('meals')
      .select(`
        id,
        name_en,
        name_ar,
        description_en,
        description_ar,
        nutritional_facts_en,
        nutritional_facts_ar,
        meal_images (id, image_url, sort_order),
        meal_ingredients (
          weight_g,
          ingredients (
            name_en,
            name_ar
          )
        )
      `)
      .eq('is_active', true)
      .order('sort_order', { foreignTable: 'meal_images', ascending: true })

    if (mealsError) throw mealsError

    const responseData = {
      plans,
      meals,
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
