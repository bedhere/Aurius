import { createApp } from './app';
import { config } from './config';
import { prisma } from './lib/prisma';
import { runAnnualPurchaseReminders } from './services/reminderService';

let reminderJobRunning = false;

async function runReminderJob(): Promise<void> {
  if (reminderJobRunning) return;
  reminderJobRunning = true;
  try {
    const result = await runAnnualPurchaseReminders();
    console.log(`[AURIUS] annual reminders scanned=${result.scanned} sent=${result.sent}`);
  } catch (err) {
    console.error('[AURIUS] annual reminder job failed', err);
  } finally {
    reminderJobRunning = false;
  }
}

async function main(): Promise<void> {
  const app = createApp();
  await prisma.$connect();
  console.log(`[AURIUS] database connected`);
  void runReminderJob();
  setInterval(() => {
    void runReminderJob();
  }, 12 * 60 * 60 * 1000);
  app.listen(config.port, () => {
    console.log(`[AURIUS] API listening on http://localhost:${config.port} (${config.env})`);
  });
}

main().catch((err) => {
  console.error('Fatal startup error', err);
  process.exit(1);
});
