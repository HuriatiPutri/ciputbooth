import React, { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCw, Sparkles, FlipHorizontal, ArrowLeft, Check, Video, Smile } from 'lucide-react';
import { useBooth } from '../../context/BoothContext';
import { soundManager } from '../../utils/audio';
import { generateMockPhoto } from '../../utils/canvasRenderer';
import { Button, Badge } from '../common';

const POSE_SUGGESTIONS = [
  { emoji: '😁', title: 'Big Bright Smile!', hint: 'Look straight at the lens and smile!' },
  { emoji: '✌️', title: 'Peace & Love!', hint: 'Throw a peace sign or finger heart' },
  { emoji: '🤪', title: 'Goofy & Silly!', hint: 'Wink, stick tongue out, or make a funny face' },
  { emoji: '🕶️', title: 'Cool & Chic!', hint: 'Side profile or candid pose' },
  { emoji: '🥳', title: 'Party Mode!', hint: 'Hands up in celebration!' }
];

export default function CameraBoothScreen() {
  const {
    selectedFrame,
    capturedPhotos,
    currentSlotIndex,
    addCapturedPhoto,
    setStep,
    isMockCamera,
    setIsMockCamera,
    settings,
    retakeSingleSlot,
    setRetakeSingleSlot
  } = useBooth();

  const totalSlots = selectedFrame?.photo_slots?.length || 3;
  const currentSlotNumber = currentSlotIndex + 1;

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [countdown, setCountdown] = useState(null);
  const [isCounting, setIsCounting] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isMirrored, setIsMirrored] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [streamActive, setStreamActive] = useState(false);

  // Initialize camera stream
  useEffect(() => {
    let stream = null;

    async function initCamera() {
      if (isMockCamera) {
        setStreamActive(true);
        setCameraError(null);
        return;
      }

      try {
        setCameraError(null);
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode: 'user'
          },
          audio: false
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setStreamActive(true);
        }
      } catch (err) {
        console.warn('Webcam permission denied or not found:', err);
        setCameraError('No webcam detected. Switched to Mock Studio Camera mode.');
        setIsMockCamera(true);
      }
    }

    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isMockCamera]);

  // Handle countdown and photo snapping
  const startCountdown = () => {
    if (isCounting) return;
    setIsCounting(true);
    let count = Number(settings?.countdownSeconds) || 3;
    setCountdown(count);
    soundManager.playCountdownTick();

    const timer = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        soundManager.playCountdownTick();
      } else {
        clearInterval(timer);
        setCountdown(null);
        capturePhoto();
      }
    }, 1000);
  };

  // Capture frame from video or mock generator
  const capturePhoto = () => {
    setIsFlashing(true);
    soundManager.playCaptureShutter();

    setTimeout(() => {
      setIsFlashing(false);
      setIsCounting(false);
    }, 450);

    let photoDataUrl = '';

    if (isMockCamera || !videoRef.current || cameraError) {
      photoDataUrl = generateMockPhoto(currentSlotNumber);
    } else {
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');
      const vWidth = video.videoWidth || 1280;
      const vHeight = video.videoHeight || 720;

      canvas.width = vWidth;
      canvas.height = vHeight;
      const ctx = canvas.getContext('2d');

      if (isMirrored) {
        ctx.translate(vWidth, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, vWidth, vHeight);
      photoDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    }

    addCapturedPhoto(photoDataUrl);
  };

  const currentPose = POSE_SUGGESTIONS[(currentSlotNumber - 1) % POSE_SUGGESTIONS.length];

  return (
    <div className="w-full h-full flex flex-col justify-between py-4 px-6 sm:px-12 bg-slate-950 overflow-hidden relative">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Screen flash whiteout */}
      {isFlashing && (
        <div className="fixed inset-0 z-50 bg-white camera-flash-overlay pointer-events-none" />
      )}

      {/* Top Header Bar */}
      <div className="mx-auto w-full flex items-center justify-between z-10">
        <Button
          variant="secondary"
          size="md"
          leftIcon={ArrowLeft}
          onClick={() => {
            if (retakeSingleSlot) {
              setRetakeSingleSlot(false);
              setStep('customize');
            } else {
              setStep('frame_select');
            }
          }}
          disabled={isCounting}
          className="rounded-full"
        >
          {retakeSingleSlot ? 'Cancel Retake' : 'Change Frame'}
        </Button>

        {/* Slot Progress Pill */}
        <div className="flex items-center gap-3.5 bg-slate-900/90 backdrop-blur-md px-8 py-4 rounded-full border border-white/15 shadow-2xl">
          <Camera className="w-5 h-5 text-pink-400" />
          <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
            {retakeSingleSlot ? `Retaking Shot #${currentSlotNumber}` : `Photo ${currentSlotNumber} of ${totalSlots}`}
          </span>
          <div className="flex items-center gap-2.5 ml-2">
            {Array.from({ length: totalSlots }).map((_, idx) => (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all ${
                  idx < currentSlotIndex
                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                    : idx === currentSlotIndex
                    ? 'bg-pink-500 scale-125 ring-4 ring-pink-400/40 animate-pulse'
                    : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Camera Mirror Toggle */}
        <Button
          variant="secondary"
          size="md"
          leftIcon={FlipHorizontal}
          onClick={() => setIsMirrored(!isMirrored)}
          className="rounded-full"
        >
          <span className="hidden sm:inline">{isMirrored ? 'Mirrored' : 'Normal'}</span>
        </Button>
      </div>

      {/* Main Center Viewport: Camera Feed + Guides */}
      <div className="relative w-full mx-auto my-auto z-10 flex flex-col items-center">
        {/* Pose Suggestion Alert */}
        <div className="mb-4 inline-flex items-center gap-3 px-8 py-4 rounded-full bg-violet-950/80 border border-violet-500/40 backdrop-blur-md shadow-2xl animate-bounce">
          <span className="text-xl">{currentPose.emoji}</span>
          <span className="text-xs sm:text-sm font-black text-violet-200">
            {currentPose.title} <span className="text-slate-400 font-normal">({currentPose.hint})</span>
          </span>
        </div>

        {/* Camera Frame Box */}
        <div className="relative w-full max-w-2xl aspect-[4/3] rounded-3xl overflow-hidden glass-panel border-2 border-white/25 shadow-2xl bg-black flex items-center justify-center p-2">
          {/* Live Video Element */}
          {!isMockCamera ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover rounded-2xl transition-transform ${isMirrored ? 'scale-x-[-1]' : ''}`}
            />
          ) : (
            /* Mock Camera Animated Portrait View */
            <div className="relative w-full h-full bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex flex-col items-center justify-center p-8 text-center rounded-2xl">
              <div className="w-36 h-36 rounded-full bg-gradient-to-tr from-pink-500 to-violet-500 p-1 mb-5 shadow-2xl shadow-pink-500/30 animate-pulse">
                <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-6xl">
                  {currentPose.emoji}
                </div>
              </div>
              <h4 className="font-display font-black text-white text-2xl mb-1">Simulated Studio Camera</h4>
              <p className="text-slate-400 text-xs sm:text-sm max-w-xs leading-relaxed">
                Click &ldquo;Snap Photo&rdquo; below to trigger countdown for photo #{currentSlotNumber}.
              </p>
            </div>
          )}

          {/* Camera Viewfinder Corners */}
          <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-white/70 pointer-events-none"></div>
          <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-white/70 pointer-events-none"></div>
          <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-white/70 pointer-events-none"></div>
          <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-white/70 pointer-events-none"></div>

          {/* Center Crosshair */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
            <div className="w-10 h-10 border border-white rounded-full"></div>
          </div>

          {/* Big Countdown Overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px] flex items-center justify-center z-30 pointer-events-none">
              <div className="w-40 h-40 rounded-full bg-gradient-to-tr from-violet-600 via-pink-500 to-amber-400 p-[4px] shadow-2xl shadow-pink-500/50">
                <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center animate-count-pop">
                  <span className="font-display font-black text-8xl bg-gradient-to-r from-pink-400 via-violet-300 to-amber-200 bg-clip-text text-transparent">
                    {countdown}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Shutter & Completed Photos Gallery Drawer */}
      <div className="mx-auto w-full z-10 flex flex-col sm:flex-row items-center justify-between gap-6 p-8 rounded-3xl glass-panel border border-white/20 shadow-2xl">
        {/* Completed Photos Previews */}
        <div className="flex items-center gap-3.5">
          {Array.from({ length: totalSlots }).map((_, idx) => {
            const photo = capturedPhotos[idx];
            const isCurrent = idx === currentSlotIndex;

            return (
              <div
                key={idx}
                className={`relative w-18 h-18 rounded-2xl overflow-hidden border-2 transition-all p-0.5 ${isCurrent
                  ? 'border-pink-500 ring-4 ring-pink-500/30 scale-105 shadow-xl'
                  : photo
                    ? 'border-emerald-500/80 bg-slate-800 shadow-md'
                    : 'border-white/15 bg-slate-900/80'
                  }`}
              >
                {photo ? (
                  <>
                    <img src={photo} alt={`Snap ${idx + 1}`} className="w-full h-full object-cover rounded-xl" />
                    <div className="absolute bottom-0 right-0 bg-emerald-500 text-slate-950 p-1 rounded-tl-lg shadow">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-black text-slate-500">
                    #{idx + 1}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Big Shutter Button */}
        <button
          onClick={startCountdown}
          disabled={isCounting}
          className="group relative inline-flex items-center justify-center gap-3.5 px-12 py-5 rounded-full btn-primary text-lg font-display font-black shadow-2xl transition-all disabled:opacity-50 min-w-[280px] cursor-pointer hover:scale-105"
        >
          <Camera className="w-6 h-6 group-hover:rotate-12 transition-transform stroke-[2.5]" />
          <span>
            {isCounting
              ? `READY... ${countdown || ''}`
              : retakeSingleSlot
              ? `SNAP RETAKE #${currentSlotNumber}`
              : `SNAP PHOTO #${currentSlotNumber}`}
          </span>
        </button>
      </div>
    </div>
  );
}
