require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mysql = require('mysql2/promise'); // Using promise wrapper for clean async/await

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

// Configure a production-ready MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

io.on('connection', async (socket) => {
    console.log(`⚡ User connected: ${socket.id}`);

    // 1. FETCH HISTORY: When a user connects, pull the last 50 messages from MySQL
    try {
        const [rows] = await pool.query(
            'SELECT socket_id, message_text, created_at FROM messages ORDER BY id DESC LIMIT 50'
        );
        // Reverse array so historical data displays chronologically (oldest to newest)
        socket.emit('load_history', rows.reverse());
    } catch (err) {
        console.error('❌ Error fetching MySQL history:', err);
    }

    // 2. SAVE & BROADCAST: Handle incoming real-time stream items
    socket.on('send_message', async (data) => {
        try {
            // Write payload securely to MySQL rows
            const sql = 'INSERT INTO messages (socket_id, message_text) VALUES (?, ?)';
            await pool.query(sql, [socket.id, data.text]);

            // FIX: Broadcast using 'message_text' so it perfectly matches your database history format!
            io.emit('receive_message', {
                socket_id: socket.id,
                message_text: data.text, // Matches item.message_text on frontend
                created_at: new Date().toISOString()
            });
        } catch (err) {
            console.error('❌ Database insertion failed:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Database-backed WebSocket server active on port ${PORT}`);
});
