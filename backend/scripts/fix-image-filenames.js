#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'ibnexp.db');
if (!fs.existsSync(dbPath)) {
  console.error('Database not found at', dbPath);
  process.exit(2);
}

const bakPath = dbPath + '.bak.' + Date.now();
fs.copyFileSync(dbPath, bakPath);
console.log('Backup created at', bakPath);

const db = new Database(dbPath);

function stripLeadingSlashes(s) {
  if (s === null || s === undefined) return s;
  return String(s).replace(/^\/+/, '');
}

let updatedMeals = 0;
try {
  const meals = db.prepare('SELECT id, image_filename FROM meals').all();
  const updateMeal = db.prepare('UPDATE meals SET image_filename = ? WHERE id = ?');
  for (const m of meals) {
    if (!m || !m.image_filename) continue;
    const cleaned = stripLeadingSlashes(m.image_filename);
    if (cleaned !== m.image_filename) {
      updateMeal.run(cleaned, m.id);
      updatedMeals++;
    }
  }

  console.log('Updated meals.image_filename rows:', updatedMeals);
} catch (err) {
  console.error('Error updating meals:', err.message);
}

let updatedMealImages = 0;
try {
  // Check if meal_images has image_url or image_filename column
  const cols = db.prepare("PRAGMA table_info('meal_images')").all();
  const hasImageUrl = cols.some(c => c.name === 'image_url');
  const hasImageFilename = cols.some(c => c.name === 'image_filename');

  if (hasImageUrl) {
    const rows = db.prepare('SELECT id, image_url FROM meal_images').all();
    const upd = db.prepare('UPDATE meal_images SET image_url = ? WHERE id = ?');
    for (const r of rows) {
      if (!r || !r.image_url) continue;
      const cleaned = stripLeadingSlashes(r.image_url);
      if (cleaned !== r.image_url) {
        upd.run(cleaned, r.id);
        updatedMealImages++;
      }
    }
    console.log('Updated meal_images.image_url rows:', updatedMealImages);
  } else if (hasImageFilename) {
    const rows = db.prepare('SELECT id, image_filename FROM meal_images').all();
    const upd = db.prepare('UPDATE meal_images SET image_filename = ? WHERE id = ?');
    for (const r of rows) {
      if (!r || !r.image_filename) continue;
      const cleaned = stripLeadingSlashes(r.image_filename);
      if (cleaned !== r.image_filename) {
        upd.run(cleaned, r.id);
        updatedMealImages++;
      }
    }
    console.log('Updated meal_images.image_filename rows:', updatedMealImages);
  } else {
    console.log('meal_images has neither image_url nor image_filename columns; skipping');
  }
} catch (err) {
  console.error('Error updating meal_images:', err.message);
}

db.close();
console.log('Done.');
