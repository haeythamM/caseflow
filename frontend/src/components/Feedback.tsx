export default function Feedback({ error }: { error: string }) {
  return error ? (
    <div
      role="alert"
      className="my-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {error}
    </div>
  ) : null
}
