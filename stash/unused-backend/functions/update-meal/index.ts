
import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

// REQ-DOC: This protected function creates or updates a meal, including its ingredients.

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

    // 2. Get meal data from request body
    const mealData = await req.json()
    const { meal_ingredients, ...mainMealData } = mealData

    // 3. Upsert the main meal data
    const { data: upsertedMeal, error: upsertError } = await supabase
      .from('meals')
      .upsert(mainMealData)
      .select()
      .single()
    if (upsertError) throw upsertError

    const mealId = upsertedMeal.id

    // 4. Handle ingredients
    // First, delete existing ingredients for this meal
    const { error: deleteIngError } = await supabase
      .from('meal_ingredients')
      .delete()
      .eq('meal_id', mealId)
    if (deleteIngError) throw deleteIngError

    // Then, insert the new ones
    if (meal_ingredients && meal_ingredients.length > 0) {
      const ingredientsToInsert = meal_ingredients.map(ing => ({
        meal_id: mealId,
        ingredient_id: ing.ingredient_id,
        weight_g: ing.weight_g,
      }))
      const { error: insertIngError } = await supabase
        .from('meal_ingredients')
        .insert(ingredientsToInsert)
      if (insertIngError) throw insertIngError
    }

    return new Response(JSON.stringify(upsertedMeal), {
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
