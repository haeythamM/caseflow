# CaseFlow frontend

The frontend is the browser interface for CaseFlow. It connects customer records, cases, communication history, reporting and account settings to the PHP API in `../backend/`.

## Stack and structure

React 19 and TypeScript provide the components. React Router handles URLs, Vite builds and serves the application, Tailwind CSS 4 supplies the styles, and Recharts renders report charts.

| Location | Purpose |
| --- | --- |
| `src/main.tsx` | React entry point and BrowserRouter |
| `src/App.tsx` | Session loading, protected routes, layout and page adapters |
| `src/routing.ts` | Route metadata, URL builders and safe login return paths |
| `src/pages/` | Screens, forms and NotFound page |
| `src/components/` | Sidebar, Navbar, badges and feedback |
| `src/data/Workspace.tsx` | Workspace context and refresh operation |
| `src/lib/api.ts` | JSON requests, CSRF and session-expiration handling |
| `src/index.css` | Global styles and Tailwind import |
| `tests/` | Routing integration, render and development fallback checks |

## Run locally

Use Node.js 22.12 or newer in the Node 22 line. The [setup guide](../docs/SETUP.md) explains the database and PHP requirements.

```sh
npm ci
npm run dev
```

Open **http://localhost:8443**. `PORT` can override the frontend port. The Vite development and preview servers forward `/api` to `http://127.0.0.1:8000`.

Start PHP separately from `backend/`:

```sh
php -d upload_max_filesize=10M -d post_max_size=12M -S 127.0.0.1:8000 -t public public/index.php
```

The `npm run api:serve` shortcut starts the same API entry point. Runtime data comes from the API. Test fixtures are not a fallback when the server or database is unavailable.

## Routes

| URL | View |
| --- | --- |
| `/` | Dashboard when signed in; Login otherwise |
| `/login` | Sign in |
| `/dashboard` | Dashboard |
| `/customers` | Customer list |
| `/customers/new` | Add customer |
| `/customers/:customerId` | Customer profile |
| `/customers/:customerId/edit` | Edit customer |
| `/cases` | Case list |
| `/cases/new` | Create case |
| `/cases/:caseId` | Case details |
| `/cases/:caseId/edit` | Edit case |
| `/communications` | Communication records |
| `/reports` | Case reports |
| `/users` | User directory; Admin only |
| `/settings` | Profile, password and preferences |
| `/about` | Product overview, technology and demo-data guidance |
| Any unknown URL | NotFound with a Dashboard link |

`/cases/new?customerId=...` preselects a customer. Invalid record IDs show a not-found state, including edit routes. Sidebar links and active highlighting follow the URL, as do Navbar and browser-tab titles.

## Sessions and API requests

App checks `/api/auth/me` and loads `/api/workspace` before mounting protected pages. An unauthenticated visit to a protected URL leads to `/login`. Login restores a recognized same-origin protected path when the user's role permits it; otherwise it goes to Dashboard. The return location is kept in browser history state.

Requests use same-origin cookies. The API client obtains a CSRF token for writes and sends it in `X-CSRF-Token`. An expired session clears the workspace and leads back to Login. A non-Admin cannot open Users by typing its URL; the API independently enforces the same restriction.

Route adapters supply record IDs and navigation callbacks to page components. Forms reset when moving between records. Unsaved drafts, search filters and table pagination are local component state and are not restored by refreshing or sharing the page URL.

## Commands and tests

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`npm test` runs:

- `test:routing`: App and page integration tests in jsdom, with a mocked API; includes access guards, direct entry, history, titles, login redirects and missing records.
- `test:render`: server-render checks with fixture and empty workspaces, plus Sidebar checks.
- `test:spa`: HTTP requests to an ephemeral Vite server to verify deep-link fallback.

The tests do not write to the application database. They are not a substitute for live-browser checks against PHP.

npm is the supported package manager; commit `package-lock.json` when dependencies change. There is no lint script. Optional Chrome/Playwright checks are documented in the [setup guide](../docs/SETUP.md).

## Production hosting

`npm run build` writes the application to `dist/`. Vite's development server already serves `index.html` for frontend document requests to deep URLs. Production hosting needs the equivalent behavior:

1. Route `/api` and `/api/*` to the PHP deployment.
2. Serve existing static files normally; missing assets should return 404.
3. Internally rewrite other frontend document requests to `/index.html`, retaining the requested browser URL.

An Nginx frontend example, with API handling configured separately:

```nginx
location /assets/ { try_files $uri =404; }
location / { try_files $uri $uri/ /index.html; }
```

The current configuration assumes hosting at the origin root. A subdirectory deployment needs matching Vite `base` and router `basename` values. The client-side NotFound screen normally receives HTTP 200 from static SPA hosting; a server-level 404 needs additional hosting logic. Vite preview is for checking a build locally, not for production hosting.

## Known integration limits

Workspace data is loaded in full; server-side search and pagination are future work. See the [project guide](../README.md) for current scope.

## Copyright

Copyright (c) 2026 haeythamM. All rights reserved. See [LICENSE](../LICENSE). Third-party packages retain their own licenses.
