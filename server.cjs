const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // support large payloads for base64 background images

// Database connection configuration
const isRenderInternal = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('.render.com') || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('@dpg-'));
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRenderInternal 
    ? false 
    : (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require') 
        ? { rejectUnauthorized: false } 
        : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false))
});

// Default regions data
const DEFAULT_REGIONS = [
  {
    id: "assam",
    name: "Assam",
    address: "INDUSTRIES GROWTH CENTRE, MATIA (MORNAI)\nOPPOSITE TO SAINIK SCHOOL, GOALPARA, ASSAM - 783 101.",
    phone: "",
  },
  {
    id: "bhiwandi",
    name: "Bhiwandi Plant",
    address: "S.NO. 31/B / 32 A, DHAMANGAON OLD AGRA ROAD,\nTAL. - BHIWANDI, DISTT. - THANE, MUMBAI, MAHARASHTRA - 421 302.",
    phone: "",
  },
  {
    id: "erode",
    name: "Erode",
    address: "SF NO. 532, BHAVANI TO ANTHIYUR MAIN ROAD, MYLAMPADI,\nKANNADIPALAYAM POST, BHAVANI TK, ERODE DT - 638 314.",
    phone: "04256 - 238 202 / 302 / 402",
  },
  {
    id: "haridwar",
    name: "Haridwar",
    address: "PLOT NO.16 & 17,SECTOR-4, INTEGRATED INDUSTRIAL ESTATE,\nSIDCUL,RANIPUR, HARIDWAR-249403",
    phone: "01334-239246",
  },
  {
    id: "kanchipuram",
    name: "Kanchipuram",
    address: "NO. 18, ARYAPERUMBAKKAM VILLAGE, KANCHIPURAM - 631 502.",
    phone: "2729 4580/81",
  },
  {
    id: "pondy",
    name: "Pondy",
    address: "R.S. NO. 81/4, KORKADU VILLAGE, NETTAPAKKAM COMMUNE,\nPONDICHERRY -605 110.",
    phone: "0413 - 2665146",
  },
  {
    id: "ro-east",
    name: "RO East",
    address: "14TH FLOOR, P.S. SRIJAN TECH PARK, DN - 52, DN BLOCK, SECTOR - 5,\nSALT LAKE CITY, KOLKATA - 700091",
    phone: "033 - 40669540",
  },
  {
    id: "ro-north",
    name: "RO North",
    address: "D-12/ 2ND FLOOR, KAUSHAMBI, GHAZIABAD - 201010\nUTTAR PRADESH",
    phone: "0120-4335396",
  },
  {
    id: "ro-south",
    name: "RO South",
    address: "NO. 12, POONAMALLEE ROAD, EKKATTUTHANGAL,\nCHENNAI - 6OO 032.",
    phone: "044 - 2225 1011 / 12",
  },
  {
    id: "ro-west",
    name: "RO West",
    address: "504-A, RAHEJA PLAZA PREMISES CO-OP SOCIETY LTD.,\nL.B.S. MARG, GHATKOPAR (WEST), MUMBAI – 400086",
    phone: "",
  },
];

