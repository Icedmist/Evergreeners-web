import './env.js'; // Trigger restart
import fastify from 'fastify';
import cors from '@fastify/cors';
// dotenv is loaded first via ./env.js
import { auth } from './auth.js';
import { toNodeHandler } from 'better-auth/node';

import { db } from './db/index.js';
import * as schema from './db/schema.js';
import { eq, and } from 'drizzle-orm';
import { initializeSchedulers, syncUserGithubData, isSyncNeeded } from './utils/scheduler.js';
import { getGithubContributions } from './utils/github-sync.js';

const server = fastify({
    logger: true,
    trustProxy: true,
    bodyLimit: 5 * 1024 * 1024 // 5MB limit for Base64 image uploads
});

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:8080",
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : [])
];

server.register(cors, {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
});

// GitHub OAuth is handled by better-auth in separate adapter

// Auth Routes Scope (No Body Parsing for better-auth)
server.register(async (instance) => {
    // Prevent Fastify from parsing the body so better-auth can handle the raw stream
    instance.removeContentTypeParser('application/json');
    instance.addContentTypeParser('application/json', (req, payload, done) => {
        done(null);
    });

    instance.all('/api/auth/*', async (req, reply) => {
        const origin = req.headers.origin;
        const allowedOrigins = [
            "http://localhost:5173",
            "http://localhost:8080",
            ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : [])
        ];

        if (origin && allowedOrigins.includes(origin)) {
            reply.raw.setHeader("Access-Control-Allow-Origin", origin);
            reply.raw.setHeader("Access-Control-Allow-Credentials", "true");
        }

        reply.raw.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        reply.raw.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie");

        return toNodeHandler(auth)(req.raw, reply.raw);
    });
});

