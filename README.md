# University Research Opportunity Portal

A full-stack web application for posting and managing university research opportunities.
Built for **CN – Assignment #1** (BS AI 5A, Fall 2026), National University of Computer & Emerging Sciences, Peshawar Campus.

**GitHub Repository:** https://github.com/Muhammad-Ali512/research-opportunity-portal

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Backend  | Node.js + Express (REST API)        |
| Database | MySQL (`mysql2` driver)             |
| Frontend | HTML, CSS, JavaScript, Bootstrap 5  |
| Testing  | Postman (collection included)       |

## Project Structure

```
research-opportunity-portal/
├── backend/
│   ├── server.js          # Express app + CRUD routes + validation
│   ├── db.js              # MySQL connection pool
│   ├── package.json
│   └── .env.example       # copy to .env and fill in your credentials
├── database/
│   └── schema.sql         # database + table creation
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── style.css
├── postman/
│   └── Research_Opportunity_Portal.postman_collection.json
├── .gitignore
└── README.md
```

## Setup & Run

### Prerequisites
- Node.js 18+
- MySQL 8+ (running locally)

### 1. Create the database
```bash
mysql -u root -p < database/schema.sql
```

### 2. Configure environment
```bash
cd backend
cp .env.example .env      # on Windows: copy .env.example .env
```
Open `.env` and set `DB_PASSWORD` (and `DB_USER` if not `root`). **`.env` is git-ignored — never commit it.**

### 3. Install dependencies and start the server
```bash
npm install
npm start
```
The server runs at **http://localhost:3000**.

### 4. Open the frontend
The backend also serves the frontend. Visit **http://localhost:3000** in your browser.

## REST API

Base URL: `http://localhost:3000/api/opportunities`

| Method | Endpoint                  | Description                     | Success |
|--------|---------------------------|---------------------------------|---------|
| POST   | `/api/opportunities`      | Create an opportunity           | 201     |
| GET    | `/api/opportunities`      | List all opportunities          | 200     |
| GET    | `/api/opportunities/:id`  | Get one opportunity             | 200     |
| PUT    | `/api/opportunities/:id`  | Update (full or partial)        | 200     |
| DELETE | `/api/opportunities/:id`  | Delete an opportunity           | 200     |

Error codes: `400` invalid/missing data or bad ID, `404` not found, `500` server error.

### Opportunity fields

| Field             | Type                 | Notes                         |
|-------------------|----------------------|-------------------------------|
| `id`              | integer              | auto-generated                |
| `title`           | string               | required                      |
| `description`     | string               | required                      |
| `research_area`   | string               | required                      |
| `faculty_name`    | string               | required                      |
| `department`      | string               | required                      |
| `required_skills` | string               | required                      |
| `positions`       | integer (>= 0)       | required                      |
| `deadline`        | string `YYYY-MM-DD`  | required                      |
| `status`          | `Open` \| `Closed`   | defaults to `Open` on create  |

### Example request
```json
POST /api/opportunities
{
  "title": "Deep Learning for Crop Disease Detection",
  "description": "Train CNN models to classify fruit leaf diseases.",
  "research_area": "Computer Vision",
  "faculty_name": "Dr. Ahmed Khan",
  "department": "Computer Science",
  "required_skills": "Python, PyTorch, OpenCV",
  "positions": 2,
  "deadline": "2026-12-31",
  "status": "Open"
}
```

## Testing with Postman

1. Import `postman/Research_Opportunity_Portal.postman_collection.json`.
2. Make sure the server is running.
3. Run the requests in order (1 → 10). Request 1 stores its ID automatically in the `oppId` variable, so the get/update/close/delete requests work without edits. Request 9 returns **404** (deleted record) and request 10 returns **400** (validation).

## Security Notes
- No credentials are stored in the repository; use `backend/.env` (ignored by Git).
- All SQL uses parameterised queries; the frontend escapes output to prevent XSS.
