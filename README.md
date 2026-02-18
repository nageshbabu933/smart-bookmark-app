# Smart Bookmark App

A bookmark manager with **Google sign-in**, **private per-user bookmarks**, and **real-time sync** across tabs. Built with Next.js (App Router), Supabase, and Tailwind CSS.

---

## Prerequisites

- **Node.js** 18+ and **npm**
- A **Supabase** account ([supabase.com](https://supabase.com))
- A **Google Cloud** project (for OAuth) — [console.cloud.google.com](https://console.cloud.google.com)

---

## How to run the project (local)

### Step 1: Open the project and install dependencies

```bash
cd smart-bookmark-app
npm install
```

### Step 2: Create a Supabase project and get keys

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) and sign in.
2. Click **New project** → choose organization, name the project, set a database password, pick a region → **Create project**.
3. When the project is ready, go to **Settings** (gear) → **API**.
4. Copy:
   - **Project URL** (e.g. `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

### Step 3: Add environment variables

1. In the project root (`smart-bookmark-app`), copy the example env file:

   ```bash
   copy .env.example .env.local
   ```

   On macOS/Linux:

   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` and set:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

   Replace with your **Project URL** and **anon public** key from Step 2.
 ---- .env has all my credentials to access the project 
 
### Step 4: Create the database table and policies

1. In Supabase, go to **SQL Editor**.
2. Click **New query** and paste the SQL below, then run it (**Run**):

```sql
-- Table for bookmarks (one per user)
create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  title text,
  created_at timestamptz not null default now()
);

-- Only the owner can see and manage their bookmarks
alter table public.bookmarks enable row level security;

create policy "Users can read own bookmarks"
  on public.bookmarks for select
  using (auth.uid() = user_id);

create policy "Users can insert own bookmarks"
  on public.bookmarks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own bookmarks"
  on public.bookmarks for update
  using (auth.uid() = user_id);

create policy "Users can delete own bookmarks"
  on public.bookmarks for delete
  using (auth.uid() = user_id);

-- Enable real-time so other tabs get updates
alter publication supabase_realtime add table public.bookmarks;
```

If you see an error that `bookmarks` is already in the publication, you can ignore it. You can also enable Realtime in **Database** → **Replication** → turn on **bookmarks**.

### Step 5: Enable Google sign-in

**In Google Cloud Console:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.
2. Open **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**.
3. If asked, configure the **OAuth consent screen** (External, add your email, app name, save).
4. Application type: **Web application**.
5. Under **Authorized redirect URIs**, click **Add URI** and add:
   - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`  
   (replace `YOUR_PROJECT_REF` with your Supabase project ref from the Project URL).
6. Click **Create** and copy the **Client ID** and **Client secret**.

**In Supabase:**

1. Go to **Authentication** → **Providers**.
2. Click **Google** and turn it **On**.
3. Paste **Client ID** and **Client secret**, then **Save**.

**Redirect for local dev (optional):**

- In **Authentication** → **URL Configuration**, set **Site URL** to `http://localhost:3000`.
- Add `http://localhost:3000/**` to **Redirect URLs**.

### Step 6: Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You should see the app; click **Sign in with Google**, then add and delete bookmarks. Open a second tab to see the list update in real time.

---

## Scripts

| Command        | Description                    |
|----------------|--------------------------------| 
| `npm run dev`  | Start development server       |
| `npm run build`| Build for production          |
| `npm run start`| Run production build locally  |
| `npm run lint` | Run ESLint                    |

---

## Deploy on Vercel

1. Push this project to a **public GitHub** repo.
2. Go to [vercel.com](https://vercel.com) → **Add New** → **Project** → import the repo.
3. **Root Directory**: If your repo root is the folder that **contains** `smart-bookmark-app` (e.g. you have `SmartBookMarkApp/smart-bookmark-app/`), set **Root Directory** to `smart-bookmark-app`. If your repo root **is** the app (e.g. `package.json` is at the repo root), leave Root Directory blank.
4. **Environment Variables** (required for the app; build can run without them):
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
5. Deploy. After deploy, in Supabase **Authentication** → **URL Configuration**, set **Site URL** to your Vercel URL and add `https://your-app.vercel.app/**` to **Redirect URLs** so Google sign-in works.

### If the Vercel build fails

- **Wrong root**: Build runs in the folder that has `package.json` and `next.config.ts`. If you see "Cannot find module" or "No package.json", set **Root Directory** in Vercel to the folder that contains the Next.js app (e.g. `smart-bookmark-app`).
- **ESLint/TypeScript**: The project is set to **ignore ESLint during builds** so lint issues don’t fail the deploy. Fix lint with `npm run lint` locally. If the failure is TypeScript, fix the reported errors and push again.
- **Env vars**: Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel → Project → Settings → Environment Variables, then redeploy.

---

## Tech stack

- **Next.js** 16 (App Router), **React** 19, **Tailwind CSS**
- **Supabase**: Auth (Google OAuth), PostgreSQL, Realtime
