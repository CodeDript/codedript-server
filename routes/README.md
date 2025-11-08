# routes

Purpose

- Express route definitions that map HTTP endpoints to controller functions.

Suggested structure

- `auth.routes.js` — `/api/auth` endpoints
- `users.routes.js` — `/api/users` endpoints
- `vehicles.routes.js` — `/api/vehicles` endpoints
- `index.js` — mount and export all routers

Next steps

- Keep routes lightweight: only handle routing and input validation; call controllers for logic.