// Initialize Database Tables
async function initDb() {
  let client;
  try {
    console.log("Connecting to Neon PostgreSQL database...");
    client = await pool.connect();
    console.log("Initializing database tables...");
    await client.query("BEGIN");

    // 1. App Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_users (
        username VARCHAR(255) PRIMARY KEY,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL
      )
    `);

    // 2. Regions Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS regions (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        phone VARCHAR(255)
      )
    `);

    // 3. Stats Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS stats (
        unit_id VARCHAR(255) PRIMARY KEY,
        count INT NOT NULL DEFAULT 0
      )
    `);

    // 4. Settings Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // Seed default users if empty
    const usersCountRes = await client.query("SELECT COUNT(*) FROM app_users");
    if (parseInt(usersCountRes.rows[0].count) === 0) {
      console.log("Seeding default users...");
      await client.query(`
        INSERT INTO app_users (username, password, role) VALUES 
        ('user', 'user', 'user'),
        ('admin', 'admin', 'admin')
      `);
    }

    // Seed default regions if empty
    const regionsCountRes = await client.query("SELECT COUNT(*) FROM regions");
    if (parseInt(regionsCountRes.rows[0].count) === 0) {
      console.log("Seeding default regions...");
      for (const region of DEFAULT_REGIONS) {
        await client.query(
          "INSERT INTO regions (id, name, address, phone) VALUES ($1, $2, $3, $4)",
          [region.id, region.name, region.address, region.phone]
        );
      }
    }

    await client.query("COMMIT");
    console.log("Database initialized successfully.");
  } catch (err) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackErr) {
        console.error("Rollback failed:", rollbackErr);
      }
    }
    console.error("Error initializing database:", err);
  } finally {
    if (client) client.release();
  }
}

// REST API Endpoints

// Authentication API
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    const result = await pool.query(
      "SELECT role FROM app_users WHERE username = $1 AND password = $2",
      [username, password]
    );

    if (result.rows.length > 0) {
      res.json({ success: true, role: result.rows[0].role });
    } else {
      res.status(401).json({ error: "Invalid username or password" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error during authentication" });
  }
});

app.post('/api/auth/reset', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    const result = await pool.query(
      "UPDATE app_users SET password = $2 WHERE username = $1 RETURNING role",
      [username, password]
    );
    if (result.rows.length > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Username not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error during password reset" });
  }
});

// Users Management APIs
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query("SELECT username, role, password FROM app_users");
    const usersMap = {};
    result.rows.forEach(row => {
      usersMap[row.username] = { password: row.password, role: row.role };
    });
    res.json(usersMap);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.post('/api/users', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    await pool.query(
      "INSERT INTO app_users (username, password, role) VALUES ($1, $2, $3)",
      [username, password, role]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      res.status(400).json({ error: "Username already exists" });
    } else {
      res.status(500).json({ error: "Failed to create user" });
    }
  }
});

app.put('/api/users/:username', async (req, res) => {
  const { username } = req.params;
  const { password, role } = req.body;
  if (!password || !role) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const result = await pool.query(
      "UPDATE app_users SET password = $1, role = $2 WHERE username = $3",
      [password, role, username]
    );
    if (result.rowCount > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

app.delete('/api/users/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const result = await pool.query("DELETE FROM app_users WHERE username = $1", [username]);
    if (result.rowCount > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// Regions Management APIs
app.get('/api/regions', async (req, res) => {
  try {
    const result = await pool.query("SELECT id, name, address, phone FROM regions ORDER BY name ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch regions" });
  }
});

app.post('/api/regions', async (req, res) => {
  const regions = req.body;
  if (!Array.isArray(regions)) {
    return res.status(400).json({ error: "Invalid payload, expected array" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM regions");
    for (const region of regions) {
      await client.query(
        "INSERT INTO regions (id, name, address, phone) VALUES ($1, $2, $3, $4)",
        [region.id, region.name, region.address, region.phone || '']
      );
    }
    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to save regions" });
  } finally {
    client.release();
  }
});

// Stats Logging APIs
app.get('/api/stats', async (req, res) => {
  try {
    const result = await pool.query("SELECT unit_id, count FROM stats");
    const statsMap = {};
    result.rows.forEach(row => {
      statsMap[row.unit_id] = row.count;
    });
    res.json(statsMap);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

app.post('/api/stats', async (req, res) => {
  const { unitId, count } = req.body;
  if (!unitId || count === undefined) {
    return res.status(400).json({ error: "Missing unitId or count" });
  }

  try {
    await pool.query(
      `INSERT INTO stats (unit_id, count) VALUES ($1, $2)
       ON CONFLICT (unit_id) DO UPDATE SET count = stats.count + $2`,
      [unitId, count]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to log stats" });
  }
});

// Settings APIs
app.get('/api/settings/:key', async (req, res) => {
  const { key } = req.params;
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key = $1", [key]);
    if (result.rows.length > 0) {
      res.json({ value: result.rows[0].value });
    } else {
      res.json({ value: null });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

app.post('/api/settings', async (req, res) => {
  const { key, value } = req.body;
  if (!key || value === undefined) {
    return res.status(400).json({ error: "Missing key or value" });
  }

  try {
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2`,
      [key, value]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// Serve Static Files in Production
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback for Single Page Application routing (Vite React app)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start Server and Init Database
app.listen(port, async () => {
  console.log(`Server is running on port ${port}`);
  await initDb();
});
