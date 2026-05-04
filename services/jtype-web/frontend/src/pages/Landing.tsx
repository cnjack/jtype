import { Link } from 'react-router-dom'

export function Landing() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-zinc-900">
      <div className="max-w-2xl text-center">
        <h1 className="mb-4 text-5xl font-bold tracking-tight text-zinc-900 dark:text-white">
          <span className="text-brand">JType</span> Cloud
        </h1>
        <p className="mb-8 text-lg text-zinc-600 dark:text-zinc-400">
          Your local-first Markdown workspace with cloud sync, publishing, and AI-ready indexing.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/login"
            className="rounded-lg bg-brand px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-brand-dark"
          >
            Get started
          </Link>
          <a
            href="https://github.com/nicepkg/jtype"
            className="rounded-lg border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            GitHub
          </a>
        </div>
      </div>
    </div>
  )
}
