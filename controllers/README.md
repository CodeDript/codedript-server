# controllers

Purpose

- Route handler functions (controllers) that implement business logic for each route. Keep controllers thin and delegate work to services.

Suggested structure

- `auth.controller.js` — login, register, refresh tokens
- `users.controller.js` — user CRUD operations
- `vehicles.controller.js` — vehicle listing, booking endpoints

Next steps

- Keep controllers focused: validate input, call service layer, return responses.
- Add tests for controller behavior and error handling.
