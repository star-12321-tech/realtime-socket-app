require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json()); // Essential middleware to read JSON post bodies

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] }
});

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

/* ==========================================================================
   🔒 HTTP AUTHENTICATION API ROUTES
   ========================================================================== */

// 1. User Registration Route
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Missing parameters" });

    try {
        const hash = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash]);
        res.status(201).json({ message: "User registered successfully!" });
    } catch (err) {
        res.status(500).json({ error: "Username may already be taken." });
    }
});

// 2. User Login Route (Generates and responds with JWT)
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });

        const user = rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(401).json({ error: "Invalid credentials" });

        // Generate Token containing user ID and username details
        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '2h' });
        res.json({ token, username: user.username });
    } catch (err) {
        res.status(500).json({ error: "Server authentication error" });
    }
});

/* ==========================================================================
   ⚡ SECURED SOCKET.IO MIDDLEWARE & ENGINE
   ========================================================================== */

// Guard Middleware: Rejects any connection lacking a valid signed JWT
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error: Missing token"));

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error("Authentication error: Invalid signature"));
        socket.user = decoded; // Attach user token payloads securely directly to the socket context!
        next();
    });
});

io.on('connection', async (socket) => {
    console.log(`🔐 Authenticated User connected: ${socket.user.username} (${socket.id})`);

    // Fetch message history and join it with users table to get usernames
    try {
        const [rows] = await pool.query(`
            SELECT m.message_text, m.created_at, u.username 
            FROM messages m 
            LEFT JOIN users u ON m.user_id = u.id 
            ORDER BY m.id DESC LIMIT 50
        `);
        socket.emit('load_history', rows.reverse());
    } catch (err) {
        console.error(err);
    }

    socket.on('send_message', async (data) => {
        try {
            const sql = 'INSERT INTO messages (socket_id, user_id, message_text) VALUES (?, ?, ?)';
            await pool.query(sql, [socket.id, socket.user.id, data.text]);

            io.emit('receive_message', {
                username: socket.user.username,
                message_text: data.text,
                created_at: new Date().toISOString()
            });
        } catch (err) {
            console.error(err);
        }
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Secure Authenticated Server running on port ${PORT}`));
