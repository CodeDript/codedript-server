# config

Purpose

- Central place for configuration files and environment-specific settings.

Suggested contents

- `default.js` or `default.json` — default configuration values
- `production.js` — overrides for production
- `index.js` — a small loader that reads `process.env.NODE_ENV` and returns the active config

Next steps

- Add `.env` at project root and use `dotenv` in the application entry to load environment variables.
- Keep secrets out of repository; use environment variables or secret manager.
