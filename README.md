<div align="center">

<br />

# FormFlow
### The Architect's Canvas

**A world-class, no-code form builder built for teams who move fast.**

Real-time collaboration · Visual conditional logic · Schema-first architecture · One-click exports

<br />

[![Live Demo](https://img.shields.io/badge/Live%20Demo-formflow--nine--plum.vercel.app-18181b?style=for-the-badge&logoColor=white)](https://formflow-nine-plum.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-arjunrhetoric%2Fformflow-18181b?style=for-the-badge&logo=github)](https://github.com/arjunrhetoric/formflow)
[![Node.js](https://img.shields.io/badge/Node.js-18+-18181b?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-18181b?style=for-the-badge&logo=mongodb)](https://mongodb.com/atlas)

<br />

</div>

---

## What is FormFlow?

FormFlow is a no-code form builder that goes beyond what standard tools offer. While most form builders are built for individuals, FormFlow is built for **teams** — with real-time collaboration, visual conditional branching, version history, and dynamic theming all built in from day one.

The core architectural bet: **every field's config is a free-form MongoDB document**. This means adding a brand new field type — a signature pad, a payment input, anything — requires zero database migrations. Just define the config shape and ship it.

---

## Wireframe

![FormFlow Wireframe](./wireframe.svg)

> Early architecture wireframe mapping the Workshop Builder, Stage renderer, Logic Map, and Response Vault user flows.

---

## Features

### 🏗 The Workshop Builder
A three-panel drag-and-drop canvas. Drag any field from the palette onto the canvas, reorder them, and configure every property in the side panel — all without writing a single line of code.

- Drag and drop field placement with `dnd-kit`
- Sortable reordering
- Per-field config editor (labels, placeholders, options, validation)
- Required field toggles with custom error messages
- Live form preview as you build

### ⚡ Real-Time Collaboration
Open the builder in two windows and watch every change sync instantly. This is the feature no competitor has.

- Socket.io rooms keyed per `form_id`
- Every field add, update, delete, and reorder broadcasts as a live patch
- Live colored cursors showing exactly where each teammate is on the canvas
- `Ctrl+Z` broadcasts undo to **all collaborators simultaneously** — not just your own session
- User join/leave toast notifications

### 🌿 Visual Logic Map
Built with React Flow. Set conditional rules by drawing edges between field nodes — no dropdown menus, no guessing how the form flows.

- Each form field rendered as a draggable node
- Drag edges between nodes to create rules
- Set condition (`equals / contains / greater than / less than`) and action (`show / hide`) per edge
- Logic evaluated live on the public Stage as respondents answer

### 🕰 Version History & Time Travel
Every single save creates a versioned snapshot. Nothing is ever lost.

- Full form snapshots stored on every PUT
- Browse complete version history
- Restore any past version with one click
- Per-user local undo/redo stack (max 50 entries)

### 🎨 Dynamic Theming
Four built-in presets plus raw CSS injection for complete control.

| Preset | Description |
|---|---|
| **Minimal** | White background, grey borders, Inter font — clean Notion-style |
| **Bold** | Dark background, vivid accent colours, large type |
| **Glassmorphism** | Frosted glass cards, blur backdrop, gradient background |
| **Corporate** | Navy and white, formal layout, Times New Roman |

Custom CSS is stored in the form document and injected as a `<style>` tag in the Stage page head — so every respondent sees your theme instantly.

### 📊 Response Vault
Every submission captured, analysed, and exportable.

- Paginated response table with all field answers
- Respondent metadata including completion time
- Expandable row detail view
- **One-click CSV export**
- **One-click JSON export**
- Server-side validation on every submission — never trusting the client

### 🌐 Public Stage
Every form gets a public URL at `/f/:slug`. No login required for respondents.

- Form schema fetched fresh on every load
- Conditional logic evaluated on every answer change
- Fields show and hide in real time as the respondent fills the form
- Direct Cloudinary upload for file fields via signed URLs
- Success screen on submit

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js** | React framework, routing, SSR |
| **dnd-kit** | Drag and drop in the Workshop Builder |
| **React Flow** | Visual node graph for the Logic Map |
| **Socket.io Client** | Real-time collaboration |
| **lucide-react** | Icon library |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express** | REST API server |
| **Socket.io** | WebSocket server, rooms, presence |
| **MongoDB Atlas** | Primary database |
| **Mongoose** | ODM with schema validation hooks |
| **Cloudinary** | File storage via signed direct upload |
| **JWT + bcrypt** | Stateless authentication |

---

## Database Schema

FormFlow uses four MongoDB collections. The key design decision is that `fields[].config` is a **free-form sub-document** — the shape varies per field type, and the database never needs to change when a new type is added.

### `users`
```
_id, email, name, passwordHash, avatar_url, cursorColor, forms[]
```

### `forms`
```
_id, slug, title, ownerId, collaborators[], version, theme{preset, custom_css},
fields[{ id, type, order, label, config{}, validation{}, logic[] }]
```

### `responses`
```
_id, formId, formVersion, submittedAt,
respondentMeta{ ip, userAgent, completionTime },
answers[{ fieldId, fieldType, label, value }]
```

### `form_history`
```
_id, formId, version, snapshot{entire form}, changedBy, changeType, timestamp
```

> **Why MongoDB?** Every field type has a completely different config shape. A `rating` field needs `max_stars`. A `file_upload` needs `allowed_types` and `max_size_mb`. A `date_range` needs `min_date` and `max_date`. Forcing this into SQL columns would require a migration every time a new field type ships. MongoDB handles it natively — this is the document model's home territory.

---

## API Reference

### Auth
```
POST   /api/auth/register       { name, email, password }
POST   /api/auth/login          { email, password }
GET    /api/auth/me
```

### Forms
```
GET    /api/forms               List all forms for authenticated user
POST   /api/forms               Create new form
GET    /api/forms/:id           Full form schema
PUT    /api/forms/:id           Save schema, bumps version, archives snapshot
DELETE /api/forms/:id           Soft delete
GET    /api/forms/:id/history   Paginated version history
POST   /api/forms/:id/restore/:historyId   Restore to snapshot
```

### Public Stage
```
GET    /api/public/forms/:slug          Fetch form for rendering (no auth)
POST   /api/public/forms/:slug/submit   Validate and save response (no auth)
```

### Responses & Export
```
GET    /api/forms/:id/responses         Paginated responses
GET    /api/forms/:id/export.csv        Download CSV
GET    /api/forms/:id/export.json       Download JSON
```

### File Uploads
```
POST   /api/uploads/sign        Returns signed Cloudinary upload params
```

---

## WebSocket Events

FormFlow uses Socket.io rooms keyed on `form_id`. All collaboration happens through these events.

### Client → Server
| Event | Payload |
|---|---|
| `join_form` | `{ form_id, user_id, cursor_color }` |
| `cursor_move` | `{ form_id, user_id, x, y }` — throttled 30fps |
| `field_add` | `{ form_id, field }` |
| `field_update` | `{ form_id, field_id, changes }` |
| `field_delete` | `{ form_id, field_id }` |
| `field_reorder` | `{ form_id, ordered_ids[] }` |
| `leave_form` | `{ form_id, user_id }` |

### Server → Client
| Event | Payload |
|---|---|
| `presence_update` | `{ users: [{id, name, color, x, y}] }` |
| `patch_field` | `{ type: 'add'|'update'|'delete'|'reorder', ... }` |
| `user_joined` | `{ user: {id, name, color} }` |
| `user_left` | `{ user_id }` |
| `form_saved` | `{ version }` |

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works)
- Cloudinary account (free tier works)

### 1. Clone the repo
```bash
git clone https://github.com/arjunrhetoric/formflow.git
cd formflow
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
```bash
cp .env.example .env
```

Fill in your `.env`:
```env
PORT=4000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/formflow
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_SECRET=your_api_secret

CORS_ORIGIN=http://localhost:3000
```

### 4. Seed demo data
```bash
# Start the server first
npm run dev

# In a new terminal, seed the demo user and sample form
npm run seed
```

This creates:
- **Email:** `demo@formflow.dev`
- **Password:** `Passw0rd!`
- One sample "Job Application Form" with conditional logic and theming

### 5. Run the smoke test
```bash
npm run smoke
```

Verifies all API endpoints are responding correctly.

---

## Deployment

### Backend → Railway
1. Connect your GitHub repo on [railway.app](https://railway.app)
2. Add all environment variables from your `.env`
3. Railway auto-detects Node and runs `npm start`
4. Enable WebSocket support in Railway service settings

### Frontend → Vercel
1. Import the repo on [vercel.com](https://vercel.com)
2. Set root directory to your frontend folder
3. Add environment variables:
```
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
NEXT_PUBLIC_SOCKET_URL=https://your-backend.up.railway.app
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
```
4. Deploy

---

## Environment Variables

### Backend
| Variable | Description |
|---|---|
| `PORT` | Server port (default 4000) |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `7d`) |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_SECRET` | Cloudinary API secret |
| `CORS_ORIGIN` | Frontend URL for CORS |

### Frontend
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.io server URL |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |

---

## Project Structure

```
formflow/
├── src/
│   ├── index.js              # Express + Socket.io server entry
│   ├── routes/
│   │   ├── auth.js           # Register, login, me
│   │   ├── forms.js          # Forms CRUD + history + restore
│   │   ├── public.js         # Public stage + submit
│   │   ├── responses.js      # Response vault + export
│   │   └── uploads.js        # Cloudinary signed URL
│   ├── models/
│   │   ├── User.js
│   │   ├── Form.js
│   │   ├── Response.js
│   │   └── FormHistory.js
│   ├── middleware/
│   │   └── authenticate.js   # JWT middleware
│   ├── socket/
│   │   └── collaboration.js  # Socket.io room + patch logic
│   └── validation/
│       └── submission.js     # Server-side field validation engine
├── scripts/
│   ├── seed.js               # Demo user + sample form
│   └── smoke.js              # API smoke test
├── .env.example
├── package.json
└── README.md
```

---

## The Demo (3 Minutes)

For evaluators — run through this sequence:

| Time | Action |
|---|---|
| `0:00` | Open two browser windows side-by-side, logged in as different users |
| `0:20` | Window 1: Create a form, drag a Multi-select field onto the canvas |
| `0:40` | Point to Window 2: field appears live, colored cursor visible |
| `1:00` | Open Logic Map, draw edge from a field, set condition and action |
| `1:30` | Open public Stage in a third tab, trigger the conditional hide |
| `2:00` | Submit. Go to Response Vault. Export CSV. |
| `2:30` | Open Theme Editor. Switch to Glassmorphism. Reload Stage. |
| `2:50` | Press Ctrl+Z in the builder — undo visible in both windows |
| `3:00` | *"Zero DB migrations to add any new field type. That's schema-first design."* |

---

## Built By

**Arjun** — [github.com/arjunrhetoric](https://github.com/arjunrhetoric)

Built for a hackathon. Built to last.

---

<div align="center">

**FormFlow — The Architect's Canvas**

[Live Demo](https://formflow-nine-plum.vercel.app) · [GitHub](https://github.com/arjunrhetoric/formflow)

</div>
