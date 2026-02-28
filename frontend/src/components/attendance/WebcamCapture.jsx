import { useState, useRef, useCallback, useEffect } from 'react';

export default function WebcamCapture({ onCapture, captureLabel = 'Capture' }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  const [captured, setCaptured] = useState(null);

  // Attach stream to video element whenever active changes or stream is set
  useEffect(() => {
    if (active && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [active]);

  const startCamera = useCallback(async () => {
    setError('');
    setCaptured(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      // If video element already exists, attach immediately
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      // This triggers re-render; useEffect above will also attach if needed
      setActive(true);
    } catch (err) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera permissions in your browser.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found. Please connect a camera.');
      } else {
        setError('Camera error: ' + err.message);
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  function handleCapture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Make sure video is actually playing and has dimensions
    if (video.readyState < 2 || video.videoWidth === 0) {
      setError('Camera not ready yet. Please wait a moment and try again.');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob && blob.size > 0) {
        const file = new File([blob], 'face_capture.jpg', { type: 'image/jpeg' });
        const previewUrl = URL.createObjectURL(blob);
        setCaptured(previewUrl);
        stopCamera();
        if (onCapture) onCapture(file);
      } else {
        setError('Failed to capture image. Please try again.');
      }
    }, 'image/jpeg', 0.92);
  }

  function handleRetake() {
    setCaptured(null);
    if (onCapture) onCapture(null);
    startCamera();
  }

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      {/* Camera not started */}
      {!active && !captured && (
        <button type="button" className="btn btn-primary" onClick={startCamera}>
          📷 Open Camera
        </button>
      )}

      {/* Live video feed — always in DOM when active so ref is available */}
      <div style={{ display: active ? 'block' : 'none', marginTop: 12 }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            maxWidth: 480,
            borderRadius: 8,
            border: '2px solid #2563eb',
            display: 'block',
            background: '#000',
          }}
        />
        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-primary" onClick={handleCapture}>
            📸 {captureLabel}
          </button>
          <button type="button" className="btn" onClick={stopCamera}>
            Cancel
          </button>
        </div>
      </div>

      {/* Captured preview */}
      {captured && (
        <div style={{ marginTop: 12 }}>
          <img
            src={captured}
            alt="Captured face"
            style={{ maxWidth: 480, width: '100%', borderRadius: 8, border: '2px solid #22c55e' }}
          />
          <div style={{ marginTop: 10 }}>
            <button type="button" className="btn" onClick={handleRetake}>
              🔄 Retake
            </button>
          </div>
        </div>
      )}

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
