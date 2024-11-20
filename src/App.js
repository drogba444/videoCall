import React, { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import { io } from 'socket.io-client';

// Connect to the live socket.io server hosted on Vercel
const socket = io('https://videoback-beta.vercel.app/');

// Your PeerJS server URL and path, updated to the live backend
const peer = new Peer(undefined, { 
  path: '/peerjs', 
  host: 'videoback-beta.vercel.app', 
  port: 443, // Use 443 for HTTPS
  secure: true // Ensure the connection is secure for production
});

const App = () => {
  const [peerId, setPeerId] = useState('');
  const [otherPeerId, setOtherPeerId] = useState('');
  const [isCallActive, setIsCallActive] = useState(false);
  
  const userVideoRef = useRef(null);
  const partnerVideoRef = useRef(null);
  
  // Initialize user's video stream
  useEffect(() => {
    // Get user's media (audio and video)
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
        }

        // Listen for incoming calls
        peer.on('call', (call) => {
          call.answer(stream);
          call.on('stream', (partnerStream) => {
            if (partnerVideoRef.current) {
              partnerVideoRef.current.srcObject = partnerStream;
            }
          });
        });
      })
      .catch((err) => console.error('Failed to get media:', err));

    // Handle peer ID generation
    peer.on('open', (id) => {
      setPeerId(id);
    });

    // Handle socket signaling for offer, answer, and ice-candidate
    socket.on('offer', (offer) => {
      const call = peer.call(offer.peerId, userVideoRef.current.srcObject);
      call.on('stream', (partnerStream) => {
        if (partnerVideoRef.current) {
          partnerVideoRef.current.srcObject = partnerStream;
        }
      });
    });

    socket.on('answer', (answer) => {
      // Handle answer from the other peer (optional)
    });

    socket.on('ice-candidate', (candidate) => {
      // Handle ICE candidates for NAT traversal (optional)
    });

  }, []);

  // Make a video call to another peer
  const makeCall = () => {
    const call = peer.call(otherPeerId, userVideoRef.current.srcObject);
    call.on('stream', (partnerStream) => {
      if (partnerVideoRef.current) {
        partnerVideoRef.current.srcObject = partnerStream;
      }
    });
    setIsCallActive(true);
  };

  return (
    <div>
      <h1>Video Call App</h1>
      <div>
        <h2>Your Peer ID: {peerId}</h2>
        <input
          type="text"
          value={otherPeerId}
          onChange={(e) => setOtherPeerId(e.target.value)}
          placeholder="Enter other peer ID"
        />
        <button onClick={makeCall} disabled={isCallActive}>Make Call</button>
      </div>
      
      <div>
        <video ref={userVideoRef} autoPlay muted style={{ width: '300px' }} />
        <video ref={partnerVideoRef} autoPlay style={{ width: '300px' }} />
      </div>
    </div>
  );
};

export default App;
