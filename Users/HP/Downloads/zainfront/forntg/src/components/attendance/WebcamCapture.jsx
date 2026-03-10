import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';

/**
 * WebcamCapture
 * Live webcam opens immediately. No "Open Camera" button needed.
 * Props:
 *   onCapture(file|null)  — File when photo ready, null on retake
 *   captureLabel          — snapshot button text
 */
export default function WebcamCapture({ onCapture, captureLabel = 'Capture Photo' }) {
  const [step, setStep]       = useState('live'); // live | preview
  const [preview, setPreview] = useState(null);
  const [camErr, setCamErr]   = useState('');
  const webcamRef = useRef(null);
  const fileRef   = useRef(null);

  const capture = useCallback(() => {
    const src = webcamRef.current?.getScreenshot();
    if (!src) return;
    fetch(src).then(r => r.blob()).then(blob => {
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
      setPreview(src);
      setStep('preview');
      onCapture(file);
    });
  }, [onCapture]);

  function retake() {
    setPreview(null);
    setCamErr('');
    setStep('live');
    onCapture(null);
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setStep('preview');
    onCapture(file);
    e.target.value = '';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {step === 'live' && (
        <>
          {/* react-webcam manages the stream entirely — no manual srcObject */}
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            screenshotQuality={0.92}
            mirrored={true}
            videoConstraints={{ facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }}
            onUserMediaError={() => setCamErr('Camera blocked — please allow access in browser settings.')}
            style={{
              width: '100%', maxWidth: 460, borderRadius: 12,
              border: '2px solid var(--accent)', display: 'block',
              boxShadow: '0 0 28px var(--accent-glow)',
            }}
          />
          {camErr && <div className="alert alert-err">{camErr}</div>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-p btn-sm" type="button" onClick={capture}>
              📸 {captureLabel}
            </button>
            <button className="btn btn-sm" type="button" onClick={() => fileRef.current?.click()}>
              📁 Upload Instead
            </button>
            <input ref={fileRef} type="file" accept="image/*"
              style={{ display: 'none' }} onChange={handleFile} />
          </div>
        </>
      )}

      {step === 'preview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <img src={preview} alt="Captured" style={{
            width: '100%', maxWidth: 300, borderRadius: 12,
            border: '2px solid var(--green)', display: 'block',
            boxShadow: '0 0 16px var(--green-b)',
          }} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="badge badge-green">✅ Photo Ready</span>
            <button className="btn btn-xs" type="button" onClick={retake}>🔄 Retake</button>
          </div>
        </div>
      )}

    </div>
  );
}