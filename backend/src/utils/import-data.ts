import * as fs from 'fs';
import * as path from 'path';
import { DatabaseConnection } from '../database/database.js';
import {
  ingredientRepo,
  planRepo,
  profileRepo,
  mealRepo,
  subscriptionRepo,
  paymentRepo,
  mealIngredientRepo,
  mealImageRepo,
  discountRepo,
  menuCycleRepo,
  menuCycleDayRepo,
  menuDayAssignmentRepo,
  deliveryRepo
} from '../services/repositories.js';

interface ImportResult {
  success: boolean;
  table: string;
  records_processed: number;
  records_inserted: number;
  errors: string[];
}

class DataImporter {
  private db: DatabaseConnection;
  private results: ImportResult[] = [];

  constructor() {
    this.db = DatabaseConnection.getInstance();
  }

  async importAllData(): Promise<void> {
    console.log('🚀 Starting SQLite data import...');

    try {
      // Find the latest export file
      const exportDir = path.join(__dirname, '../../data/export');
      if (!fs.existsSync(exportDir)) {
        throw new Error('Export directory not found. Run export first.');
      }

      const exportFiles = fs.readdirSync(exportDir)
        .filter(file => file.startsWith('supabase_export_') && file.endsWith('.json'))
        .sort()
        .reverse(); // Get latest first

      if (exportFiles.length === 0) {
        throw new Error('No export files found. Run export first.');
      }

      const latestExport = exportFiles[0];
      const exportPath = path.join(exportDir, latestExport);

      console.log(`📂 Using export file: ${latestExport}`);

      // Read and parse export data
      const exportDataStr = fs.readFileSync(exportPath, 'utf8');
      const exportData = JSON.parse(exportDataStr);

      console.log('📊 Import Summary:');
      console.log(`   • Profiles: ${exportData.profiles.length}`);
      console.log(`   • Plans: ${exportData.plans.length}`);
      console.log(`   • Meals: ${exportData.meals.length}`);
      console.log(`   • Ingredients: ${exportData.ingredients.length}`);
      console.log(`   • Subscriptions: ${exportData.subscriptions.length}`);
      console.log(`   • Payments: ${exportData.payments.length}`);

      // Import in dependency order
      await this.importIngredients(exportData.ingredients);
      await this.importPlans(exportData.plans);
      await this.importProfiles(exportData.profiles);
      await this.importMeals(exportData.meals);
      await this.importMealIngredients(exportData.meal_ingredients);
      await this.importMealImages(exportData.meal_images);
      await this.importDiscounts(exportData.discounts);
      await this.importSubscriptions(exportData.subscriptions);
      await this.importPayments(exportData.payments);
      await this.importMenuCycles(exportData.menu_cycles);
      await this.importMenuCycleDays(exportData.menu_cycle_days);
      await this.importMenuDayAssignments(exportData.menu_day_assignments);
      await this.importDeliveries(exportData.deliveries);

      this.printSummary();

    } catch (error) {
      console.error('❌ Import failed:', error);
      throw error;
    }
  }

  private async importIngredients(data: any[]): Promise<void> {
    const result: ImportResult = {
      success: true,
      table: 'ingredients',
      records_processed: data.length,
      records_inserted: 0,
      errors: []
    };

    console.log(`📥 Importing ${data.length} ingredients...`);

    for (const item of data) {
      try {
        // Transform data for SQLite
        const ingredient = {
          id: item.id,
          name_en: item.name_en,
          name_ar: item.name_ar,
          unit_base: item.unit_base || 'g',
          per100g_calories: parseFloat(item.per100g_calories) || 0,
          per100g_protein_g: parseFloat(item.per100g_protein_g) || 0,
          per100g_carbs_g: parseFloat(item.per100g_carbs_g) || 0,
          per100g_fat_g: parseFloat(item.per100g_fat_g) || 0,
          per100g_fiber_g: parseFloat(item.per100g_fiber_g) || 0,
          per100g_sodium_mg: parseFloat(item.per100g_sodium_mg) || 0,
          source_type: item.source_type || 'local',
          source_ref: item.source_ref,
          created_at: item.created_at,
          updated_at: item.updated_at
        };

        ingredientRepo.create(ingredient);
        result.records_inserted++;

      } catch (error) {
        result.errors.push(`Failed to import ingredient ${item.id}: ${error}`);
      }
    }

    this.results.push(result);
    console.log(`✅ Ingredients: ${result.records_inserted}/${result.records_processed} imported`);
  }

