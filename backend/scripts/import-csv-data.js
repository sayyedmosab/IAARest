const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const csv = require('csv-parser');

const DB_PATH = path.join(__dirname, '../data/ibnexp.db');

// Create database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database');
});

// Function to clear existing data
function clearExistingData() {
    return new Promise((resolve, reject) => {
        console.log('Clearing existing data...');
        
        db.serialize(() => {
            // Clear in order to respect foreign key constraints
            db.run('DELETE FROM meal_ingredients', (err) => {
                if (err) {
                    console.error('Error clearing meal_ingredients:', err.message);
                    reject(err);
                    return;
                }
                console.log('Cleared meal_ingredients table');
            });
            
            db.run('DELETE FROM ingredients', (err) => {
                if (err) {
                    console.error('Error clearing ingredients:', err.message);
                    reject(err);
                    return;
                }
                console.log('Cleared ingredients table');
            });
            
            db.run('DELETE FROM meals', (err) => {
                if (err) {
                    console.error('Error clearing meals:', err.message);
                    reject(err);
                    return;
                }
                console.log('Cleared meals table');
                resolve();
            });
        });
    });
}

// Function to import meals
function importMeals() {
    return new Promise((resolve, reject) => {
        console.log('Importing meals...');
        
        const results = [];
        const filePath = path.join(__dirname, '../../meals_rows.csv');
        
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => {
                results.push(data);
            })
            .on('end', () => {
                console.log(`Found ${results.length} meals to import`);
                
                const stmt = db.prepare(`
                    INSERT INTO meals (
                        id, name_en, name_ar, description_en, description_ar, 
                        image_filename, created_at, updated_at, nutritional_facts_en, 
                        nutritional_facts_ar, ingredients_en, ingredients_ar, is_active
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                
                let imported = 0;
                
                results.forEach((meal, index) => {
                    stmt.run([
                        meal.id,
                        meal.name_en,
                        meal.name_ar,
                        meal.description_en,
                        meal.description_ar,
                        meal.image_filename,
                        meal.created_at,
                        meal.updated_at,
                        meal.nutritional_facts_en,
                        meal.nutritional_facts_ar,
                        meal.ingredients_en,
                        meal.ingredients_ar,
                        meal.is_active === 'true' ? 1 : 0
                    ], (err) => {
                        if (err) {
                            console.error(`Error importing meal ${meal.id}:`, err.message);
                        } else {
                            imported++;
                        }
                        
                        if (index === results.length - 1) {
                            stmt.finalize();
                            console.log(`Successfully imported ${imported}/${results.length} meals`);
                            resolve();
                        }
                    });
                });
            })
            .on('error', (err) => {
                reject(err);
            });
    });
}

// Function to import ingredients
function importIngredients() {
    return new Promise((resolve, reject) => {
        console.log('Importing ingredients...');
        
        const results = [];
        const filePath = path.join(__dirname, '../../ingredients_rows.csv');
        
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => {
                results.push(data);
            })
            .on('end', () => {
                console.log(`Found ${results.length} ingredients to import`);
                
                const stmt = db.prepare(`
                    INSERT INTO ingredients (
                        id, name_en, name_ar, unit_base, per100g_calories, 
                        per100g_protein_g, per100g_carbs_g, per100g_fat_g, 
                        per100g_fiber_g, per100g_sodium_mg, source_type, 
                        source_ref, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                
                let imported = 0;
                
                results.forEach((ingredient, index) => {
                    stmt.run([
                        ingredient.id,
                        ingredient.name_en,
                        ingredient.name_ar,
                        ingredient.unit_base,
                        parseFloat(ingredient.per100g_calories),
                        parseFloat(ingredient.per100g_protein_g),
                        parseFloat(ingredient.per100g_carbs_g),
                        parseFloat(ingredient.per100g_fat_g),
                        parseFloat(ingredient.per100g_fiber_g),
                        parseFloat(ingredient.per100g_sodium_mg),
                        ingredient.source_type,
                        ingredient.source_ref,
                        ingredient.created_at,
                        ingredient.updated_at
                    ], (err) => {
                        if (err) {
                            console.error(`Error importing ingredient ${ingredient.id}:`, err.message);
                        } else {
                            imported++;
                        }
                        
                        if (index === results.length - 1) {
                            stmt.finalize();
                            console.log(`Successfully imported ${imported}/${results.length} ingredients`);
                            resolve();
                        }
                    });
                });
            })
            .on('error', (err) => {
                reject(err);
            });
    });
}

// Function to import meal_ingredients
function importMealIngredients() {
    return new Promise((resolve, reject) => {
        console.log('Importing meal_ingredients...');
        
        const results = [];
        const filePath = path.join(__dirname, '../../meal_ingredients_rows.csv');
        
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => {
                results.push(data);
            })
            .on('end', () => {
                console.log(`Found ${results.length} meal_ingredients to import`);
                
                const stmt = db.prepare(`
                    INSERT INTO meal_ingredients (
                        meal_id, ingredient_id, weight_g, notes
                    ) VALUES (?, ?, ?, ?)
                `);
                
                let imported = 0;
                
                results.forEach((mealIngredient, index) => {
                    stmt.run([
                        mealIngredient.meal_id,
                        mealIngredient.ingredient_id,
                        parseFloat(mealIngredient.weight_g),
                        mealIngredient.notes || null
                    ], (err) => {
                        if (err) {
                            console.error(`Error importing meal_ingredient ${mealIngredient.meal_id}-${mealIngredient.ingredient_id}:`, err.message);
                        } else {
                            imported++;
                        }
                        
                        if (index === results.length - 1) {
                            stmt.finalize();
                            console.log(`Successfully imported ${imported}/${results.length} meal_ingredients`);
                            resolve();
                        }
                    });
                });
            })
            .on('error', (err) => {
                reject(err);
            });
    });
}

// Main import function
async function importAllData() {
    try {
        console.log('=== Starting CSV Data Import ===');
        
        // Clear existing data first
        await clearExistingData();
        
        // Import in order to respect foreign key constraints
        await importMeals();
        await importIngredients();
        await importMealIngredients();
        
        console.log('=== Import Complete ===');
        
        // Verify import
        db.get("SELECT COUNT(*) as count FROM meals", (err, row) => {
            if (!err) console.log(`Meals in database: ${row.count}`);
        });
        
        db.get("SELECT COUNT(*) as count FROM ingredients", (err, row) => {
            if (!err) console.log(`Ingredients in database: ${row.count}`);
        });
        
        db.get("SELECT COUNT(*) as count FROM meal_ingredients", (err, row) => {
            if (!err) console.log(`Meal_ingredients in database: ${row.count}`);
        });
        
    } catch (error) {
        console.error('Import failed:', error);
    } finally {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            } else {
                console.log('Database connection closed');
            }
        });
    }
}

// Run the import
importAllData();