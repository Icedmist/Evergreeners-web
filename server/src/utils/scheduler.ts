import cron from 'node-cron';
import { syncAllGithubUsers } from './github-sync.js';

export function initializeSchedulers(): void {
    console.log('🕐 Initializing scheduled tasks...');

    // Sync GitHub data every 6 hours (0, 6, 12, 18)
    cron.schedule('0 */6 * * *', async () => {
        console.log('⏰ Scheduled GitHub sync triggered');
        await syncAllGithubUsers();
    });

    // Optional: Daily cleanup at 2 AM
    cron.schedule('0 2 * * *', async () => {
        console.log('⏰ Daily cleanup task triggered');
        // Add cleanup logic here if needed
    });

    console.log('✓ Scheduled tasks initialized');
    console.log('  - GitHub sync: Every 6 hours');
    console.log('  - Cleanup: Daily at 2 AM');
}

export { syncAllGithubUsers, syncUserGithubData, isSyncNeeded } from './github-sync.js';