  private async importPlans(data: any[]): Promise<void> {
    const result: ImportResult = {
      success: true,
      table: 'plans',
      records_processed: data.length,
      records_inserted: 0,
      errors: []
    };

    console.log(`📥 Importing ${data.length} plans...`);

    for (const item of data) {
      try {
        const plan = {
          id: item.id,
          code: item.code,
          name_en: item.name_en,
          name_ar: item.name_ar,
          meals_per_day: parseInt(item.meals_per_day),
          delivery_days: parseInt(item.delivery_days),
          duration_label: item.duration_label || '1_month',
          base_price_aed: parseFloat(item.base_price_aed),
          position_note_en: item.position_note_en,
          position_note_ar: item.position_note_ar,
          status: item.status || 'active',
          created_at: item.created_at,
          updated_at: item.updated_at,
          discounted_price_aed: item.discounted_price_aed ? parseFloat(item.discounted_price_aed) : undefined
        };

        planRepo.create(plan);
        result.records_inserted++;

      } catch (error) {
        result.errors.push(`Failed to import plan ${item.id}: ${error}`);
      }
    }

    this.results.push(result);
    console.log(`✅ Plans: ${result.records_inserted}/${result.records_processed} imported`);
  }

  private async importProfiles(data: any[]): Promise<void> {
    const result: ImportResult = {
      success: true,
      table: 'profiles',
      records_processed: data.length,
      records_inserted: 0,
      errors: []
    };

    console.log(`📥 Importing ${data.length} profiles...`);

    for (const item of data) {
      try {
        const profile = {
          user_id: item.user_id,
          email: item.email,
          password: item.password || 'defaultpassword123', // Add default password if not provided
          first_name: item.first_name,
          last_name: item.last_name,
          language_pref: item.language_pref || 'ar',
          date_of_birth: item.date_of_birth,
          height_cm: item.height_cm ? parseFloat(item.height_cm) : undefined,
          weight_kg: item.weight_kg ? parseFloat(item.weight_kg) : undefined,
          goal: item.goal,
          phone_e164: item.phone_e164,
          is_admin: item.is_admin ? true : false, // Convert to boolean
          created_at: item.created_at,
          updated_at: item.updated_at,
          is_student: item.is_student ? true : false, // Convert to boolean
          university_email: item.university_email,
          student_id_expiry: item.student_id_expiry,
          address: item.address,
          district: item.district
        };

        profileRepo.create(profile);
        result.records_inserted++;

      } catch (error) {
        result.errors.push(`Failed to import profile ${item.user_id}: ${error}`);
      }
    }

    this.results.push(result);
    console.log(`✅ Profiles: ${result.records_inserted}/${result.records_processed} imported`);
  }

  private async importMeals(data: any[]): Promise<void> {
    const result: ImportResult = {
      success: true,
      table: 'meals',
      records_processed: data.length,
      records_inserted: 0,
      errors: []
    };

    console.log(`📥 Importing ${data.length} meals...`);

    for (const item of data) {
      try {
        const meal = {
          id: item.id,
          name_en: item.name_en,
          name_ar: item.name_ar,
          description_en: item.description_en,
          description_ar: item.description_ar,
          image_filename: item.image_filename,
          created_at: item.created_at,
          updated_at: item.updated_at,
          nutritional_facts_en: item.nutritional_facts_en,
          nutritional_facts_ar: item.nutritional_facts_ar,
          ingredients_en: item.ingredients_en,
          ingredients_ar: item.ingredients_ar,
          is_active: item.is_active !== undefined ? (item.is_active ? true : false) : true
        };

        mealRepo.create(meal);
        result.records_inserted++;

      } catch (error) {
        result.errors.push(`Failed to import meal ${item.id}: ${error}`);
      }
    }

    this.results.push(result);
    console.log(`✅ Meals: ${result.records_inserted}/${result.records_processed} imported`);
  }

  private async importMealIngredients(data: any[]): Promise<void> {
    const result: ImportResult = {
      success: true,
      table: 'meal_ingredients',
      records_processed: data.length,
      records_inserted: 0,
      errors: []
    };

    console.log(`📥 Importing ${data.length} meal ingredients...`);

    for (const item of data) {
      try {
        const mealIngredient = {
          meal_id: item.meal_id,
          ingredient_id: item.ingredient_id,
          weight_g: parseFloat(item.weight_g),
          notes: item.notes
        };

        mealIngredientRepo.create(mealIngredient);
        result.records_inserted++;

      } catch (error) {
        result.errors.push(`Failed to import meal ingredient ${item.meal_id}-${item.ingredient_id}: ${error}`);
      }
    }

    this.results.push(result);
    console.log(`✅ Meal Ingredients: ${result.records_inserted}/${result.records_processed} imported`);
  }

