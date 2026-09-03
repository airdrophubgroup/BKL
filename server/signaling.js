/**
 * Beediyo Kall — Secured WebRTC Signaling Server
 *
 * Features:
 * - JWT token authentication
 * - Rate limiting per socket
 * - Input validation
 * - Room-based isolation
 */

const { Server } = require('socket.io');
const crypto = require('crypto');

const PORT = process.env.SIGNALING_PORT || 3001;
const AUTH_SECRET = process.env.SIGNALING_SECRET || 'beediyo-kall-signaling-secret-change-in-production';

const io = new Server(PORT, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 1e6, // 1MB max
});

// In-memory stores
const onlineUsers = new Map();       // socketId -> { userId, username, filters }
const roomMembers = new Map();       // roomId -> Set<socketId>
const socketRateLimits = new Map();  // socketId -> { count, resetAt }

// ============================================================
// Simple JWT-like token verification (for signaling auth)
// ============================================================
function verifyAuthToken(token) {
  try {
    // Simple HMAC-based token (production: use proper JWT library)
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;

    const expectedSig = crypto
      .createHmac('sha256', AUTH_SECRET)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSig) return null;

    const data = JSON.parse(Buffer.from(payload, 'base64').toString());

    // Check expiry (5 minutes)
    if (Date.now() > data.exp) return null;

    return data;
  } catch {
    return null;
  }
}

// ============================================================
// Rate limiter per socket
// ============================================================
function checkSocketRateLimit(socketId, maxPerSecond = 10) {
  const now = Date.now();
  const entry = socketRateLimits.get(socketId);

  if (!entry || now > entry.resetAt) {
    socketRateLimits.set(socketId, { count: 1, resetAt: now + 1000 });
    return true;
  }

  if (entry.count >= maxPerSecond) {
    return false;
  }

  entry.count++;
  return true;
}

// ============================================================
// Input sanitization
// ============================================================
function sanitize(str, maxLen = 100) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>"'`;]/g, '').trim().slice(0, maxLen);
}

function isValidUserId(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// ============================================================
// Connection handler
// ============================================================
io.on('connection', (socket) => {
  let authenticated = false;
  let userData = null;

  // Require authentication within 5 seconds
  const authTimeout = setTimeout(() => {
    if (!authenticated) {
      socket.emit('auth_error', { message: 'Authentication timeout' });
      socket.disconnect();
    }
  }, 5000);

  // Handle authentication
  socket.on('authenticate', ({ token, userId, username, filters }) => {
    if (authenticated) return;

    // Verify token
    const tokenData = verifyAuthToken(token);
    if (!tokenData || tokenData.userId !== userId) {
      socket.emit('auth_error', { message: 'Invalid token' });
      socket.disconnect();
      return;
    }

    // Validate inputs
    if (!isValidUserId(userId) || !username || typeof username !== 'string') {
      socket.emit('auth_error', { message: 'Invalid data' });
      socket.disconnect();
      return;
    }

    authenticated = true;
    clearTimeout(authTimeout);

    userData = {
      userId,
      username: sanitize(username, 50),
      filters: typeof filters === 'object' ? filters : {},
    };

    onlineUsers.set(socket.id, userData);
    console.log(`[signal] authenticated: ${userData.username} (${socket.id})`);
    socket.emit('authenticated', { success: true });
  });

  // All other events require authentication
  socket.on('find-match', (data) => {
    if (!authenticated || !checkSocketRateLimit(socket.id)) return;

    const me = onlineUsers.get(socket.id);
    if (!me) return;

    // Find a random online peer
    const candidates = [];
    for (const [sid, peer] of onlineUsers.entries()) {
      if (sid === socket.id) continue;
      candidates.push({ sid, ...peer });
    }

    if (candidates.length === 0) {
      socket.emit('no-match');
      return;
    }

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    const roomId = [socket.id, chosen.sid].sort().join(':');

    // Track room members
    if (!roomMembers.has(roomId)) {
      roomMembers.set(roomId, new Set());
    }
    roomMembers.get(roomId).add(socket.id);
    roomMembers.get(roomId).add(chosen.sid);

    // Join both users to a room
    socket.join(roomId);
    io.to(chosen.sid).socketsJoin(roomId);

    // Notify both
    socket.emit('match-found', {
      peerId: chosen.userId,
      peerUsername: chosen.username,
      roomId,
    });
    io.to(chosen.sid).emit('match-found', {
      peerId: me.userId,
      peerUsername: me.username,
      roomId,
    });

    console.log(`[signal] match: ${me.username} <-> ${chosen.username}`);
  });

  // WebRTC signaling relay
  socket.on('signal', ({ roomId, payload }) => {
    if (!authenticated || !checkSocketRateLimit(socket.id)) return;

    // Validate roomId format
    if (!roomId || typeof roomId !== 'string' || roomId.length > 100) return;

    // Validate payload
    if (!payload || typeof payload !== 'object') return;

    socket.to(roomId).emit('signal', { from: socket.id, payload });
  });

  // Skip / next
  socket.on('skip', ({ roomId }) => {
    if (!authenticated || !checkSocketRateLimit(socket.id)) return;

    if (!roomId || typeof roomId !== 'string') return;

    socket.to(roomId).emit('peer-skipped');
    socket.leave(roomId);

    // Cleanup room tracking
    const members = roomMembers.get(roomId);
    if (members) {
      members.delete(socket.id);
      if (members.size === 0) {
        roomMembers.delete(roomId);
      }
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    clearTimeout(authTimeout);
    const me = onlineUsers.get(socket.id);
    onlineUsers.delete(socket.id);
    socketRateLimits.delete(socket.id);

    if (me) {
      console.log(`[signal] disconnected: ${me.username} (${socket.id})`);
      // Notify rooms
      for (const room of socket.rooms) {
        if (room !== socket.id) {
          io.to(room).emit('peer-disconnected');
          // Cleanup
          const members = roomMembers.get(room);
          if (members) {
            members.delete(socket.id);
            if (members.size === 0) roomMembers.delete(room);
          }
        }
      }
    }
  });
});

console.log(`[signal] Secured signaling server running on port ${PORT}`);
