# services

Purpose

- Business logic layer: interact with models, perform transactions, coordinate work between repositories and external services (Supabase, email, payments).

Suggested files

- `auth.service.js` — registration, password hashing (`bcrypt`), token creation (`jsonwebtoken`)
- `email.service.js` — sending emails via `nodemailer` or Supabase (if used)

Next steps

- Keep services testable; avoid direct HTTP / Express references in this layer.
