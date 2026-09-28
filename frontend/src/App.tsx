import { canAccessPage } from "./permissions"
import WorkspaceProvider, {
  useWorkspace,
  type Workspace,
} from "./data/Workspace"
import { request, ApiError, errorMessage } from "./lib/api"
import Feedback from "./components/Feedback"
import { lazy, Suspense, useEffect, useState } from "react"
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom"
import {
  casePath,
  customerPath,
  navigationPath,
  protectedRoutes,
  routeTitle,
  safeReturnPath,
} from "./routing"
import Login from "./pages/Login"
import Customers from "./pages/Customers"
import CustomerForm from "./pages/CustomerForm"
import CustomerProfile from "./pages/CustomerProfile"
import Cases from "./pages/Cases"
import CreateCase from "./pages/CreateCase"
import CaseDetails from "./pages/CaseDetails"
import Communications from "./pages/Communications"
import Settings from "./pages/Settings"
import Users from "./pages/Users"
import NotFound from "./pages/NotFound"
import About from "./pages/About"
import Sidebar from "./components/Sidebar"
import Navbar from "./components/Navbar"

const Dashboard = lazy(() => import("./pages/Dashboard"))
const Reports = lazy(() => import("./pages/Reports"))

export default function App() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    request("/auth/me")
      .then(() => request<Workspace>("/workspace"))
      .then((data) => {
        if (active) setWorkspace(data)
      })
      .catch((error) => {
        if (active && !(error instanceof ApiError && error.status === 401))
          setError(errorMessage(error))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    const expire = () => {
      setWorkspace(null)
      setError("Your session expired. Please sign in again.")
    }
    window.addEventListener("session-expired", expire)
    return () => {
      active = false
      window.removeEventListener("session-expired", expire)
    }
  }, [])

  useEffect(() => {
    document.title = `${routeTitle(location.pathname)} | CaseFlow`
  }, [location.pathname])

  if (loading) return <div className="p-12 text-center">Loading CaseFlow…</div>

  const login = workspace ? (
    <Navigate
      to={safeReturnPath(location.state?.from, workspace.user.role)}
      replace
    />
  ) : (
    <>
      <Feedback error={error} />
      <Login
        onLogin={async () => {
          setWorkspace(await request<Workspace>("/workspace"))
          setError("")
        }}
      />
    </>
  )

  const layout = workspace ? (
    <WorkspaceProvider initial={workspace}>
      <Application
        onLogout={() => {
          setWorkspace(null)
          setError("")
          navigate("/login", { replace: true })
        }}
      />
    </WorkspaceProvider>
  ) : (
    <Navigate
      to="/login"
      replace
      state={{ from: location.pathname + location.search + location.hash }}
    />
  )

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={workspace ? "/dashboard" : "/login"} replace />}
      />
      <Route path="/login" element={login} />
      <Route element={layout}>
        {protectedRoutes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={<PageRoute path={route.path} />}
          />
        ))}
      </Route>
      <Route element={workspace ? layout : <Outlet />}>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

