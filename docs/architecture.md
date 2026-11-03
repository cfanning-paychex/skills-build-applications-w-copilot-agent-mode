# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision: Keep route components focused on rendering and interaction. Fetch API data through the shared client, and represent loading, empty, and failure states accessibly on each page. Keep browser requests on relative `/api` paths so the Vite proxy remains the integration boundary.
- Logic tier decision: Keep request validation, HTTP status codes, and response shaping in the Express routes/services. Validate request fields and referenced IDs before persistence, return deliberate 4xx responses for invalid or missing resources, and avoid leaking Mongoose cast errors as 500 responses.
- Data tier decision: Define required fields, types, and references in Mongoose models. Keep persistence and seed logic in the data tier; preserve repeatable, idempotent seeding without adding authentication or presentation concerns.
- Activity tracking approach: Validate `userId`, `teamId`, activity type, and positive minutes; verify referenced user and team exist before creating an activity. Persist references and submitted activity details with computed points and an occurrence date, and return the created record in the API contract shape.
- Team management approach: Require a non-empty team name, preserve the submitted name and mascot, and validate member references before saving. Return populated member details where the API/UI contract requires them.
- Leaderboard approach: Calculate totals from persisted activity points grouped by team, sort by total points descending, and assign ranks starting at 1. Return the team name and total in each entry; do not make the presentation tier recompute scores.
- Workout suggestions approach: Find the requested user by email and use the user's fitness goal and recent activity pattern to select and explain relevant suggestions. Return a deliberate 4xx for an unknown email, and keep recommendation logic in the logic tier rather than adding unnecessary persistence.

## Test plan

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`. A failure indicates model validation, references, or seed behavior violates the data contract. Not run yet; the full backend run below exercised these tests.
- API command: `npm run test:api --prefix octofit-tracker/backend`. A failure indicates route validation, status codes, response shape, or business behavior violates the API contract. Not run yet; the full backend run below exercised these tests.
- Frontend command: `npm test --prefix octofit-tracker/frontend`. A failure indicates a route does not correctly render API data or its loading, empty, error, or accessible states. Run result: failed; 15 tests failed in `tests/app.contract.test.tsx`, covering the three data/render and user-specific suggestion cases and loading, empty, and API-error states across four routes.
- Backend build command: `npm run build --prefix octofit-tracker/backend`. A failure indicates backend TypeScript or build configuration errors. Not run.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`. A failure indicates frontend type, bundling, or build configuration errors. Not run.
- Dependency installation: `npm ci --prefix octofit-tracker/backend` and `npm ci --prefix octofit-tracker/frontend` both completed successfully.
- Full backend test command: `npm test --prefix octofit-tracker/backend`. Run result: failed; 8 tests failed and 1 passed across `tests/data.contract.test.ts` and `tests/api.contract.test.ts`. Four model tests found missing required-field validation. Four API tests failed: two invalid-input requests returned `501` instead of `400`, the leaderboard was empty, and a workout suggestion lacked its expected explanation. The seed idempotency test passed.
