import cron from 'node-cron';
import { db } from './db/index.js';
import { users, accounts } from './db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getGithubContributions } from './lib/github.js';
import { updateUserGoals } from './lib/goals.js';
import { sendDailyDigestEmail } from './lib/email.js';

export function setupCronJobs() {
    console.log("Setting up cron jobs...");

    // ── Hourly GitHub sync ─────────────────────────────────────────────────────
    // Refreshes streak, commits, and stats for all GitHub-connected users
    cron.schedule('0 * * * *', async () => {
        console.log("Running hourly GitHub sync for all users...");
        try {
            const usersWithAccounts = await db.select({ user: users, account: accounts })
                .from(users)
                .innerJoin(accounts, eq(users.id, accounts.userId))
                .where(eq(users.isGithubConnected, true));

            console.log(`Found ${usersWithAccounts.length} users to sync.`);

            for (const { user, account } of usersWithAccounts) {
                if (!account.accessToken) continue;
                try {
                    const {
                        totalCommits, currentStreak, todayCommits, yesterdayCommits,
                        weeklyCommits, activeDays, totalProjects, contributionCalendar
                    } = await getGithubContributions(user.username || "", account.accessToken);

                    await db.update(users)
                        .set({
                            streak: currentStreak,
                            totalCommits,
                            todayCommits,
                            yesterdayCommits,
                            weeklyCommits,
                            activeDays,
                            totalProjects,
                            contributionData: contributionCalendar,
                            updatedAt: new Date()
                        })
                        .where(eq(users.id, user.id));

                    await updateUserGoals(user.id, {
                        currentStreak, weeklyCommits, activeDays, totalProjects, contributionCalendar
                    });
                } catch (err) {
                    console.error(`Failed to sync user ${user.username}:`, err);
                }
            }
            console.log("Hourly sync complete.");
        } catch (error) {
            console.error("Hourly cron job error:", error);
        }
    });

    // ── Daily digest at 7 PM ──────────────────────────────────────────────────
    // Sends to every GitHub-connected user with emailNotifications enabled.
    // Two modes — the email function handles which variant to render:
    //   - todayCommits > 0  → celebration / summary card
    //   - todayCommits === 0 → streak-at-risk warning
    cron.schedule('0 19 * * *', async () => {
        console.log("Running daily digest emails...");
        try {
            const usersToNotify = await db.select({ user: users, account: accounts })
                .from(users)
                .innerJoin(accounts, and(
                    eq(users.id, accounts.userId),
                    eq(accounts.providerId, 'github')
                ))
                .where(and(
                    eq(users.isGithubConnected, true),
                    eq(users.emailNotifications, true)
                ));

            console.log(`Sending daily digest to ${usersToNotify.length} users.`);

            let sent = 0;
            let failed = 0;

            // Process in small batches or with a slight delay to avoid rate limits
            for (const { user } of usersToNotify) {
                if (!user.email) {
                    console.log(`Skipping user ${user.username || user.id}: No email address.`);
                    failed++;
                    continue;
                }

                try {
                    console.log(`Attempting to send email to ${user.email}...`);
                    await sendDailyDigestEmail({
                        to: user.email,
                        name: user.name || user.username || 'Dev',
                        username: user.username || '',
                        streak: user.streak || 0,
                        todayCommits: user.todayCommits || 0,
                        totalCommits: user.totalCommits || 0,
                        weeklyCommits: user.weeklyCommits || 0,
                    });
                    console.log(`Successfully sent email to ${user.email}`);
                    sent++;
                    
                    // Increase delay to 600ms to respect Resend's 2 requests/sec limit
                    await new Promise(resolve => setTimeout(resolve, 600));
                } catch (err) {
                    console.error(`Failed to send digest to ${user.email}:`, err);
                    failed++;
                }
            }

            console.log(`Daily digest done. Sent: ${sent}, Failed: ${failed}`);
        } catch (error) {
            console.error("Daily digest cron error:", error);
        }
    });
}
