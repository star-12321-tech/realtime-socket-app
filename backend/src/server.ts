import express, { Application, Request, Response } from 'express';
import { createServer, Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mysql, { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app: Application = express();
app.use(express.json());

const httpServer: HTTPServer = createServer(app);
const io: SocketIOServer = new SocketIOServer(httpServer, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] } // Adjusted for standard Vite port 5173
});

// Configure Secure Database Pool
const dbPool: Pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'secure_password',
  database: process.env.DB_NAME || 'analytics_db'
});

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_fallback_key';

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
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required validation fields.' });
  }

  try {
    // Check if the user entity record space is already occupied
    const [existingUsers] = await dbPool.query<UserRow[]>(
      'SELECT id FROM users WHERE username = ? LIMIT 1', 
      [username]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'An account with this username address already exists.' });
    }

    // Securely hash the password string out-of-band using standard salt computational loops
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Write structural user entity model parameters down to MySQL tables
    const [result] = await dbPool.query<ResultSetHeader>(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [username, passwordHash]
    );

    return res.status(201).json({ 
      message: 'User account provisioned successfully.', 
      userId: result.insertId 
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

// Socket logic continues down below...
io.on('connection', (socket) => { /* ... WebSocket core orchestrations ... */ });

const PORT = 5050;
httpServer.listen(PORT, () => console.log(`🔥 Auth & Realtime engine live at http://localhost:${PORT}`));