  private async importMealImages(data: any[]): Promise<void> {
    const result: ImportResult = {
      success: true,
      table: 'meal_images',
      records_processed: data.length,
      records_inserted: 0,
      errors: []
    };

    console.log(`📥 Importing ${data.length} meal images...`);

    for (const item of data) {
      try {
        const mealImage = {
          id: item.id,
          meal_id: item.meal_id,
          image_url: item.image_url,
          sort_order: parseInt(item.sort_order) || 1,
          created_at: item.created_at
        };

        mealImageRepo.create(mealImage);
        result.records_inserted++;

      } catch (error) {
        result.errors.push(`Failed to import meal image ${item.id}: ${error}`);
      }
    }

    this.results.push(result);
    console.log(`✅ Meal Images: ${result.records_inserted}/${result.records_processed} imported`);
  }

  private async importSubscriptions(data: any[]): Promise<void> {
    const result: ImportResult = {
      success: true,
      table: 'subscriptions',
      records_processed: data.length,
      records_inserted: 0,
      errors: []
    };

    console.log(`📥 Importing ${data.length} subscriptions...`);

    for (const item of data) {
      try {
        const subscription = {
          id: item.id,
          user_id: item.user_id,
          plan_id: item.plan_id,
          status: item.status || 'pending_payment',
          start_date: item.start_date,
          end_date: item.end_date,
          student_discount_applied: item.student_discount_applied ? true : false,
          price_charged_aed: parseFloat(item.price_charged_aed),
          currency: item.currency || 'AED',
          created_at: item.created_at,
          updated_at: item.updated_at,
          renewal_type: item.renewal_type || 'manual',
          has_successful_payment: item.has_successful_payment ? true : false
        };

        subscriptionRepo.create(subscription);
        result.records_inserted++;

      } catch (error) {
        result.errors.push(`Failed to import subscription ${item.id}: ${error}`);
      }
    }

    this.results.push(result);
    console.log(`✅ Subscriptions: ${result.records_inserted}/${result.records_processed} imported`);
  }

  private async importPayments(data: any[]): Promise<void> {
    const result: ImportResult = {
      success: true,
      table: 'payments',
      records_processed: data.length,
      records_inserted: 0,
      errors: []
    };

    console.log(`📥 Importing ${data.length} payments...`);

    for (const item of data) {
      try {
        const payment = {
          id: item.id,
          subscription_id: item.subscription_id,
          method: item.method || 'other',
          amount_aed: parseFloat(item.amount_aed),
          currency: item.currency || 'AED',
          status: item.status || 'succeeded',
          provider: item.provider,
          provider_txn_id: item.provider_txn_id,
          receipt_url: item.receipt_url,
          created_at: item.created_at,
          updated_at: item.updated_at
        };

        paymentRepo.create(payment);
        result.records_inserted++;

      } catch (error) {
        result.errors.push(`Failed to import payment ${item.id}: ${error}`);
      }
    }

    this.results.push(result);
    console.log(`✅ Payments: ${result.records_inserted}/${result.records_processed} imported`);
  }

  private async importDiscounts(data: any[]): Promise<void> {
    const result: ImportResult = {
      success: true,
      table: 'discounts',
      records_processed: data.length,
      records_inserted: 0,
      errors: []
    };

    console.log(`📥 Importing ${data.length} discounts...`);

    for (const item of data) {
      try {
        const discount = {
          id: item.id,
          plan_id: item.plan_id,
          is_student_only: item.is_student_only ? true : false,
          discount_type: item.discount_type || 'percent',
          value: parseFloat(item.value),
          starts_at: item.starts_at,
          ends_at: item.ends_at,
          active: item.active !== undefined ? (item.active ? true : false) : true,
          created_at: item.created_at,
          updated_at: item.updated_at
        };

        discountRepo.create(discount);
        result.records_inserted++;

      } catch (error) {
        result.errors.push(`Failed to import discount ${item.id}: ${error}`);
      }
    }

    this.results.push(result);
    console.log(`✅ Discounts: ${result.records_inserted}/${result.records_processed} imported`);
  }

  private async importMenuCycles(data: any[]): Promise<void> {
    const result: ImportResult = {
      success: true,
      table: 'menu_cycles',
      records_processed: data.length,
      records_inserted: 0,
      errors: []
    };

    console.log(`📥 Importing ${data.length} menu cycles...`);

    for (const item of data) {
      try {
        const menuCycle = {
          id: item.id,
          name: item.name,
          cycle_length_days: parseInt(item.cycle_length_days) || 14,
          is_active: item.is_active !== undefined ? (item.is_active ? true : false) : true,
          created_at: item.created_at,
          updated_at: item.updated_at
        };

        menuCycleRepo.create(menuCycle);
        result.records_inserted++;

      } catch (error) {
        result.errors.push(`Failed to import menu cycle ${item.id}: ${error}`);
      }
    }

    this.results.push(result);
    console.log(`✅ Menu Cycles: ${result.records_inserted}/${result.records_processed} imported`);
  }

