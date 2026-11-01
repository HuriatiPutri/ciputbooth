import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { soundManager } from '../utils/audio';
import { generateComposite, generateLiveCompositeVideo } from '../utils/canvasRenderer';

const BoothContext = createContext(null);

export function BoothProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const getStepFromPath = (path) => {
    if (path === '/') return 'welcome';
    if (path === '/frame-select') return 'frame_select';
    if (path === '/capture') return 'booth_capture';
    if (path === '/customize') return 'customize';
    if (path === '/result') return 'result';
    if (path === '/payment') return 'payment_required';
    if (path.startsWith('/admin')) return 'admin';
    return 'welcome';
  };

  const step = getStepFromPath(location.pathname);

  const setStep = useCallback((newStep) => {
    const search = location.search;
    const eventQuery = searchParams.get('event')
    if (newStep === 'welcome') navigate('/' + (eventQuery ? `?event=${eventQuery}` : ''));
    else if (newStep === 'frame_select') navigate('/frame-select' + search);
    else if (newStep === 'booth_capture') navigate('/capture' + search);
    else if (newStep === 'customize') navigate('/customize' + search);
    else if (newStep === 'result') navigate('/result' + search);
    else if (newStep === 'payment_required') navigate('/payment' + search);
    else if (newStep === 'admin') navigate('/admin');
  }, [navigate, location.search]);

  const [activeEvent, setActiveEvent] = useState(null);
  const [eventError, setEventError] = useState('');
  const [frames, setFrames] = useState([]);
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [capturedLiveClips, setCapturedLiveClips] = useState([]);
  const [currentSlotIndex, setCurrentSlotIndex] = useState(0);
  const [filterId, setFilterId] = useState('normal');
  const [stickers, setStickers] = useState([]);
  const [customText, setCustomText] = useState('');
  const [compositeUrl, setCompositeUrl] = useState('');
  const [liveCompositeUrl, setLiveCompositeUrl] = useState('');
  const [previewMode, setPreviewMode] = useState('photo'); // 'photo' | 'live'
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isMockCamera, setIsMockCamera] = useState(false);
  const [savedSessionId, setSavedSessionId] = useState(null);
  const [savedSessionData, setSavedSessionData] = useState(null);
  const [paymentOrderId, setPaymentOrderId] = useState(null);
  const [settings, setSettings] = useState({
    studioName: 'CIPUTBOOTH',
    countdownSeconds: 3,
    autoPrint: false,
    copiesCount: 1,
    enableStickers: true,
    enableFilters: true,
    printLayout: '2x6'
  });

  // Fetch settings from backend API
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings/public');
      const data = await res.json();
      if (data.success && data.data) {
        setSettings((prev) => ({ ...prev, ...data.data }));
      }
    } catch (err) {
      console.warn('Failed to load settings:', err);
    }
  };

  // Fetch active frames from backend API
  const fetchActiveFrames = async () => {
    // An event pins the kiosk to its own frames.
    if (activeEvent) {
      setFrames(activeEvent.frames);
      return;
    }
    try {
      setIsLoading(true);
      const res = await fetch('/api/frames/public?active=true');
      const data = await res.json();
      if (data.success && data.data) {
        setFrames(data.data);
        if (!selectedFrame && data.data.length > 0) {
          setSelectedFrame(data.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch frames:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveFrames();
    // Only fetch auth-required settings if in admin mode, else use event settings
    if (location.pathname.startsWith('/admin')) {
      fetchSettings();
    }
  }, [location.pathname]);

  const [isEventLoading, setIsEventLoading] = useState(true);

  // Kiosk link: /?event=<id> locks this booth to one event's frames, flow and payment type.
  useEffect(() => {
    const eventId = searchParams.get('event');
    const transactionStatus = searchParams.get('transaction_status');

    if (!eventId) {
      setIsEventLoading(false);
      return;
    }

    fetch(`/api/events/${encodeURIComponent(eventId)}/kiosk`)
      .then((res) => res.json())
      .then((body) => {
        if (!body.success) throw new Error(body.message || 'Event not available');
        const eventData = body.data;
        setActiveEvent(eventData);
        setFrames(eventData.frames);
        
        if (eventData.frames && eventData.frames.length === 1) {
          setSelectedFrame(eventData.frames[0]);
        } else if (eventData.photo_flow === 'default_frame' && eventData.default_frame_id) {
          const defFrame = eventData.frames?.find((f) => f.id === eventData.default_frame_id) || eventData.frames?.[0];
          if (defFrame) setSelectedFrame(defFrame);
        }

        if (eventData.settings) {
          setSettings((prev) => ({ ...prev, ...eventData.settings }));
        }

        // Handle Midtrans redirect logic
        const midtransOrderId = searchParams.get('order_id');
        const checkPayment = async () => {
          let paymentVerified = false;

          if (midtransOrderId) {
            try {
              const res = await fetch(`/api/payments/status/${midtransOrderId}`);
              const result = await res.json();
              if (result.success && result.data) {
                const status = result.data.transaction_status;
                if (status === 'settlement' || status === 'capture') {
                  paymentVerified = true;
                  setPaymentOrderId(midtransOrderId);
                }
              }
            } catch (err) {
              console.error('Failed to verify payment', err);
            }
          }

          // Clean up the URL using React Router to prevent state bugs
          searchParams.delete('transaction_status');
          searchParams.delete('status_code');
          searchParams.delete('order_id');
          searchParams.delete('gross_amount');
          searchParams.delete('payment_type');
          searchParams.delete('signature_key');
          searchParams.delete('fraud_status');
          setSearchParams(searchParams, { replace: true });

          if (paymentVerified) {
            if (eventData.photo_flow === 'default_frame') {
              setSelectedFrame(eventData.frames[0]);
              setStep('booth_capture');
            } else {
              setStep('frame_select');
            }
          } else {
            setSelectedFrame(eventData.frames[0]);
          }
        };

        checkPayment();
      })
      .catch((err) => setEventError(err.message))
      .finally(() => setIsEventLoading(false));
  }, []); // Run exactly once on mount

  const updateBoothSettings = (newSettings) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    if (newSettings.studioName) {
      setCustomText(newSettings.studioName.toUpperCase());
    }
  };

  useEffect(() => {
    soundManager.enabled = !isMuted;
  }, [isMuted]);

  const [retakeSingleSlot, setRetakeSingleSlot] = useState(false);

  // Navigate to frame selection
  const startSession = () => {
    soundManager.playClick();
    setRetakeSingleSlot(false);
    setCapturedPhotos([]);
    setCapturedLiveClips([]);
    setCurrentSlotIndex(0);
    setFilterId('normal');
    setStickers([]);
    setCompositeUrl('');
    setLiveCompositeUrl('');
    setPreviewMode('photo');
    setSavedSessionId(null);
    setSavedSessionData(null);
    fetchActiveFrames();

    const eventFrames = activeEvent?.frames || frames || [];
    const isSingleFrame = eventFrames.length === 1 || activeEvent?.photo_flow === 'default_frame';
    const frameToUse = (activeEvent?.default_frame_id ? eventFrames.find((f) => f.id === activeEvent.default_frame_id) : null) || eventFrames[0];

    if (isSingleFrame && frameToUse) {
      setSelectedFrame(frameToUse);
    }

    if (activeEvent?.payment_type === 'paid') {
      setStep('payment_required');
    } else if (isSingleFrame && frameToUse) {
      setStep('booth_capture');
    } else {
      setStep('frame_select');
    }
  };

  // Choose frame
  const chooseFrame = (frame) => {
    soundManager.playClick();
    setSelectedFrame(frame);
  };

  // Confirm frame & proceed to camera
  const confirmFrame = () => {
    if (!selectedFrame) return;
    soundManager.playClick();
    setRetakeSingleSlot(false);
    setCapturedPhotos([]);
    setCapturedLiveClips([]);
    setLiveCompositeUrl('');
    setCurrentSlotIndex(0);
    setStep('booth_capture');
  };

  // Add captured photo and optional live video clip
  const addCapturedPhoto = (photoDataUrl, liveClipUrl = null) => {
    const updatedPhotos = [...capturedPhotos];
    updatedPhotos[currentSlotIndex] = photoDataUrl;
    setCapturedPhotos(updatedPhotos);

    if (liveClipUrl) {
      const updatedClips = [...capturedLiveClips];
      updatedClips[currentSlotIndex] = liveClipUrl;
      setCapturedLiveClips(updatedClips);
    }

    // If retaking a single selected slot, return immediately to customize screen
    if (retakeSingleSlot) {
      setRetakeSingleSlot(false);
      soundManager.playSuccess();
      setStep('customize');
      return;
    }

    // Calculate total required capture shots (e.g. if 6 slots but mapped to 3 photos, total shots is 3)
    const slots = selectedFrame?.photo_slots || [];
    const totalRequiredPhotos = slots.length > 0
      ? Math.max(...slots.map((s, idx) => Number(s.photo_index || s.order || (idx + 1))))
      : 3;

    if (currentSlotIndex + 1 < totalRequiredPhotos) {
      setCurrentSlotIndex(currentSlotIndex + 1);
    } else {
      // Completed all snaps! Proceed to customization
      soundManager.playSuccess();
      setStep('customize');
    }
  };

  // Retake a specific photo slot
  const retakeSlot = (index) => {
    soundManager.playClick();
    setRetakeSingleSlot(true);
    setCurrentSlotIndex(index);
    setStep('booth_capture');
  };

  // Retake all photos
  const retakeAllPhotos = () => {
    soundManager.playClick();
    setRetakeSingleSlot(false);
    setCapturedPhotos([]);
    setCapturedLiveClips([]);
    setLiveCompositeUrl('');
    setCurrentSlotIndex(0);
    setStep('booth_capture');
  };

  // Change filter
  const selectFilter = (id) => {
    soundManager.playClick();
    setFilterId(id);
  };

  // Sticker actions
  const addSticker = (emoji) => {
    soundManager.playClick();
    const newSticker = {
      id: Date.now() + Math.random(),
      emoji,
      x: 30 + Math.random() * 40,
      y: 30 + Math.random() * 40,
      size: 70,
      rotation: Math.floor(Math.random() * 40 - 20)
    };
    setStickers([...stickers, newSticker]);
  };

  const removeSticker = (id) => {
    soundManager.playClick();
    setStickers(stickers.filter((s) => s.id !== id));
  };

  // Build final composite and save session
  const processAndFinishSession = async () => {
    if (!selectedFrame) return;
    try {
      setIsLoading(true);

      // 1. Generate regular still composite
      const finalImageBase64 = await generateComposite({
        frame: selectedFrame,
        photos: capturedPhotos,
        filterId,
        stickers,
        customText
      });

      setCompositeUrl(finalImageBase64);

      // 2. Generate live motion composite video if live picture is enabled and live clips exist
      let liveCompositeBase64 = '';
      if (isLivePictureEnabled && capturedLiveClips && capturedLiveClips.length > 0) {
        try {
          liveCompositeBase64 = await generateLiveCompositeVideo({
            frame: selectedFrame,
            liveClips: capturedLiveClips,
            photos: capturedPhotos,
            filterId,
            stickers,
            customText
          });
          setLiveCompositeUrl(liveCompositeBase64);
        } catch (liveErr) {
          console.warn('Could not generate live composite video:', liveErr);
        }
      }

      // 3. Save session to backend
      try {
        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: activeEvent?.id || null,
            frame_id: selectedFrame.id,
            frame_name: selectedFrame.name,
            composite_base64: finalImageBase64,
            live_composite_base64: isLivePictureEnabled ? liveCompositeBase64 : null,
            photos: capturedPhotos,
            live_clips: isLivePictureEnabled ? capturedLiveClips : [],
            filter_applied: filterId,
            copies: 1,
            order_id: paymentOrderId
          })
        });
        const resData = await response.json();
        if (resData.success && resData.data) {
          setSavedSessionId(resData.data.id);
          setSavedSessionData(resData.data);
          if (resData.data.live_photo_url && !liveCompositeBase64) {
            setLiveCompositeUrl(resData.data.live_photo_url);
          }
        }
      } catch (err) {
        console.warn('Could not save session to backend:', err);
      }

      soundManager.playSuccess();
      setStep('result');
    } catch (err) {
      console.error('Error generating final composite:', err);
      alert('Failed to process final image: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset everything to welcome screen
  const resetToWelcome = useCallback(() => {
    soundManager.playClick();
    setStep('welcome');
    setCapturedPhotos([]);
    setCapturedLiveClips([]);
    setCurrentSlotIndex(0);
    setStickers([]);
    setCustomText('');
    setCompositeUrl('');
    setLiveCompositeUrl('');
    setPreviewMode('photo');
    setSavedSessionId(null);
    setSavedSessionData(null);
  }, [setStep]);

  const isLivePictureEnabled = activeEvent ? activeEvent.enable_live_picture !== false : true;

  return (
    <BoothContext.Provider
      value={{
        step,
        setStep,
        activeEvent,
        isLivePictureEnabled,
        eventError,
        frames,
        fetchActiveFrames,
        selectedFrame,
        chooseFrame,
        confirmFrame,
        capturedPhotos,
        capturedLiveClips,
        currentSlotIndex,
        setCurrentSlotIndex,
        addCapturedPhoto,
        retakeSlot,
        retakeAllPhotos,
        filterId,
        selectFilter,
        stickers,
        addSticker,
        removeSticker,
        customText,
        setCustomText,
        compositeUrl,
        liveCompositeUrl,
        setLiveCompositeUrl,
        previewMode,
        setPreviewMode,
        processAndFinishSession,
        resetToWelcome,
        startSession,
        isLoading,
        isEventLoading,
        isMuted,
        setIsMuted,
        isMockCamera,
        setIsMockCamera,
        savedSessionId,
        savedSessionData,
        settings,
        fetchSettings,
        updateBoothSettings,
        retakeSingleSlot,
        setRetakeSingleSlot
      }}
    >
      {children}
    </BoothContext.Provider>
  );
}

export function useBooth() {
  const context = useContext(BoothContext);
  if (!context) {
    throw new Error('useBooth must be used within a BoothProvider');
  }
  return context;
}
