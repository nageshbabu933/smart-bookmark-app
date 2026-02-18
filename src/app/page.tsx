/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

type Bookmark = {
  id: string;
  url: string;
  title: string | null;
  created_at: string;
};

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");

  const isSupabaseReady = useMemo(() => !!supabase, []);

  useEffect(() => {
    if (!isSupabaseReady) {
      queueMicrotask(() => setAuthLoading(false));
      return;
    }

    const init = async () => {
      setAuthLoading(true);

      const {
        data: { session: initialSession },
      } = await supabase!.auth.getSession();

      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      const {
        data: { subscription },
      } = supabase!.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
      });

      setAuthLoading(false);

      return () => {
        subscription.unsubscribe();
      };
    };

    void init();
  }, [isSupabaseReady]);

  useEffect(() => {
    if (!isSupabaseReady || !user) {
      queueMicrotask(() => setBookmarks([]));
      return;
    }

    const loadBookmarks = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase!
        .from("bookmarks")
        .select("id, url, title, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setBookmarks(data ?? []);
      }

      setLoading(false);
    };

    void loadBookmarks();

    const channel = supabase!
      .channel(`bookmarks-user-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void loadBookmarks();
        }
      )
      .subscribe();

    return () => {
      void supabase!.removeChannel(channel);
    };
  }, [isSupabaseReady, user]);

  const handleSignIn = async () => {
    if (!isSupabaseReady) return;

    setError(null);
    setAuthLoading(true);
    const redirectTo =
      typeof window !== "undefined" ? window.location.origin : undefined;

    const { error: signInError } = await supabase!.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (signInError) {
      setError(signInError.message);
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!isSupabaseReady) return;

    setError(null);
    setAuthLoading(true);
    const { error: signOutError } = await supabase!.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
    }
    setAuthLoading(false);
  };

  const handleAddBookmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseReady || !user || !url.trim()) return;

    setLoading(true);
    setError(null);

    const { error: insertError } = await supabase!.from("bookmarks").insert({
      url: url.trim(),
      title: title.trim() || null,
      user_id: user.id,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setUrl("");
      setTitle("");
    }

    setLoading(false);
  };

  const handleDeleteBookmark = async (id: string) => {
    if (!isSupabaseReady || !user) return;

    setLoading(true);
    setError(null);

    const { error: deleteError } = await supabase!
      .from("bookmarks")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      setError(deleteError.message);
    }

    setLoading(false);
  };

  if (!isSupabaseReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="max-w-md rounded-2xl bg-slate-900 px-6 py-8 text-center text-slate-50 shadow-lg shadow-slate-900/40">
          <h1 className="mb-4 text-xl font-semibold">
            Supabase is not configured
          </h1>
          <p className="text-sm text-slate-300">
            Add <code className="rounded bg-slate-800 px-1 py-0.5 text-xs">
              NEXT_PUBLIC_SUPABASE_URL
            </code>{" "}
            and{" "}
            <code className="rounded bg-slate-800 px-1 py-0.5 text-xs">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>{" "}
            to your <code>.env.local</code> file, then restart the dev server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 font-sans text-slate-50">
      <main className="flex w-full max-w-3xl flex-col gap-6 rounded-3xl bg-slate-900/80 p-6 shadow-xl shadow-black/40 ring-1 ring-slate-800/80 backdrop-blur">
        <header className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Smart Bookmark App
            </h1>
            <p className="text-sm text-slate-300">
              Save links that stay in sync across tabs in real-time.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {session && user ? (
              <>
                <div className="flex items-center gap-2 rounded-full bg-slate-800/80 px-3 py-1.5 text-xs text-slate-200">
                  {user.user_metadata?.avatar_url && (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt={user.email ?? "Avatar"}
                      className="h-6 w-6 rounded-full border border-slate-700 object-cover"
                    />
                  )}
                  <span className="max-w-[120px] truncate">
                    {user.user_metadata?.full_name ?? user.email}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={authLoading}
                  className="inline-flex items-center justify-center rounded-full bg-slate-100 px-4 py-1.5 text-xs font-medium text-slate-900 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={authLoading}
                className="inline-flex items-center justify-center rounded-full bg-slate-100 px-4 py-1.5 text-xs font-medium text-slate-900 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {authLoading ? "Loading..." : "Sign in with Google"}
              </button>
            )}
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/70 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        {!session || !user ? (
          <section className="mt-4 rounded-2xl border border-dashed border-slate-700/80 bg-slate-900/70 px-6 py-10 text-center">
            <h2 className="mb-2 text-lg font-medium">
              Sign in to manage your bookmarks
            </h2>
            <p className="mb-6 text-sm text-slate-300">
              Each Google account gets a private, realtime list of bookmarks.
            </p>
            <button
              onClick={handleSignIn}
              disabled={authLoading}
              className="inline-flex items-center justify-center rounded-full bg-slate-100 px-5 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {authLoading ? "Loading..." : "Continue with Google"}
            </button>
          </section>
        ) : (
          <>
            <section className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 sm:p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
                Add bookmark
              </h2>
              <form
                onSubmit={handleAddBookmark}
                className="flex flex-col gap-3 sm:flex-row"
              >
                <div className="flex-1 space-y-2">
                  <input
                    type="url"
                    required
                    placeholder="https://example.com/article"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 outline-none ring-0 transition focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Optional title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 outline-none ring-0 transition focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="mt-1 inline-flex h-[84px] items-center justify-center rounded-2xl bg-emerald-400 px-6 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-0 sm:h-auto sm:self-end sm:px-5 sm:py-2.5"
                >
                  {loading ? "Saving…" : "Save"}
                </button>
              </form>
            </section>

            <section className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                  Your bookmarks
                </h2>
                <span className="text-xs text-slate-400">
                  Live across all open tabs
                </span>
              </div>

              {loading && bookmarks.length === 0 ? (
                <p className="text-sm text-slate-300">Loading bookmarks…</p>
              ) : bookmarks.length === 0 ? (
                <p className="text-sm text-slate-300">
                  You don&apos;t have any bookmarks yet. Add your first one
                  above.
                </p>
              ) : (
                <ul className="divide-y divide-slate-800/80">
                  {bookmarks.map((bookmark) => (
                    <li
                      key={bookmark.id}
                      className="flex items-start justify-between gap-3 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <a
                          href={bookmark.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block max-w-full truncate text-sm font-medium text-emerald-300 hover:text-emerald-200"
                        >
                          {bookmark.title || bookmark.url}
                        </a>
                        <p className="mt-1 max-w-full truncate text-xs text-slate-400">
                          {bookmark.title ? bookmark.url : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteBookmark(bookmark.id)}
                        disabled={loading}
                        className="ml-2 inline-flex items-center justify-center rounded-full border border-slate-700/80 px-3 py-1 text-xs text-slate-300 transition hover:border-red-500 hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        <footer className="mt-2 text-xs text-slate-500">
          Bookmarks are stored securely in Supabase and are only visible to
          your logged-in account.
        </footer>
      </main>
    </div>
  );
}