  private async importMenuCycleDays(data: any[]): Promise<void> {
    const result: ImportResult = {
      success: true,
      table: 'menu_cycle_days',
      records_processed: data.length,
      records_inserted: 0,
      errors: []
    };

    console.log(`📥 Importing ${data.length} menu cycle days...`);

    for (const item of data) {
      try {
        const menuCycleDay = {
          id: item.id,
          cycle_id: item.cycle_id,
          day_index: parseInt(item.day_index),
          label: item.label
        };

        menuCycleDayRepo.create(menuCycleDay);
        result.records_inserted++;

      } catch (error) {
        result.errors.push(`Failed to import menu cycle day ${item.id}: ${error}`);
      }
    }

    this.results.push(result);
    console.log(`✅ Menu Cycle Days: ${result.records_inserted}/${result.records_processed} imported`);
  }

  private async importMenuDayAssignments(data: any[]): Promise<void> {
    const result: ImportResult = {
      success: true,
      table: 'menu_day_assignments',
      records_processed: data.length,
      records_inserted: 0,
      errors: []
    };

    console.log(`📥 Importing ${data.length} menu day assignments...`);

    for (const item of data) {
      try {
        const assignment = {
          id: item.id,
          cycle_day_id: item.cycle_day_id,
          meal_id: item.meal_id,
          slot: item.slot || 'lunch',
          plan_id: item.plan_id,
          created_at: item.created_at,
          updated_at: item.updated_at
        };

        menuDayAssignmentRepo.create(assignment);
        result.records_inserted++;

      } catch (error) {
        result.errors.push(`Failed to import menu day assignment ${item.id}: ${error}`);
      }
    }

    this.results.push(result);
    console.log(`✅ Menu Day Assignments: ${result.records_inserted}/${result.records_processed} imported`);
  }

  private async importDeliveries(data: any[]): Promise<void> {
    const result: ImportResult = {
      success: true,
      table: 'deliveries',
      records_processed: data.length,
      records_inserted: 0,
      errors: []
    };

    console.log(`📥 Importing ${data.length} deliveries...`);

    for (const item of data) {
      try {
        const delivery = {
          id: item.id,
          subscription_id: item.subscription_id,
          delivery_date: item.delivery_date,
          meals_count: parseInt(item.meals_count),
          status: item.status || 'scheduled',
          address_snapshot: JSON.stringify(item.address_snapshot || {}),
          created_at: item.created_at,
          updated_at: item.updated_at
        };

        deliveryRepo.create(delivery);
        result.records_inserted++;

      } catch (error) {
        result.errors.push(`Failed to import delivery ${item.id}: ${error}`);
      }
    }

    this.results.push(result);
    console.log(`✅ Deliveries: ${result.records_inserted}/${result.records_processed} imported`);
  }

  private printSummary(): void {
    console.log('\n📊 Import Summary:');
    console.log('================');

    let totalProcessed = 0;
    let totalInserted = 0;
    let totalErrors = 0;

    for (const result of this.results) {
      console.log(`${result.table}: ${result.records_inserted}/${result.records_processed} ✅`);

      if (result.errors.length > 0) {
        console.log(`  ❌ Errors: ${result.errors.length}`);
        result.errors.slice(0, 3).forEach(error => console.log(`     • ${error}`));
        if (result.errors.length > 3) {
          console.log(`     ... and ${result.errors.length - 3} more errors`);
        }
      }

      totalProcessed += result.records_processed;
      totalInserted += result.records_inserted;
      totalErrors += result.errors.length;
    }

    console.log('\n🎯 Final Results:');
    console.log(`================`);
    console.log(`Total Records Processed: ${totalProcessed}`);
    console.log(`Total Records Inserted: ${totalInserted}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Success Rate: ${((totalInserted / totalProcessed) * 100).toFixed(1)}%`);

    if (totalErrors === 0) {
      console.log('🎉 All data imported successfully!');
    } else {
      console.log('⚠️  Some records failed to import. Check errors above.');
    }
  }
}

// Main execution function
async function main() {
  try {
    const importer = new DataImporter();
    await importer.importAllData();

  } catch (error) {
    console.error('❌ Import process failed:', error);
    process.exit(1);
  }
}

// Run import if this file is executed directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('Import process finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Import process failed:', error);
      process.exit(1);
    });
}

export { DataImporter };