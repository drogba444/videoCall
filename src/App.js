import React, { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import { io } from 'socket.io-client';

// Connect to the socket.io server
const socket = io('https://videoback-1.onrender.com');

const App = () => {
  const [peerId, setPeerId] = useState('');
  const [otherPeerId, setOtherPeerId] = useState('');
  const [isCallActive, setIsCallActive] = useState(false);

  const userVideoRef = useRef(null);
  const partnerVideoRef = useRef(null);
  const [userStream, setUserStream] = useState(null);

  const peer = useRef(null); // Use a ref for PeerJS to avoid re-initialization on rerenders.

  // Initialize PeerJS and user's video stream
  useEffect(() => {
    // Create a PeerJS instance
    peer.current = new Peer({
      host: 'videoback-1.onrender.com',
      port: 443,
      path: '/peerjs',
      secure: true, // Ensure a secure connection
    });

    // Generate the peer ID and set it
    peer.current.on('open', (id) => {
      setPeerId(id);
      socket.emit('register-peer', id); // Notify the server of the new peer
    });

    // Handle incoming calls
    peer.current.on('call', (call) => {
      call.answer(userStream); // Answer the call with the user's stream
      call.on('stream', (partnerStream) => {
        if (partnerVideoRef.current) {
          partnerVideoRef.current.srcObject = partnerStream;
        }
      });
    });

    // Set up user's video stream
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setUserStream(stream);
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
        }
      })
      .catch((err) => console.error('Failed to get user media:', err));

    return () => {
      if (peer.current) peer.current.destroy(); // Clean up the PeerJS instance
    };
  }, []);

  // Make a call to another peer
  const makeCall = () => {
    const call = peer.current.call(otherPeerId, userStream); // Initiate the call with the user's stream
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
        <button onClick={makeCall} disabled={!peerId || !otherPeerId || isCallActive}>
          Make Call
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        <div>
          <h3>Your Video</h3>
          <video ref={userVideoRef} autoPlay muted style={{ width: '300px' }} />
        </div>
        <div>
          <h3>Partner's Video</h3>
          <video ref={partnerVideoRef} autoPlay style={{ width: '300px' }} />
        </div>
      </div>
    </div>
  );
};

export default App;
