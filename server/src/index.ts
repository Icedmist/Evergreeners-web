import fastify from 'fastify';
import cors from '@fastify/cors';
import * as dotenv from 'dotenv';
import { auth } from './auth.js';
import { toNodeHandler } from 'better-auth/node';
import oauthPlugin from '@fastify/oauth2';
import { Octokit } from 'octokit';
import { db } from './db/index.js';
import * as schema from './db/schema.js';
import { eq, and } from 'drizzle-orm';

dotenv.config();

const server = fastify({
    logger: true,
    trustProxy: true
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

// Register GitHub OAuth
server.register(oauthPlugin, {
    name: 'github',
    credentials: {
        client: {
            id: process.env.GITHUB_CLIENT_ID || '',
            secret: process.env.GITHUB_CLIENT_SECRET || ''
        },
        auth: oauthPlugin.GITHUB_CONFIGURATION
    },
    startRedirectPath: '/api/auth/github/authorize',
    callbackUri: `${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/api/auth/github/callback`,
    scope: ['read:user', 'user:email']
});

// Auth Routes
server.register(async (instance) => {
    // Prevent Fastify from parsing the body so better-auth can handle the raw stream
    instance.removeContentTypeParser('application/json');
    instance.addContentTypeParser('application/json', (req, payload, done) => {
        done(null);
    });

    instance.all('/api/auth/*', async (req, reply) => {
        const origin = req.headers.origin;
        // Check if allow origin logic needs to be repeated or if cors plugin handles it sufficient for preflights
        // better-auth needs CORS headers on its responses too

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

    // GitHub Callback
    instance.get('/api/auth/github/callback', async (request, reply) => {
        try {
            const { token } = await instance.github.getAccessTokenFromAuthorizationCodeFlow(request);

            const octokit = new Octokit({ auth: token.access_token });
            const { data: githubUser } = await octokit.rest.users.getAuthenticated();

            // Get current session
            // We need to parse cookies manually or rely on better-auth's handling. 
            // Since we are in a fastify route, let's use auth.api.getSession
            // better-auth reads cookies from headers.
            const session = await auth.api.getSession({
                headers: request.headers
            });

            if (!session) {
                // If not logged in, we can't link. 
                // For this use case, we assume they initiated from settings page while logged in.
                // Alternatively we could create a new user (login via github), but req says "linked to current user"
                reply.redirect('http://localhost:5173/login?error=not_authenticated'); // Fallback to login
                return;
            }

            // Upsert account
            // Check if account exists
            const existingAccount = await db.query.accounts.findFirst({
                where: and(
                    eq(schema.accounts.providerId, 'github'),
                    eq(schema.accounts.accountId, githubUser.id.toString())
                )
            });

            if (existingAccount) {
                if (existingAccount.userId !== session.user.id) {
                    // Account already linked to another user
                    // Handle error or steal logic? Let's just error for safety
                    reply.redirect('http://localhost:5173/settings?error=github_account_already_linked');
                    return;
                }
                // Update token
                await db.update(schema.accounts)
                    .set({ accessToken: token.access_token, updatedAt: new Date() })
                    .where(eq(schema.accounts.id, existingAccount.id));
            } else {
                // Create link
                await db.insert(schema.accounts).values({
                    id: crypto.randomUUID(),
                    userId: session.user.id,
                    accountId: githubUser.id.toString(),
                    providerId: 'github',
                    accessToken: token.access_token,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }

            // Restore state
            const state = (request.query as any).state;
            let targetPath = '/';
            // let scrollPosition = 0; // If we want to pass it back via cookie or query param

            if (state) {
                try {
                    const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
                    if (decoded.path) targetPath = decoded.path;
                    // Provide scroll position via query param so frontend can handle it
                    // Or just redirect and let frontend handle it if we passed it in state
                    // The requirement says "redirect exactly back... and scroll position"
                    // If we redirect to /settings, the frontend needs to know to scroll. 
                    // We can append ?scroll=...
                    if (decoded.scroll) {
                        targetPath += `${targetPath.includes('?') ? '&' : '?'}scroll=${decoded.scroll}`;
                    }
                } catch (e) {
                    // ignore invalid state
                }
            }

            reply.redirect(`https://evergreeners.vercel.app${targetPath}`);

        } catch (err) {
            console.error(err);
            reply.redirect('http://localhost:5173/settings?error=github_callback_failed');
        }
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
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
