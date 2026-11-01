import React, { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCw, Sparkles, FlipHorizontal, ArrowLeft, Check, Video, Smile } from 'lucide-react';
import { useBooth } from '../../context/BoothContext';
import { soundManager } from '../../utils/audio';
import { generateMockPhoto, generateMockLiveClip, getSupportedVideoMimeType } from '../../utils/canvasRenderer';
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
    setRetakeSingleSlot,
    isLivePictureEnabled,
    activeEvent,
    frames,
    resetToWelcome
  } = useBooth();

  const eventFrames = activeEvent?.frames || frames || [];
  const hasOnlySingleFrame = eventFrames.length === 1 || activeEvent?.photo_flow === 'default_frame';

  const slots = selectedFrame?.photo_slots || [];
  const totalSlots = slots.length > 0
    ? Math.max(...slots.map((s, idx) => Number(s.photo_index || s.order || (idx + 1))))
    : 3;
  const currentSlotNumber = currentSlotIndex + 1;

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

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

  // Start recording user movement during countdown for Live Picture
  const startMotionRecording = () => {
    try {
      if (!isLivePictureEnabled || isMockCamera || !videoRef.current || !videoRef.current.srcObject) {
        return;
      }
      const stream = videoRef.current.srcObject;
      recordedChunksRef.current = [];
      const mimeType = getSupportedVideoMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };
      recorder.start(100);
      mediaRecorderRef.current = recorder;
    } catch (err) {
      console.warn('Could not start live motion recording:', err);
    }
  };

  // Stop motion recording and retrieve Data URL
  const stopMotionRecording = () => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(null);
        return;
      }
      mediaRecorderRef.current.onstop = () => {
        try {
          const mime = mediaRecorderRef.current?.mimeType || 'video/webm';
          const blob = new Blob(recordedChunksRef.current, { type: mime });
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        } catch (e) {
          console.warn('Live clip blob error:', e);
          resolve(null);
        }
      };
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        resolve(null);
      }
    });
  };

  const countdownTimerRef = useRef(null);
  const autoNextTimeoutRef = useRef(null);

  // Auto start countdown when camera stream is active and not already counting
  useEffect(() => {
    if (!streamActive) return;

    // Small delay (1000ms) to let user see previous captured snap and prepare posture
    const prepTimer = setTimeout(() => {
      startCountdown();
    }, 1000);

    return () => clearTimeout(prepTimer);
  }, [streamActive, currentSlotIndex]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (autoNextTimeoutRef.current) clearTimeout(autoNextTimeoutRef.current);
    };
  }, []);

  // Handle countdown and photo snapping
  const startCountdown = () => {
    if (countdownTimerRef.current) return;
    setIsCounting(true);
    let count = Number(settings?.countdownSeconds) || 3;
    setCountdown(count);
    soundManager.playCountdownTick();

    // Start recording user movement for Live Picture
    startMotionRecording();

    countdownTimerRef.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        soundManager.playCountdownTick();
      } else {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setCountdown(null);
        capturePhoto();
      }
    }, 1000);
  };

  // Capture frame from video or mock generator and finalize live clip
  const capturePhoto = async () => {
    setIsFlashing(true);
    soundManager.playCaptureShutter();

    // Stop recorder and collect live movement clip if enabled
    const liveClipPromise = !isLivePictureEnabled
      ? Promise.resolve(null)
      : (isMockCamera || cameraError
        ? generateMockLiveClip(currentSlotNumber)
        : stopMotionRecording());

    setTimeout(() => {
      setIsFlashing(false);
      setIsCounting(false);
    }, 350);

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

    const liveClipUrl = await liveClipPromise;
    // Release counting state before advancing to next slot to ensure next auto-countdown triggers cleanly
    setIsCounting(false);
    addCapturedPhoto(photoDataUrl, liveClipUrl);
  };

  const currentPose = POSE_SUGGESTIONS[(currentSlotNumber - 1) % POSE_SUGGESTIONS.length];

  return (
    <div className="w-full h-full flex flex-col justify-between p-3 sm:p-5 lg:p-6 bg-slate-950 overflow-hidden relative">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Screen flash whiteout */}
      {isFlashing && (
        <div className="fixed inset-0 z-50 bg-white camera-flash-overlay pointer-events-none" />
      )}

      {/* Top Header Bar */}
      <div className="mx-auto w-full flex items-center justify-between z-10 flex-shrink-0">
        <Button
          variant="secondary"
          size="sm"
          leftIcon={ArrowLeft}
          onClick={() => {
            if (retakeSingleSlot) {
              setRetakeSingleSlot(false);
              setStep('customize');
            } else if (hasOnlySingleFrame) {
              resetToWelcome();
            } else {
              setStep('frame_select');
            }
          }}
          disabled={isCounting}
          className="rounded-full text-xs py-1.5 px-3 sm:px-4"
        >
          {retakeSingleSlot ? 'Cancel' : hasOnlySingleFrame ? 'Exit' : 'Change Frame'}
        </Button>

        {/* Slot Progress Pill */}
        <div className="flex items-center gap-2 sm:gap-3 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 py-1.5 sm:py-2.5 rounded-full border border-white/15 shadow-xl">
          <Camera className="w-4 h-4 text-pink-400 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
            {retakeSingleSlot ? `Retake #${currentSlotNumber}` : `Shot ${currentSlotNumber} / ${totalSlots}`}
          </span>
          <div className="flex items-center gap-1.5 ml-1">
            {Array.from({ length: totalSlots }).map((_, idx) => (
              <div
                key={idx}
                className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all ${
                  idx < currentSlotIndex
                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                    : idx === currentSlotIndex
                    ? 'bg-pink-500 scale-125 ring-2 ring-pink-400/40 animate-pulse'
                    : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Camera Mirror Toggle */}
        <Button
          variant="secondary"
          size="sm"
          leftIcon={FlipHorizontal}
          onClick={() => setIsMirrored(!isMirrored)}
          className="rounded-full text-xs py-1.5 px-3 sm:px-4"
        >
          <span className="hidden xs:inline">{isMirrored ? 'Mirrored' : 'Normal'}</span>
        </Button>
      </div>

      {/* Main Center Viewport: Camera Feed + Guides */}
      <div className="relative w-full mx-auto my-auto z-10 flex flex-col items-center flex-1 justify-center min-h-0 py-2">
        {/* Pose Suggestion Alert */}
        <div className="mb-2 sm:mb-3 inline-flex items-center gap-2 px-4 sm:px-6 py-1.5 rounded-full bg-violet-950/80 border border-violet-500/40 backdrop-blur-md shadow-xl animate-bounce flex-shrink-0">
          <span className="text-base sm:text-lg">{currentPose.emoji}</span>
          <span className="text-[11px] sm:text-xs font-black text-violet-200">
            {currentPose.title} <span className="text-slate-400 font-normal">({currentPose.hint})</span>
          </span>
        </div>

        {/* Camera Frame Box with responsive max-height */}
        <div className="relative w-full max-w-xl aspect-[4/3] max-h-[45vh] sm:max-h-[50vh] lg:max-h-[55vh] rounded-2xl sm:rounded-3xl overflow-hidden glass-panel border-2 border-white/25 shadow-2xl bg-black flex items-center justify-center p-1.5 sm:p-2">
          {/* Live Video Element */}
          {!isMockCamera ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover rounded-xl sm:rounded-2xl transition-transform ${isMirrored ? 'scale-x-[-1]' : ''}`}
            />
          ) : (
            /* Mock Camera Animated Portrait View */
            <div className="relative w-full h-full bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex flex-col items-center justify-center p-4 text-center rounded-xl sm:rounded-2xl">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-pink-500 to-violet-500 p-1 mb-2 shadow-2xl shadow-pink-500/30 animate-pulse">
                <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-4xl sm:text-5xl">
                  {currentPose.emoji}
                </div>
              </div>
              <h4 className="font-display font-black text-white text-base sm:text-lg mb-0.5">Simulated Studio Camera</h4>
              <p className="text-slate-400 text-[11px] max-w-xs leading-tight">
                Automatic countdown in progress for photo #{currentSlotNumber}.
              </p>
            </div>
          )}

          {/* Camera Viewfinder Corners */}
          <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-white/70 pointer-events-none"></div>
          <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-white/70 pointer-events-none"></div>
          <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-white/70 pointer-events-none"></div>
          <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-white/70 pointer-events-none"></div>

          {/* Center Crosshair */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
            <div className="w-8 h-8 border border-white rounded-full"></div>
          </div>

          {/* REC Motion Live Picture Indicator */}
          {isLivePictureEnabled && countdown !== null && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-rose-600/90 backdrop-blur-md px-3 py-1 rounded-full text-white text-[11px] font-black shadow-xl border border-white/20 animate-pulse pointer-events-none">
              <div className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span className="tracking-wider uppercase">REC LIVE MOTION</span>
            </div>
          )}

          {/* Big Countdown Overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px] flex items-center justify-center z-30 pointer-events-none">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-violet-600 via-pink-500 to-amber-400 p-[3px] shadow-2xl shadow-pink-500/50">
                <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center animate-count-pop">
                  <span className="font-display font-black text-6xl sm:text-7xl bg-gradient-to-r from-pink-400 via-violet-300 to-amber-200 bg-clip-text text-transparent">
                    {countdown}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Shutter & Completed Photos Gallery Drawer */}
      <div className="mx-auto w-full z-10 flex flex-row items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl sm:rounded-3xl glass-panel border border-white/20 shadow-xl flex-shrink-0">
        {/* Completed Photos Previews */}
        <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar">
          {Array.from({ length: totalSlots }).map((_, idx) => {
            const photo = capturedPhotos[idx];
            const isCurrent = idx === currentSlotIndex;

            return (
              <div
                key={idx}
                className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 transition-all p-0.5 flex-shrink-0 ${isCurrent
                  ? 'border-pink-500 ring-2 ring-pink-500/30 scale-105 shadow-xl'
                  : photo
                    ? 'border-emerald-500/80 bg-slate-800 shadow-md'
                    : 'border-white/15 bg-slate-900/80'
                  }`}
              >
                {photo ? (
                  <>
                    <img src={photo} alt={`Snap ${idx + 1}`} className="w-full h-full object-cover rounded-lg" />
                    <div className="absolute bottom-0 right-0 bg-emerald-500 text-slate-950 p-0.5 rounded-tl-md shadow">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-slate-500">
                    #{idx + 1}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Shutter / Auto-Capture Status Indicator */}
        <button
          onClick={startCountdown}
          disabled={isCounting}
          className="group relative inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:px-8 sm:py-3.5 rounded-full btn-primary text-xs sm:text-sm font-display font-black shadow-xl transition-all disabled:opacity-50 flex-shrink-0 cursor-pointer hover:scale-105"
        >
          <Camera className="w-4 h-4 group-hover:rotate-12 transition-transform stroke-[2.5]" />
          <span>
            {isCounting
              ? `READY... ${countdown || ''}`
              : `AUTO SNAPPING #${currentSlotNumber}`}
          </span>
        </button>
      </div>
    </div>
  );
}
