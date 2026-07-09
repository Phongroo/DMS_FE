import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const JWT_SECRET = 'supersecret-dms-key';

// Initialize OpenAI / Gemini client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});
const AI_MODEL = process.env.AI_MODEL || 'gemini-1.5-pro';

const users = [
  {
    id: 1,
    username: 'hongphong',
    password: '$2a$10$WWc36vJrUscXf506pgiiTuTw0k0umB6C4ZDeZrW00w14fvJy1z0JW',
    firstName: 'Hong',
    lastName: 'Phong',
    email: 'hongphong.12012001@gmail.com',
    phone: null,
    enable: true,
    profile: 'avatar.png',
    accountNonExpired: true,
    credentialsNonExpired: true,
    accountNonLocked: true,
    authorities: [
      {
        authority: 'ADMIN',
        position: 'STAFF'
      }
    ],
    enabled: true
  },
  {
    id: 2,
    username: 'normaluser',
    password: '$2a$10$WWc36vJrUscXf506pgiiTuTw0k0umB6C4ZDeZrW00w14fvJy1z0JW',
    firstName: 'Normal',
    lastName: 'User',
    email: 'normaluser@example.com',
    phone: null,
    enable: true,
    profile: 'avatar-2.png',
    accountNonExpired: true,
    credentialsNonExpired: true,
    accountNonLocked: true,
    authorities: [
      {
        authority: 'NORMAL',
        position: 'STAFF'
      }
    ],
    enabled: true
  }
];

app.use(express.json());

app.post('/generate-token', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find((item) => item.username === username);

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign(
    {
      sub: user.username,
      role: user.authorities?.[0]?.authority ?? 'NORMAL'
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.json({ token, username: user.username, role: user.authorities?.[0]?.authority ?? 'NORMAL' });
});

app.get('/current-user', (req, res) => {
  const raw = req.headers.authorization || '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = users.find((item) => item.username === payload.sub);

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    return res.json(user);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// AI Chat API Endpoint (không dùng Socket)
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const aiResponse = await getAIResponse(message);
    return res.json({
      message: aiResponse,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    return res.status(500).json({
      error: 'Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu.'
    });
  }
});

// Gemini Chat Handler
async function getAIResponse(userMessage) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY not set, using fallback response');
      return 'Xin lỗi, API key chưa được cấu hình. Vui lòng thiết lập OPENAI_API_KEY.';
    }

    const response = await client.responses.create({
      model: AI_MODEL,
      input: [
        {
          role: 'user',
          content: userMessage
        }
      ]
    });

    const output = response.output?.[0];
    if (!output) {
      return 'Tôi không thể xử lý yêu cầu của bạn.';
    }

    if (typeof output === 'string') {
      return output;
    }

    if (output.content) {
      if (Array.isArray(output.content)) {
        const textSegment = output.content.find((item) => item.type === 'output_text');
        return textSegment?.text || 'Tôi không thể xử lý yêu cầu của bạn.';
      }
      return output.content.text || 'Tôi không thể xử lý yêu cầu của bạn.';
    }

    return 'Tôi không thể xử lý yêu cầu của bạn.';
  } catch (error) {
    console.error('Gemini API Error:', error.message || error);
    return 'Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu của bạn.';
  }
}

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('approval:approve', (payload) => {
    const approval = {
      ...payload,
      approvedAt: new Date().toISOString()
    };
    io.emit('approval:approved', approval);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Socket server running on http://localhost:${PORT}`);
});
