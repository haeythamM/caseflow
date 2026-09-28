const features = [
  "Customer management",
  "Case creation and tracking",
  "Priority and status management",
  "Agent assignment",
  "Communications and internal notes",
  "Case activity history",
  "Attachments",
  "Reporting and dashboard metrics",
  "Role-based access control",
]

const technologies = ["React", "TypeScript", "Vite", "React Router", "Tailwind CSS", "Recharts", "PHP", "PDO", "MySQL"]

export default function About() {
  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <section aria-label="Overview" className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <p className="font-display font-semibold text-lg text-slate-800">One workspace for customer service</p>
          <span className="text-xs font-medium text-blue-700 bg-blue-50 rounded-full px-3 py-1">CaseFlow 1.0 Demo</span>
        </div>
        <p className="text-sm leading-relaxed text-slate-600">
          CaseFlow is a customer service and case management system designed to centralize customer records, support cases, communications, activities, assignments, priorities, and reporting in one workspace.
        </p>
      </section>

      <section aria-labelledby="about-using" className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 id="about-using" className="font-display font-semibold text-slate-800 mb-3">Using CaseFlow</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          Use the navigation menu to access the Dashboard, Customers, Cases, Communications, and Reports. Available actions depend on the user's assigned role and permissions. Support Agents can manage day-to-day case workflows, while Demo Viewer accounts provide read-only access for demonstration and evaluation.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section aria-labelledby="about-features" className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <h2 id="about-features" className="font-display font-semibold text-slate-800 mb-4">Core Features</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-600">
                <svg aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="about-technology" className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 id="about-technology" className="font-display font-semibold text-slate-800 mb-4">Technology</h2>
          <ul className="flex flex-wrap gap-2">
            {technologies.map((technology) => (
              <li key={technology} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">{technology}</li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="about-demo" className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 id="about-demo" className="font-display font-semibold text-slate-800 mb-3">Demo Environment</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          Public demonstrations should use a dedicated environment containing only fictional customer, case, and communication records. The source repository includes synthetic test fixtures for verification. Users should not upload personal, confidential, sensitive, or copyrighted material to the demo environment.
        </p>
      </section>

      <footer className="text-sm text-slate-500 space-y-1 pb-2">
        <h2 className="font-semibold text-slate-700">Copyright</h2>
        <p>CaseFlow was designed and developed by Haeytham Almalak.</p>
        <p>© 2026 Haeytham Almalak. All rights reserved.</p>
      </footer>
    </div>
  )
}
