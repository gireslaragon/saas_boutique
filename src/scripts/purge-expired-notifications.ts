import { purgeExpiredNotifications } from "@/repositories/notification.repository";

async function run() {
  try {
    console.log("Purging expired notifications...");
    const res = await purgeExpiredNotifications();
    console.log("Purge completed:", res);
    process.exit(0);
  } catch (err) {
    console.error("Purge failed:", err);
    process.exit(1);
  }
}

// Allow running as a script: `node ./dist/src/scripts/purge-expired-notifications.js` after build
if (require.main === module) {
  run();
}
