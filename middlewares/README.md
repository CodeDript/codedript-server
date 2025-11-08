# middlewares

Purpose

- Express middleware functions (authentication, error handling, logging, validation, rate-limiting).

Suggested files

- `auth.middleware.js` — JWT validation and attaching user to request
- `error.middleware.js` — centralized error handler (use `express-async-errors`)
- `requestLogger.middleware.js` — morgan or custom request logging

Next steps

- Use `helmet`, `compression`, and `morgan` at app-level in `server.js` or `app.js`.
