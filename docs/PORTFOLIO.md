# CaseFlow ? project overview

**CaseFlow | Full-Stack Customer Service & Case Management System**  
React, TypeScript, PHP, PDO, MySQL, REST APIs

[Live CaseFlow demo](https://caseflow-customer-service-demo.vercel.app/login)

CaseFlow brings customer records, support cases, agent assignments, communication history and reporting into a shared workspace.

## Engineering highlights

- React and TypeScript interface with protected routes, customer profiles, case activity timelines and reporting charts.
- PHP API organized into controllers, services and PDO repositories, with relational constraints and transactional data operations.
- Session authentication, role-based authorization, CSRF protection and a server-enforced read-only Demo Viewer role.
- Automated frontend, API, database and browser workflow checks; results are documented in [VERIFICATION.md](VERIFICATION.md).

## Feature highlights

| Area | Capabilities |
| --- | --- |
| Dashboard | Case status summaries and workload visibility |
| Customers | Searchable records and associated case history |
| Cases | Priorities, assignments, status changes and activity timelines |
| Communications and reports | Conversation records, internal notes and case metrics |
| Demo Viewer | Read-only access to workspace data, with writes and file access denied |

The [project README](../README.md) includes an architecture diagram and a dashboard screenshot using synthetic records. Current limitations include loading workspace data in one request, external account provisioning and a schema initializer without migrations.
