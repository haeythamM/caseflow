export function formatDate(value: string, timezone = "UTC") {
  const normalized =
    value.length === 10 ? `${value}T00:00:00Z` : `${value.replace(" ", "T")}Z`
  const date = new Date(normalized)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-CA", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: timezone,
      }).format(date)
}
