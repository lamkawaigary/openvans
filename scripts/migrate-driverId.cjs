#!/usr/bin/env node
/**
 * One-time migration: rename `ownerId` → `driverId` in Firestore collections.
 *
 * Why: Pre-launch schema cleanup. The user role was renamed from `owner` to
 * `driver` (so `user.role === 'driver'`). The Firestore field was kept as
 * `ownerId` for backward compat, but we now also rename the field to
 * `driverId` so the schema matches the role name semantically.
 *
 * Collections affected:
 *   - vans      (van.ownerId  → van.driverId)
 *   - bookings  (booking.ownerId → booking.driverId, only set when driver accepts)
 *   - drivers   (drivers/{uid}.ownerId → drivers/{uid}.driverId)
 *
 * USAGE
 * -----
 *   # Dry run (default — no changes, just report what would happen)
 *   node scripts/migrate-driverId.cjs
 *
 *   # Actually migrate (adds driverId field, keeps ownerId for safety)
 *   node scripts/migrate-driverId.cjs --write
 *
 *   # Migrate AND remove the now-redundant ownerId field
 *   node scripts/migrate-driverId.cjs --write --cleanup
 *
 *   # Override project ID (default: reads from .firebaserc)
 *   node scripts/migrate-driverId.cjs --project=opensystem-857b2
 *
 * REQUIRED
 * --------
 *   - GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account
 *     JSON with Firestore read+write access
 *   - firebase-admin installed (already in devDependencies)
 *
 * IDEMPOTENT
 * ----------
 *   - Docs that already have `driverId` are skipped
 *   - Docs with `ownerId` get `driverId` set to the same value
 *   - With --cleanup, `ownerId` is removed (only after migration succeeds)
 *   - Re-running the script is safe; no docs are touched twice
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--write');
const CLEANUP = args.includes('--cleanup');
const PROJECT_ARG = args.find(a => a.startsWith('--project='));
const PROJECT_ID = PROJECT_ARG
  ? PROJECT_ARG.split('=')[1]
  : (() => {
      try {
        const rc = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.firebaserc'), 'utf8'));
        return rc.projects?.default;
      } catch {
        return null;
      }
    })();

if (!PROJECT_ID) {
  console.error('❌ Could not determine project ID. Pass --project=... or set up .firebaserc.');
  process.exit(1);
}

if (DRY_RUN) {
  console.log('🔍 DRY RUN — no changes will be made.');
  console.log('   Re-run with --write to actually apply changes.');
} else {
  console.log('⚠️  WRITE MODE — will modify Firestore data.');
  if (CLEANUP) console.log('   --cleanup enabled: will remove ownerId field after migration.');
}
console.log(`📡 Project: ${PROJECT_ID}\n`);

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: PROJECT_ID,
});

const db = admin.firestore();

const COLLECTIONS = [
  { name: 'vans', label: '🚚 Vans' },
  { name: 'bookings', label: '📋 Bookings' },
  { name: 'drivers', label: '👤 Drivers' },
];

const BATCH_SIZE = 400; // Firestore batch limit is 500

async function migrateCollection({ name, label }) {
  console.log(`${label}  (${name})`);
  const snap = await db.collection(name).get();

  let alreadyMigrated = 0;
  let needsMigration = 0;
  let noField = 0;
  const toMigrate = [];
  const toCleanup = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const hasDriverId = data.driverId != null;
    const hasOwnerId = data.ownerId != null;

    if (hasDriverId) {
      alreadyMigrated++;
      if (CLEANUP && hasOwnerId) {
        // driverId already there, but ownerId still around — safe to remove
        toCleanup.push(doc.ref);
      }
    } else if (hasOwnerId) {
      needsMigration++;
      toMigrate.push({ ref: doc.ref, value: data.ownerId });
      if (CLEANUP) toCleanup.push(doc.ref);
    } else {
      noField++;
    }
  }

  console.log(`   Total docs:              ${snap.size}`);
  console.log(`   Already has driverId:    ${alreadyMigrated}`);
  console.log(`   Has ownerId (migrate):   ${needsMigration}`);
  console.log(`   No relevant field:       ${noField}`);

  if (toMigrate.length > 0 && !DRY_RUN) {
    console.log(`   ⚙️  Migrating ${toMigrate.length} docs...`);
    // Process in batches
    for (let i = 0; i < toMigrate.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const slice = toMigrate.slice(i, i + BATCH_SIZE);
      for (const { ref, value } of slice) {
        batch.update(ref, { driverId: value });
      }
      await batch.commit();
    }
    console.log(`   ✅ Migrated ${toMigrate.length} docs`);
  } else if (toMigrate.length > 0) {
    console.log(`   ⏭️  Skipped (dry run)`);
  }

  if (toCleanup.length > 0 && !DRY_RUN) {
    console.log(`   🧹 Cleaning up ownerId field on ${toCleanup.length} docs...`);
    for (let i = 0; i < toCleanup.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const slice = toCleanup.slice(i, i + BATCH_SIZE);
      for (const ref of slice) {
        batch.update(ref, { ownerId: admin.firestore.FieldValue.delete() });
      }
      await batch.commit();
    }
    console.log(`   ✅ Cleaned up ${toCleanup.length} docs`);
  } else if (toCleanup.length > 0) {
    console.log(`   ⏭️  Cleanup skipped (dry run)`);
  }

  console.log('');
}

async function main() {
  try {
    for (const col of COLLECTIONS) {
      await migrateCollection(col);
    }
    console.log('✅ Migration complete.');
    if (DRY_RUN) {
      console.log('💡 Re-run with --write to apply changes.');
    } else if (!CLEANUP) {
      console.log('💡 After verifying migration, re-run with --write --cleanup to remove ownerId field.');
    }
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

main();