// Adapt URL parameters to existing page props. Keys reset form state when the
// URL changes to another record, including Back/Forward navigation.
function PageRoute({ path }: { path: typeof protectedRoutes[number]["path"] }) {
  const navigate = useNavigate()
  const { customerId = "", caseId = "" } = useParams()
  const [searchParams] = useSearchParams()
  const { user, customers, cases } = useWorkspace()
  const requestedCustomer = searchParams.get("customerId") || undefined
  const legacyNavigate = (name: string, params?: Record<string, string>) =>
    navigate(navigationPath(name, params))
  const backToCustomers = () => navigate("/customers")
  const backToCases = () => navigate("/cases")

  if (!canAccessPage(path, user.role)) return <Navigate to="/dashboard" replace />

  switch (path) {
    case "/dashboard":
      return (
        <Dashboard
          onNavigate={legacyNavigate}
          onViewCase={(id) => navigate(casePath(id))}
        />
      )
    case "/customers":
      return (
        <Customers
          onAddCustomer={() => navigate("/customers/new")}
          onViewCustomer={(id) => navigate(customerPath(id))}
          onEditCustomer={(id) => navigate(`${customerPath(id)}/edit`)}
        />
      )
    case "/customers/new":
      return (
        <CustomerForm
          key="new"
          onSave={backToCustomers}
          onCancel={backToCustomers}
        />
      )
    case "/customers/:customerId/edit":
      if (!customers.some((customer) => customer.id === customerId))
        return <div className="p-6 text-slate-500">Customer not found.</div>
      return (
        <CustomerForm
          key={customerId}
          customerId={customerId}
          onSave={backToCustomers}
          onCancel={backToCustomers}
        />
      )
    case "/customers/:customerId":
      return (
        <CustomerProfile
          key={customerId}
          customerId={customerId}
          onBack={backToCustomers}
          onEditCustomer={(id) => navigate(`${customerPath(id)}/edit`)}
          onCreateCase={() =>
            navigate(navigationPath("create-case", { customerId }))
          }
          onViewCase={(id) => navigate(casePath(id))}
        />
      )
    case "/cases":
      return (
        <Cases
          onCreateCase={() => navigate("/cases/new")}
          onViewCase={(id) => navigate(casePath(id))}
        />
      )
    case "/cases/new":
      if (
        requestedCustomer &&
        !customers.some((customer) => customer.id === requestedCustomer)
      )
        return <div className="p-6 text-slate-500">Customer not found.</div>
      return (
        <CreateCase
          key={requestedCustomer ?? "new"}
          customerId={requestedCustomer}
          onSave={backToCases}
          onCancel={backToCases}
        />
      )
    case "/cases/:caseId/edit":
      if (!cases.some((item) => item.id === caseId))
        return <div className="p-6 text-slate-500">Case not found.</div>
      return (
        <CreateCase
          key={caseId}
          caseId={caseId}
          onSave={backToCases}
          onCancel={backToCases}
        />
      )
    case "/cases/:caseId":
      return (
        <CaseDetails
          key={caseId}
          caseId={caseId}
          onBack={backToCases}
          onEdit={() => navigate(`${casePath(caseId)}/edit`)}
        />
      )
    case "/communications":
      return <Communications />
    case "/reports":
      return <Reports />
    case "/users":
      return user.role === "Admin" ? (
        <Users />
      ) : (
        <Navigate to="/dashboard" replace />
      )
    case "/settings":
      return <Settings />
    case "/about":
      return <About />
  }
}

function Application({ onLogout }: { onLogout: () => void }) {
  const { user } = useWorkspace()
  const [error, setError] = useState("")
  const [loggingOut, setLoggingOut] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [location])

  async function logout() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await request("/auth/logout", "POST")
      onLogout()
    } catch (error) {
      setError(errorMessage(error))
      setLoggingOut(false)
    }
  }

  if (loggingOut) return <div className="p-12 text-center">Signing out…</div>

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50">
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      <div
        className={`fixed md:relative z-50 md:z-auto h-full transition-transform duration-300 ${
          mobileSidebarOpen
            ? "visible translate-x-0"
            : "invisible md:visible -translate-x-full md:translate-x-0"
        }`}
      >
        <Sidebar
          onNavigate={() => setMobileSidebarOpen(false)}
          onLogout={logout}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Navbar
          onNavigate={(name, params) => navigate(navigationPath(name, params))}
          pageTitle={routeTitle(location.pathname)}
          onMobileMenuOpen={() => setMobileSidebarOpen(true)}
        />
        <main
          data-density={user.settings.display?.density ?? "comfortable"}
          className="flex-1 min-h-0 overflow-y-auto"
        >
          <Feedback error={error} />
          <Suspense
            fallback={<div className="p-6 text-slate-500">Loading page…</div>}
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
