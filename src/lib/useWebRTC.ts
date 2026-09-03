'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

const SIGNALING_URL = process.env.NEXT_PUBLIC_SIGNALING_URL || 'http://localhost:3001';
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

interface UseWebRTCOpts {
  userId: string;
  username: string;
  filters?: { gender?: string; country?: string };
}

export function useWebRTC({ userId, username, filters }: UseWebRTCOpts) {
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connected, setConnected] = useState(false);
  const [peerUsername, setPeerUsername] = useState<string | null>(null);

  useEffect(() => {
    const socket = io(SIGNALING_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('register', { userId, username, filters });
    });

    socket.on('match-found', async ({ peerId, peerUsername: pn, roomId }) => {
      setPeerUsername(pn);
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerRef.current = pc;

      // Get local media
      const localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        setConnected(true);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('signal', {
            roomId,
            payload: { type: 'ice-candidate', candidate: event.candidate },
          });
        }
      };

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('signal', {
        roomId,
        payload: { type: 'offer', sdp: offer },
      });
    });

    socket.on('signal', async ({ payload }) => {
      const pc = peerRef.current;
      if (!pc) return;

      if (payload.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        // Echo back via the same room — room ID extracted from context
      } else if (payload.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      } else if (payload.type === 'ice-candidate' && payload.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      }
    });

    socket.on('peer-disconnected', () => {
      cleanup();
    });

    socket.on('peer-skipped', () => {
      cleanup();
    });

    return () => {
      cleanup();
    };
  }, [userId, username]); // eslint-disable-line

  function cleanup() {
    peerRef.current?.close();
    peerRef.current = null;
    setRemoteStream(null);
    setConnected(false);
    setPeerUsername(null);
  }

  const findMatch = useCallback(() => {
    socketRef.current?.emit('find-match', { userId, filters });
  }, [userId, filters]);

  const skip = useCallback((roomId: string) => {
    socketRef.current?.emit('skip', { roomId });
    cleanup();
  }, []);

  const endCall = useCallback(() => {
    cleanup();
    socketRef.current?.disconnect();
  }, []);

  return { remoteStream, connected, peerUsername, findMatch, skip, endCall };
}
