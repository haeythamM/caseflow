import { Link } from "react-router-dom"

export default function NotFound() {
  return (
    <div className="p-6 flex items-center justify-center min-h-[60vh] bg-slate-50">
      <div className="bg-white rounded-xl border border-slate-200 p-10 max-w-lg w-full text-center">
        <p className="text-sm font-semibold text-blue-600 tracking-widest">
          404
        </p>
        <h2 className="font-display font-semibold text-2xl text-slate-900 mt-3">
          Page not found
        </h2>
        <p className="text-sm text-slate-500 mt-3">
          The page you’re looking for doesn’t exist or may have moved.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex mt-6 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
