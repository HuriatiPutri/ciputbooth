import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { ENV } from './config/env.js';
import { FrameModel } from './infrastructure/database/models/FrameModel.js';
import { TransactionModel } from './infrastructure/database/models/TransactionModel.js';
import { SettingsModel } from './infrastructure/database/models/SettingsModel.js';
import { UserModel } from './infrastructure/database/models/UserModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('Connecting to MongoDB...', ENV.MONGO_URI);
    await mongoose.connect(ENV.MONGO_URI);
    console.log('Connected.');

    const dbFilePath = path.join(__dirname, 'data', 'db.json');
    const rawData = fs.readFileSync(dbFilePath, 'utf8');
    const data = JSON.parse(rawData);

    // Default admin user for reference
    const adminUser = await UserModel.findOne({ role: 'admin' });
    const adminId = adminUser ? adminUser._id : new mongoose.Types.ObjectId();
    const defaultEventId = new mongoose.Types.ObjectId(); // Mock event ID since events are not in db.json

    // Migrate Frames
    if (data.frames && data.frames.length > 0) {
      console.log(`Found ${data.frames.length} frames. Migrating...`);
      for (const frame of data.frames) {
        // Only insert if it doesn't exist by name
        const existing = await FrameModel.findOne({ name: frame.name });
        if (!existing) {
          await FrameModel.create({
            user_id: adminId,
            name: frame.name,
            image_url: frame.image_url,
            is_active: frame.is_active,
            print_size: frame.print_size,
            description: frame.description || '',
            width: frame.width,
            height: frame.height,
            photo_slots: frame.photo_slots
          });
        }
      }
      console.log('Frames migrated.');
    }

    // Migrate Sessions -> Transactions
    if (data.sessions && data.sessions.length > 0) {
      console.log(`Found ${data.sessions.length} sessions. Migrating to Transactions...`);
      for (const session of data.sessions) {
        // Just checking by composite_url to avoid dupes
        const existing = await TransactionModel.findOne({ composite_url: session.composite_url });
        if (!existing) {
          // Resolve frame ID
          const frame = await FrameModel.findOne({ name: session.frame_name });
          
          await TransactionModel.create({
            user_id: adminId,
            event_id: defaultEventId,
            frame_id: frame ? frame._id : new mongoose.Types.ObjectId(),
            composite_url: session.composite_url,
            photos: session.photos || [],
            filter_applied: session.filter_applied || 'normal',
            copies: session.copies || 1,
            amount: 35000, // mock amount
            status: 'success',
            createdAt: session.created_at || new Date()
          });
        }
      }
      console.log('Sessions migrated.');
    }

    // Migrate Settings
    if (data.settings) {
      console.log('Migrating settings...');
      const existing = await SettingsModel.findOne({ type: 'global' });
      if (!existing) {
        await SettingsModel.create({
          type: 'global',
          ...data.settings
        });
      } else {
        await SettingsModel.updateOne({ type: 'global' }, { $set: data.settings });
      }
      console.log('Settings migrated.');
    }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runMigration();