// API Routes Scope (Standard JSON Parsing)
server.register(async (instance) => {
    // Custom route to force-sync GitHub data
    instance.post('/api/user/sync-github', async (req, reply) => {
        const headers = new Headers();
        Object.entries(req.headers).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                value.forEach(v => headers.append(key, v));
            } else if (typeof value === 'string') {
                headers.set(key, value);
            }
        });

        const session = await auth.api.getSession({
            headers
        });

        if (!session) {
            return reply.status(401).send({ message: "Unauthorized" });
        }

        const userId = session.session.userId;

        // 1. Get GitHub Account
        const account = await db.select().from(schema.accounts)
            .where(and(
                eq(schema.accounts.userId, userId),
                eq(schema.accounts.providerId, 'github')
            ))
            .limit(1);

        if (!account.length || !account[0].accessToken) {
            return reply.status(400).send({ message: "No connected GitHub account found." });
        }

        try {
            // 2. Fetch GitHub Profile
            const ghRes = await fetch("https://api.github.com/user", {
                headers: {
                    Authorization: `Bearer ${account[0].accessToken}`,
                    "User-Agent": "Evergreeners-App"
                }
            });

            if (!ghRes.ok) throw new Error("Failed to fetch from GitHub");
            const ghUser = await ghRes.json();

            // 3. Fetch Contributions (Streak & Total Commits)
            const { totalCommits, currentStreak, todayCommits, contributionCalendar } = await getGithubContributions(ghUser.login, account[0].accessToken);

            // 4. Update User Profile with GitHub-specific fields
            await db.update(schema.users)
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

            return { 
                success: true, 
                username: ghUser.login, 
                streak: currentStreak, 
                totalCommits, 
                todayCommits, 
                contributionData: contributionCalendar,
                syncedAt: new Date()
            };
        } catch (error) {
            console.error(error);
            return reply.status(500).send({ message: "Failed to sync with GitHub" });
        }
    });

    // Sync with cache check (respects rate limits)
    instance.post('/api/user/sync-github-cached', async (req, reply) => {
        const headers = new Headers();
        Object.entries(req.headers).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                value.forEach(v => headers.append(key, v));
            } else if (typeof value === 'string') {
                headers.set(key, value);
            }
        });

        const session = await auth.api.getSession({
            headers
        });

        if (!session) {
            return reply.status(401).send({ message: "Unauthorized" });
        }

        const userId = session.session.userId;

        try {
            const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
            if (!user.length) {
                return reply.status(404).send({ message: "User not found" });
            }

            // Check if sync is needed (cache for 1 hour)
            if (!isSyncNeeded(user[0].githubSyncedAt, 60)) {
                return {
                    success: true,
                    cached: true,
                    message: "Using cached data",
                    data: {
                        username: user[0].githubUsername,
                        streak: user[0].githubStreak,
                        totalCommits: user[0].githubTotalCommits,
                        todayCommits: user[0].githubTodayCommits,
                        syncedAt: user[0].githubSyncedAt
                    }
                };
            }

            // Perform sync
            await syncUserGithubData(userId);

            const updatedUser = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);

            return {
                success: true,
                cached: false,
                message: "Synced fresh data",
                data: {
                    username: updatedUser[0]?.githubUsername,
                    streak: updatedUser[0]?.githubStreak,
                    totalCommits: updatedUser[0]?.githubTotalCommits,
                    todayCommits: updatedUser[0]?.githubTodayCommits,
                    syncedAt: updatedUser[0]?.githubSyncedAt
                }
            };
        } catch (error) {
            console.error(error);
            return reply.status(500).send({ message: "Failed to sync with GitHub" });
        }
    });

    // Update User Profile Route
    instance.put('/api/user/profile', async (req, reply: any) => {
        const headers = new Headers();
        Object.entries(req.headers).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                value.forEach(v => headers.append(key, v));
            } else if (typeof value === 'string') {
                headers.set(key, value);
            }
        });

        const session = await auth.api.getSession({
            headers
        });

        if (!session) {
            return reply.status(401).send({ message: "Unauthorized" });
        }

        const userId = session.session.userId;
        const body = req.body as any;

        try {
            const updateData: any = {
                updatedAt: new Date()
            };

            if (body.name !== undefined) updateData.name = body.name;
            if (body.username !== undefined) updateData.username = body.username;
            if (body.bio !== undefined) updateData.bio = body.bio;
            if (body.location !== undefined) updateData.location = body.location;
            if (body.website !== undefined) updateData.website = body.website;
            if (body.image !== undefined) updateData.image = body.image;
            if (body.isPublic !== undefined) updateData.isPublic = body.isPublic;

            if (body.anonymousName !== undefined) updateData.anonymousName = body.anonymousName;

            if (body.isPublic === false) {
                const currentUser = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
                if (currentUser.length && !currentUser[0].anonymousName && !body.anonymousName) {
                    const adjectives = ["Hidden", "Secret", "Silent", "Quiet", "Mysterious"];
                    const nouns = ["Tree", "Leaf", "Sprout", "Root", "Seed"];
                    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
                    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
                    const randomNumber = Math.floor(Math.random() * 1000);
                    updateData.anonymousName = `${randomAdj}${randomNoun}${randomNumber}`;
                }
            }

            await db.update(schema.users)
                .set(updateData)
                .where(eq(schema.users.id, userId));

            return {
                success: true,
                message: "Profile updated successfully",
                anonymousName: updateData.anonymousName
            };
        } catch (error) {
            console.error("Profile update error:", error);
            return reply.status(500).send({ message: "Failed to update profile", error: String(error) });
        }
    });

    // GET User Profile Route
    instance.get('/api/user/profile', async (req, reply) => {
        const headers = new Headers();
        Object.entries(req.headers).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                value.forEach(v => headers.append(key, v));
            } else if (typeof value === 'string') {
                headers.set(key, value);
            }
        });

        const session = await auth.api.getSession({
            headers
        });

        if (!session) {
            return reply.status(401).send({ message: "Unauthorized" });
        }

        const userId = session.session.userId;
        const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);

        if (!user.length) return reply.status(404).send({ message: "User not found" });

        return { user: user[0] };
    });
});

server.get('/', async (request, reply) => {
    return { hello: 'world' };
});

const start = async () => {
    try {
        const port = Number(process.env.PORT) || 3000;
        await server.listen({ port, host: '0.0.0.0' });
        console.log(`Server listening on port ${port}`);
        
        // Initialize scheduled tasks
        initializeSchedulers();
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
