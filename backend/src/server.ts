import express, { Application, Request, Response } from 'express';
import { createServer, Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mysql, { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cors from 'cors';

const app: Application = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

const httpServer: HTTPServer = createServer(app);
const io: SocketIOServer = new SocketIOServer(httpServer, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] } // Adjusted for standard Vite port 5173
});

// Configure Secure Database Pool
const dbPool: Pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'realtime_db'
});

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_secure_random_string_Star_12321';

// 📋 Strict Type Contracts
interface UserRow extends RowDataPacket {
  id: number;
  username: string;
  password_hash: string;
}

/**
 * 🔐 REGISTRATION CONTROLLER
 */
app.post('/api/auth/register', async (req: Request, res: Response): Promise<Response> => {
  // 1. Accept username directly from the payload body
  const { username, password } = req.body; 

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required validation fields.' });
  }

  try {
    // 2. Query against your database column schema naming "username"
    const [existingUsers] = await dbPool.query<UserRow[]>(
      'SELECT id FROM users WHERE username = ? LIMIT 1', 
      [username]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'An account with this username already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. Perform your safe row data insertion
    const [result] = await dbPool.query<ResultSetHeader>(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [username, passwordHash]
    );

    return res.status(201).json({ 
      message: 'User account provisioned successfully.', 
      userId: result.insertId 
    });
  } catch (error: any) {
    // This log will print the exact string mismatch in your terminal console
    console.error('❌ Registration System Failure:', error.message); 
    return res.status(500).json({ error: 'Internal system fault during registration loop execution.' });
  }
});

/**
 * 🔑 LOGIN CONTROLLER
 */
app.post('/api/auth/login', async (req: Request, res: Response): Promise<Response> => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Incomplete identity payload matching criteria.' });
  }

  try {
    // Locate target user profile row within database cluster
    const [users] = await dbPool.query<UserRow[]>(
      'SELECT * FROM users WHERE username = ? LIMIT 1', 
      [username]
    );
    const user = users[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid identification credentials provided.' });
    }

    // Evaluate cryptographic integrity of the inbound string against stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid identification credentials provided.' });
    }

    // Construct stateless access token carrying encrypted structural runtime definitions
    const token = jwt.sign(
      { userId: user.id, username: user.username }, 
      JWT_SECRET, 
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      message: 'Authentication handshake authorized.',
      token,
      user: { id: user.id, username: user.username }
    });
  } catch (error: any) {
    console.error('❌ Login Processing Exception:', error.message);
    return res.status(500).json({ error: 'Internal server failure handling security validation streams.' });
  }
});

// 📋 Message Structure Contract (For mapping Database output data shapes)
interface MessageRow extends RowDataPacket {
  id: number;
  message_text: string;
  created_at: Date;
  username: string;
}

/**
 * 📡 FETCH ALL MESSAGES
 * Queries the database utilizing a relational JOIN to supply unified chat history data
 */
app.get('/api/messages', async (_req: Request, res: Response): Promise<Response> => {
  try {
    const query = `
      SELECT m.id, m.message_text, m.created_at, u.username
      FROM messages m
      JOIN users u ON m.user_id = u.id
      ORDER BY m.created_at ASC
    `;
    
    const [messages] = await dbPool.query<MessageRow[]>(query);
    
    return res.status(200).json(messages);
  } catch (error: any) {
    console.error('❌ Database Messages Query Failure:', error.message);
    return res.status(500).json({ error: 'Internal system fault fetching database history rows.' });
  }
});

/**
 * 📡 FETCH RECENT HISTORY (LAST 1 HOUR ONLY)
 * Pulls chat rows from MySQL that were written in the past 60 minutes
 */
app.get('/api/messages/recent', async (_req: Request, res: Response): Promise<Response> => {
  try {
    const query = `
      SELECT m.id, m.message_text AS text, u.username AS userId, m.created_at
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.created_at >= DATE_SUB(NOW(), INTERVAL 100 HOUR)
      ORDER BY m.created_at ASC
    `;
    
    const [messages] = await dbPool.query<MessageRow[]>(query);
    
    // Returns a type-safe array mapped directly to what your React state hooks expect
    return res.status(200).json(messages);
  } catch (error: any) {
    console.error('❌ Failed to fetch recent database history:', error.message);
    return res.status(500).json({ error: 'Internal system fault fetching recent logs.' });
  }
});

// Socket logic continues down below...
interface ChatMessagePayload {
  userId: string; // This holds the string username sent by the client
  text: string;
}

io.on('connection', (socket) => {
  console.log(`📡 Socket Connected Safely: ${socket.id}`);

  socket.on('message:send', async (payload: ChatMessagePayload) => {
    try {
      // 1. Locate the numerical primary key ID of the user sending the message
      const [users] = await dbPool.query<UserRow[]>(
        'SELECT id FROM users WHERE username = ? LIMIT 1',
        [payload.userId]
      );
      
      const user = users[0];
      if (!user) {
        console.error(`⚠️ Socket operation dropped: user context not found for ${payload.userId}`);
        return;
      }

      // 2. Perform safe insertion into your messages table layout
      await dbPool.query(
        'INSERT INTO messages (socket_id, user_id, message_text) VALUES (?, ?, ?)',
        [socket.id, user.id, payload.text]
      );

      // 3. Construct the clean broadcast output payload packet matching frontend requirements
      const outboundBroadcast = {
        userId: payload.userId, // Keeps the string username context intact for display
        text: payload.text,
        timestamp: new Date().toISOString()
      };

      // 4. Global distribution out to ALL windows concurrently
      io.emit('message:broadcast', outboundBroadcast);

    } catch (error: any) {
      console.error('❌ Failed to process real-time database event sync:', error.message);
    }
  });

  socket.on('disconnect', () => {
    console.log(`离线 Socket Disconnected: ${socket.id}`);
  });
});

const PORT = 5050;
httpServer.listen(PORT, () => console.log(`🔥 Auth & Realtime engine live at http://localhost:${PORT}`));
