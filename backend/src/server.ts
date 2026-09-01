import express, { Application, Request, Response } from 'express';
import { createServer, Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { Pool } from 'pg'; // Replaced mysql2 with type-safe pg pool instance
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app: Application = express();

// Configuration hooks to handle local dev port 5173 alongside your cloud Netlify routes
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://netlify.app' // Ready for your production site updates
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by security boundary layer policies (CORS).'));
    }
  }
}));
app.use(express.json());

const httpServer: HTTPServer = createServer(app);
const io: SocketIOServer = new SocketIOServer(httpServer, {
  cors: { 
    origin: ALLOWED_ORIGINS, 
    methods: ["GET", "POST"] 
  }
});

// Configure Secure Encrypted PostgreSQL Connection Pool pointing to your Supabase Cloud
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for secure handshakes with remote databases
  }
});

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_secure_random_string_Star_12321';

// 📋 Strict Postgres Interface Models
interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  created_at: Date;
}

interface MessageRow {
  id: number;
  message_text: string;
  created_at: Date;
  username: string;
}

/**
 * 🔐 REGISTRATION CONTROLLER
 */
app.post('/api/auth/register', async (req: Request, res: Response): Promise<Response> => {
  const { username, password } = req.body; 

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required validation fields.' });
  }

  try {
    // MySQL '?' changes to PostgreSQL parameter token '$1'
    const existingUsersCheck = await dbPool.query<UserRow>(
      'SELECT id FROM users WHERE username = $1 LIMIT 1', 
      [username]
    );

    if (existingUsersCheck.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this username already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // SQL INSERT operations query adjustments using indexed identifiers
    const result = await dbPool.query<UserRow>(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id',
      [username, passwordHash]
    );

    return res.status(201).json({ 
      message: 'User account provisioned successfully.', 
      userId: result.rows[0].id // PostgreSQL uses RETURNING clauses instead of insertId
    });
  } catch (error: any) {
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
    const result = await dbPool.query<UserRow>(
      'SELECT * FROM users WHERE username = $1 LIMIT 1', 
      [username]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid identification credentials provided.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid identification credentials provided.' });
    }

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

/**
 * 📡 FETCH ALL MESSAGES
 */
app.get('/api/messages', async (_req: Request, res: Response): Promise<Response> => {
  try {
    const query = `
      SELECT m.id, m.message_text, m.created_at, u.username
      FROM messages m
      JOIN users u ON m.user_id = u.id
      ORDER BY m.created_at ASC
    `;
    
    const result = await dbPool.query<MessageRow>(query);
    
    return res.status(200).json(result.rows);
  } catch (error: any) {
    console.error('❌ Database Messages Query Failure:', error.message);
    return res.status(500).json({ error: 'Internal system fault fetching database history rows.' });
  }
});

/**
 * 📡 FETCH RECENT HISTORY (LAST 100 HOURS)
 * Replaced MySQL's DATE_SUB syntax with standard PostgreSQL INTERVAL syntax
 */
app.get('/api/messages/recent', async (_req: Request, res: Response): Promise<Response> => {
  try {
    const query = `
      SELECT m.id, m.message_text AS text, u.username AS "userId", m.created_at
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.created_at >= NOW() - INTERVAL '100 hours'
      ORDER BY m.created_at ASC
    `;
    
    const result = await dbPool.query<MessageRow>(query);
    
    return res.status(200).json(result.rows);
  } catch (error: any) {
    console.error('❌ Failed to fetch recent database history:', error.message);
    return res.status(500).json({ error: 'Internal system fault fetching recent logs.' });
  }
});

interface ChatMessagePayload {
  userId: string; 
  text: string;
}

io.on('connection', (socket) => {
  console.log(`📡 Socket Connected Safely: ${socket.id}`);

  socket.on('message:send', async (payload: ChatMessagePayload) => {
    try {
      const userCheck = await dbPool.query<UserRow>(
        'SELECT id FROM users WHERE username = $1 LIMIT 1',
        [payload.userId]
      );
      
      const user = userCheck.rows[0];
      if (!user) {
        console.error(`⚠️ Socket operation dropped: user context not found for ${payload.userId}`);
        return;
      }

      // Safe parameter substitution array mapping via $1, $2, $3 variables
      await dbPool.query(
        'INSERT INTO messages (socket_id, user_id, message_text) VALUES ($1, $2, $3)',
        [socket.id, user.id, payload.text]
      );

      const outboundBroadcast = {
        userId: payload.userId, 
        text: payload.text,
        timestamp: new Date().toISOString()
      };

      io.emit('message:broadcast', outboundBroadcast);

    } catch (error: any) {
      console.error('❌ Failed to process real-time database event sync:', error.message);
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket Disconnected: ${socket.id}`);
  });
});

// Configure port monitoring to support dynamic deployments (Render maps to process.env.PORT automatically)
const PORT = process.env.PORT || 5050;
httpServer.listen(PORT, () => console.log(`🔥 Auth & Realtime engine live at http://localhost:${PORT}`));
