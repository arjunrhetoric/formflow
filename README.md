# FormFlow Backend

Backend scaffold for the FormFlow hackathon build:

- JWT auth with `register` and `login`
- Forms CRUD with schema-first field configs
- Public stage fetch by slug
- Server-side submission validation and conditional logic checks
- Response Vault exports in CSV and JSON
- Form history snapshots with restore endpoint
- Socket.io collaboration with rooms, cursors, presence, and field patch sync
- Cloudinary signed upload endpoint
- Seed script for a demo user + sample form
- Smoke test script for local API verification

## Quick Start

1. Copy `.env.example` to `.env`
2. Install dependencies:

```bash
npm install
```

3. Start the server:

```bash
npm run dev
```

4. Seed demo data in another terminal after the app is running:

```bash
npm run seed
```

5. Run the local smoke test:

```bash
npm run smoke
```

## Main Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/forms`
- `POST /api/forms`
- `GET /api/forms/:id`
- `PUT /api/forms/:id`
- `POST /api/forms/:id/restore/:historyId`
- `GET /api/public/forms/:slug`
- `POST /api/public/forms/:slug/submit`
- `GET /api/forms/:id/responses`
- `GET /api/forms/:id/export.csv`
- `GET /api/forms/:id/export.json`
- `POST /api/uploads/sign`

## Demo Seed Output

The seed script creates:

- `demo@formflow.dev` / `Passw0rd!`
- one sample "Job Application Form" with conditional logic and theming

You can override these with environment variables:

- `DEMO_NAME`
- `DEMO_EMAIL`
- `DEMO_PASSWORD`
