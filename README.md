# 🌲 Evergreeners

**Track your consistency. Grow your legacy.**

Evergreeners is a beautiful, developer-focused habit and contribution tracking application ("Garden"). It allows users to visualize their daily activity, maintain streaks, and cultivate a digital garden of consistent effort.

![Evergreeners Banner](https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=1200&auto=format&fit=crop)

## 🚀 Features

- **GitHub-style Contribution Graph**: visualize your daily activity in a familiar heatmap.
- **Streak Tracking**: Keep your momentum going with streak counts and reminders.
- **Dark Mode First**: A sleek, developer-friendly dark interface (using `lucide-react` icons).
- **Authentication**: Secure email/password login and signup powered by **Better Auth**.
- **Responsive Design**: Built with Tailwind CSS for a seamless experience on mobile and desktop.
- **Backend API**: A robust Fastify server handling data persistence with **Drizzle ORM** and **Supabase**.

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State Management**: React Hooks & Context

### Backend (`/server`)
- **Server**: [Fastify](https://fastify.dev/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (via [Supabase](https://supabase.com/))
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: [Better Auth](https://www.better-auth.com/)

---

## 🏁 Getting Started

Follow these steps to set up the project locally.

### Prerequisites
- Node.js (v18+)
- A Supabase project (for the PostgreSQL database)

### 1. Clone the Repository
```bash
git clone https://github.com/evergreeners/Evergreeners-web.git
cd evergreeners
```

### 2. Frontend Setup
Install dependencies and configure the environment.

```bash
# Install dependencies
npm install

# Create .env.local file (if needed, mostly for future features)
# cp .env.example .env.local 
```

### 3. Backend Setup
Navigate to the server directory and set up the backend.

```bash
cd server
npm install
```

Create a `.env` file in the `server` directory with your Supabase credentials:

```bash
# server/.env
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres"
PORT=3000
BETTER_AUTH_SECRET="your-generated-secret-key"
BETTER_AUTH_URL="http://localhost:3000"
```
> **Note**: If using Supabase Transaction Pooler (port 6543), ensure your `DATABASE_URL` is correct. The Drizzle setup is optimized for this (`prepare: false`).

### 4. Database Migration
Push the schema to your Supabase database.

```bash
# Inside the /server directory
npm run db:migrate
```

### 5. Running the Application

You need to run both the backend and frontend terminals.

**Terminal 1 (Backend):**
```bash
cd server
npm run dev
```
> Server runs on `http://localhost:3000`

**Terminal 2 (Frontend):**
```bash
# Root directory
npm run dev
```
> Frontend runs on `http://localhost:8080` (or 5173)

---

## 🎨 Project Structure

```
evergreeners-main/
├── src/                # Frontend React Code
│   ├── components/     # Reusable UI components (Header, FloatingNav, etc.)
│   ├── pages/          # Page views (Landing, Dashboard, Auth, Settings)
│   ├── lib/            # Utilities (auth-client, cn helper)
│   └── App.tsx         # Main App entry point
├── server/             # Backend Node/Fastify Code
│   ├── src/
│   │   ├── db/         # Drizzle Schema & Connection
│   │   ├── auth.ts     # Better Auth Configuration
│   │   └── index.ts    # Fastify Server Entry
│   └── drizzle/        # Migration files
└── ...config files
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is open-source and available under the MIT License.

---

Made with 💚 by **Evergreeners**.
