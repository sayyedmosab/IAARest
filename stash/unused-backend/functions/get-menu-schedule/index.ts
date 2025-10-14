
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

    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get date 14 days from now
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 14);

    const { data, error } = await supabase
      .from('menu_schedule')
      .select(`
        date,
        lunch_meal_id,
        dinner_meal_id,
        lunch:meals!lunch_meal_id ( ...meal_fields ),
        dinner:meals!dinner_meal_id ( ...meal_fields )
      `)
      .gte('date', today.toISOString())
      .lte('date', futureDate.toISOString())
      .order('date', { ascending: true })

    if (error) throw error;

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

// Supabase helper for reusable meal fields selection
const meal_fields = `
  id,
  name_en,
  name_ar,
  description_en,
  description_ar,
  meal_images (id, image_url, sort_order)
`;
