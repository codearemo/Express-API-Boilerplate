# Feed App Server

REST API for a social feed application. Built with Express and a layered architecture that separates HTTP, business logic, and data access. Supports versioned routes, JWT authentication, Zod validation, and switchable database drivers (MongoDB today, SQL planned).

---

## Features

- **Versioned API** — all routes under `/api/v1`
- **Auth** — register, login (email or username via single `identifier` field), JWT bearer tokens
- **Users** — protected profile endpoint (`GET /users/me`)
- **Validation** — Zod schemas with field-level error `details`
- **Uniform responses** — consistent `{ data, message, details?, pagination? }` envelope
- **Password security** — bcrypt hashing, passwords never returned in API responses
- **API docs** — Swagger UI at `/api-docs`, OpenAPI JSON at `/api-docs.json`
- **Postman** — collection generated from OpenAPI via `npm run postman:build`
- **Linting & formatting** — ESLint + Prettier

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Framework | Express 5 |
| Database (current) | MongoDB via Mongoose |
| Database (planned) | MySQL via Sequelize |
| Auth | JWT (`jsonwebtoken`) + bcrypt |
| Validation | Zod |
| API docs | swagger-jsdoc, swagger-ui-express |

---

## Project Structure

```
feed-app-server/
├── postman/                    # Generated Postman collection & environment
├── scripts/
│   └── build-postman.js        # OpenAPI → Postman converter
├── src/
│   ├── api/v1/                 # Version router (mounts auth + users)
│   ├── config/                 # Environment-based configuration
│   ├── database/               # DB connection lifecycle (mongo | sql)
│   ├── docs/                   # OpenAPI spec (paths.js + swagger.js)
│   ├── middleware/             # authenticate, error handler
│   ├── modules/
│   │   ├── auth/               # Register, login, JWT signing
│   │   └── users/              # User model, repository, profile
│   ├── utils/
│   │   └── api-response.js     # Uniform response envelope
│   ├── app.js                  # Express app setup
│   └── server.js               # Entry point
├── .env                        # Local secrets (not committed)
├── eslint.config.js
└── package.json
```

### Request flow

```
HTTP Request
  → app.js (express.json, routes)
  → api/v1 (version prefix)
  → module routes (auth / users)
  → controller        ← HTTP in/out only
  → service           ← business rules, validation
  → repository        ← database driver switch
  → model (Mongoose)  → MongoDB
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- npm

### Installation

```bash
git clone <repository-url>
cd feed-app-server
npm install
```

### Environment variables

Create a `.env` file in the project root:

```env
PORT=3003

# JWT
JWT_SECRET=your-long-random-secret
JWT_EXPIRES_IN=7d

# Database driver: mongo | sql
DB_DRIVER=mongo

# MongoDB
MONGO_URI=mongodb://localhost:27017/feed-app

# SQL (when DB_DRIVER=sql)
SQL_DIALECT=mysql
SQL_HOST=localhost
SQL_PORT=3306
SQL_DATABASE=feed_app
SQL_USER=root
SQL_PASSWORD=
```

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: `3000`) |
| `JWT_SECRET` | Yes | Secret for signing JWTs |
| `JWT_EXPIRES_IN` | No | Token expiry (default: `7d`) |
| `DB_DRIVER` | No | `mongo` or `sql` (default: `mongo`) |
| `MONGO_URI` | Yes* | MongoDB connection string |
| `SQL_*` | Yes** | MySQL settings when using SQL driver |

\* Required when `DB_DRIVER=mongo`  
\** Required when `DB_DRIVER=sql`

### Run the server

```bash
# Development (auto-restart on file changes)
npm run dev

# Production
npm start
```

Server starts at `http://localhost:3003` (or your `PORT`).

---

## API Reference

Base URL: `http://localhost:3003/api/v1`

Interactive docs: [http://localhost:3003/api-docs](http://localhost:3003/api-docs)

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | No | Health check |
| `POST` | `/api/v1/auth/register` | No | Create a new user |
| `POST` | `/api/v1/auth/login` | No | Login, returns JWT |
| `GET` | `/api/v1/users/me` | Bearer JWT | Get logged-in user profile |

### Register

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Doe",
  "username": "jane",
  "email": "jane@example.com",
  "password": "password123"
}
```

### Login

Send a single `identifier` — email **or** username:

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "identifier": "jane",
  "password": "password123"
}
```

Response includes a JWT in `data.token`. Send it on protected routes:

```http
Authorization: Bearer <token>
```

### Get profile

```http
GET /api/v1/users/me
Authorization: Bearer <token>
```

---

## Response Format

All `/api/v1` responses use a uniform envelope.

### Success

```json
{
  "data": { },
  "message": "Login successful"
}
```

### Success with pagination (list endpoints)

```json
{
  "data": [ ],
  "message": "Posts fetched successfully",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Error

```json
{
  "data": null,
  "message": "Invalid email address",
  "details": [
    { "field": "email", "message": "Invalid email address" }
  ]
}
```

`details` appears only for validation errors. `pagination` appears only on paginated list endpoints.

### HTTP status codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Resource created |
| `400` | Validation failed or bad login credentials |
| `401` | Missing or invalid JWT (protected routes) |
| `404` | Resource not found |
| `409` | Conflict (duplicate email/username) |
| `500` | Internal server error |

---

## Authentication

```
1. POST /auth/login     →  { data: { user, token } }
2. Store data.token     →  localStorage / memory
3. Protected requests   →  Authorization: Bearer <token>
4. authenticate MW     →  sets req.user.id from JWT payload
```

JWT payload contains only `{ sub: userId }` — no email or password in the token.

---

## API Documentation

### Swagger (live)

| URL | Description |
|-----|-------------|
| `/api-docs` | Interactive Swagger UI |
| `/api-docs.json` | Raw OpenAPI JSON |

Docs are generated from `src/docs/paths.js` and `src/docs/swagger.js`. Edit those files, then refresh the browser — no server restart needed.

When you change API behavior, update the docs in `src/docs/` to match.

### Postman

Generate a collection from the OpenAPI spec:

```bash
npm run postman:build
```

Outputs to `postman/`:

- `feed-app.postman_collection.json`
- `feed-app.local.postman_environment.json`
- `openapi.json`

Import both JSON files into Postman, or import directly from `http://localhost:3003/api-docs.json` when the server is running.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start server with file watching |
| `npm start` | Start server |
| `npm run lint` | Run ESLint on `src/` and `scripts/` |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting without writing |
| `npm run postman:build` | Generate Postman collection from OpenAPI |

---

## Development Conventions

### Module layout

| Module | Responsibility |
|--------|----------------|
| `auth.*` | Identity flows — register, login, JWT |
| `users.*` | User entity — model, repository, profile |

### Layer rules

- **Controllers** — HTTP only; call services, send responses via `sendSuccess`
- **Services** — business rules; no Express, no Mongoose
- **Repositories** — data access; driver switch via `DB_DRIVER`
- **Models** — Mongoose schemas (MongoDB only)

### Adding a new endpoint

1. Add route in `*.routes.js`
2. Add controller handler
3. Add service logic
4. Use repository for DB access
5. Document in `src/docs/paths.js` and `src/docs/swagger.js`
6. Run `npm run postman:build` if you use committed Postman files

---

## License

ISC
