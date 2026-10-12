require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve the frontend from the same server (http://localhost:3000)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const FIELDS = [
  'title',
  'description',
  'research_area',
  'faculty_name',
  'department',
  'required_skills',
  'positions',
  'deadline',
  'status',
];

/* ---------- Validation ---------- */
function validate(data) {
  const errors = [];
  const textFields = [
    'title',
    'description',
    'research_area',
    'faculty_name',
    'department',
    'required_skills',
  ];

  for (const f of textFields) {
    if (typeof data[f] !== 'string' || data[f].trim() === '') {
      errors.push(`${f} is required and must be a non-empty string`);
    }
  }
  if (typeof data.title === 'string' && data.title.length > 255) {
    errors.push('title must be at most 255 characters');
  }

  const pos = Number(data.positions);
  if (
    data.positions === undefined ||
    data.positions === null ||
    data.positions === '' ||
    !Number.isInteger(pos) ||
    pos < 0
  ) {
    errors.push('positions is required and must be a non-negative integer');
  }

  if (
    typeof data.deadline !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data.deadline) ||
    Number.isNaN(Date.parse(data.deadline))
  ) {
    errors.push('deadline is required and must be a valid date (YYYY-MM-DD)');
  }

  if (!['Open', 'Closed'].includes(data.status)) {
    errors.push("status is required and must be either 'Open' or 'Closed'");
  }
  return errors;
}

function clean(data) {
  return {
    title: String(data.title).trim(),
    description: String(data.description).trim(),
    research_area: String(data.research_area).trim(),
    faculty_name: String(data.faculty_name).trim(),
    department: String(data.department).trim(),
    required_skills: String(data.required_skills).trim(),
    positions: Number(data.positions),
    deadline: data.deadline,
    status: data.status,
  };
}

function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid ID. ID must be a positive integer.' });
    return null;
  }
  return id;
}

/* ---------- Routes ---------- */

// 1. CREATE
app.post('/api/opportunities', async (req, res) => {
  try {
    const body = { status: 'Open', ...req.body }; // default status
    const errors = validate(body);
    if (errors.length) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    const d = clean(body);
    const [result] = await pool.query(
      `INSERT INTO opportunities
        (title, description, research_area, faculty_name, department,
         required_skills, positions, deadline, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      FIELDS.map((f) => d[f])
    );
    const [rows] = await pool.query('SELECT * FROM opportunities WHERE id = ?', [
      result.insertId,
    ]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. READ ALL
app.get('/api/opportunities', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM opportunities ORDER BY id DESC'
    );
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. READ ONE
app.get('/api/opportunities/:id', async (req, res) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    const [rows] = await pool.query('SELECT * FROM opportunities WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: `Opportunity with id ${id} not found` });
    }
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. UPDATE (supports full or partial updates)
app.put('/api/opportunities/:id', async (req, res) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;

    const [existing] = await pool.query('SELECT * FROM opportunities WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: `Opportunity with id ${id} not found` });
    }

    const merged = { ...existing[0] };
    for (const f of FIELDS) {
      if (req.body[f] !== undefined) merged[f] = req.body[f];
    }

    const errors = validate(merged);
    if (errors.length) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    const d = clean(merged);
    await pool.query(
      `UPDATE opportunities SET
         title = ?, description = ?, research_area = ?, faculty_name = ?,
         department = ?, required_skills = ?, positions = ?, deadline = ?, status = ?
       WHERE id = ?`,
      [...FIELDS.map((f) => d[f]), id]
    );
    const [rows] = await pool.query('SELECT * FROM opportunities WHERE id = ?', [id]);
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. DELETE
app.delete('/api/opportunities/:id', async (req, res) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    const [result] = await pool.query('DELETE FROM opportunities WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: `Opportunity with id ${id} not found` });
    }
    res.status(200).json({ message: `Opportunity ${id} deleted successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* ---------- Error handling ---------- */

// Unknown API route
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Malformed JSON and other errors
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON in request body' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
