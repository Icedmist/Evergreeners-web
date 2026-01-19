import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

export interface GitHubContributionData {
    totalCommits: number;
    currentStreak: number;
    todayCommits: number;
    contributionCalendar: any[];
}

/**
 * Fetch GitHub contribution data via GraphQL
 */
export async function getGithubContributions(
    username: string,
    token: string
): Promise<GitHubContributionData> {
    const query = `
        query($username: String!) {
            user(login: $username) {
                contributionsCollection {
                    contributionCalendar {
                        totalContributions
                        weeks {
                            contributionDays {
                                contributionCount
                                date
                            }
                        }
                    }
                }
            }
        }
    `;

    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Evergreeners-App'
        },
        body: JSON.stringify({ query, variables: { username } })
    });

    if (!response.ok) {
        throw new Error('GitHub GraphQL API failed');
    }

    const data: any = await response.json();
    if (data.errors) {
        throw new Error(data.errors[0].message);
    }

    const calendar = data.data.user.contributionsCollection.contributionCalendar;
    const totalCommits = calendar.totalContributions;

    const allDays = calendar.weeks
        .flatMap((w: any) => w.contributionDays)
        .reverse();

    let currentStreak = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Check if user has contributed today or yesterday to start the streak count
    let startIndex = allDays.findIndex((d: any) => d.contributionCount > 0);

    // Calculate Today's Commits
    const todayData = allDays.find((d: any) => d.date === todayStr);
    const todayCommits = todayData ? todayData.contributionCount : 0;

    if (startIndex !== -1) {
        const lastContribDate = allDays[startIndex].date;
        // If the last contribution was more than 1 day ago, the current streak is 0
        if (lastContribDate < yesterdayStr && lastContribDate !== todayStr) {
            currentStreak = 0;
        } else {
            // Count backwards
            for (let i = startIndex; i < allDays.length; i++) {
                if (allDays[i].contributionCount > 0) {
                    currentStreak++;
                } else {
                    break;
                }
            }
        }
    }

    return {
        totalCommits,
        currentStreak,
        todayCommits,
        contributionCalendar: allDays
    };
}

/**
 * Sync GitHub data for a single user
 */
export async function syncUserGithubData(userId: string): Promise<void> {
    try {
        // Get user's GitHub account
        const account = await db
            .select()
            .from(schema.accounts)
            .where(
                and(
                    eq(schema.accounts.userId, userId),
                    eq(schema.accounts.providerId, 'github')
                )
            )
            .limit(1);

        if (!account.length || !account[0].accessToken) {
            console.log(`User ${userId}: No GitHub account connected`);
            return;
        }

        // Fetch GitHub profile
        const ghRes = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${account[0].accessToken}`,
                'User-Agent': 'Evergreeners-App'
            }
        });

        if (!ghRes.ok) {
            throw new Error('Failed to fetch GitHub profile');
        }

        const ghUser = await ghRes.json();

        // Fetch contributions
        const {
            totalCommits,
            currentStreak,
            todayCommits,
            contributionCalendar
        } = await getGithubContributions(ghUser.login, account[0].accessToken);

        // Update user profile with GitHub data
        await db
            .update(schema.users)
            .set({
                githubUsername: ghUser.login,
                githubStreak: currentStreak,
                githubTotalCommits: totalCommits,
                githubTodayCommits: todayCommits,
                githubContributionData: contributionCalendar,
                githubSyncedAt: new Date(),
                isGithubConnected: true,
                updatedAt: new Date()
            })
            .where(eq(schema.users.id, userId));

        console.log(
            `✓ Synced GitHub data for user ${userId} (${ghUser.login}): ${totalCommits} commits, ${currentStreak} day streak`
        );
    } catch (error) {
        console.error(`✗ Failed to sync GitHub data for user ${userId}:`, error);
    }
}

/**
 * Batch sync GitHub data for all connected users
 */
export async function syncAllGithubUsers(): Promise<void> {
    try {
        console.log('🔄 Starting GitHub sync for all users...');

        const connectedUsers = await db
            .select()
            .from(schema.users)
            .where(
                and(
                    eq(schema.users.isGithubConnected, true),
                    eq(schema.users.githubSyncEnabled, true)
                )
            );

        console.log(`Found ${connectedUsers.length} users to sync`);

        for (const user of connectedUsers) {
            await syncUserGithubData(user.id);
            // Add delay to respect GitHub API rate limits
            await new Promise((resolve) => setTimeout(resolve, 500));
        }

        console.log('✓ GitHub sync completed');
    } catch (error) {
        console.error('✗ GitHub sync failed:', error);
    }
}

/**
 * Check if sync is needed (cache management)
 */
export function isSyncNeeded(lastSyncedAt: Date | null, cacheDurationMinutes = 60): boolean {
    if (!lastSyncedAt) return true;
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSyncedAt.getTime()) / (1000 * 60);
    return diffMinutes > cacheDurationMinutes;
}
