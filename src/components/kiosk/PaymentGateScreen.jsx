import React, { useState, useEffect, useRef } from 'react';
import { Wallet, Loader2, CreditCard } from 'lucide-react';
import { useBooth } from '../../context/BoothContext';
import { Button } from '../common';

export default function PaymentGateScreen() {
  const { activeEvent, resetToWelcome, setStep } = useBooth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    // Dynamically load Midtrans Snap script
    const script = document.createElement('script');
    const isProduction = import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === 'true';
    script.src = isProduction 
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js';
    
    script.setAttribute('data-client-key', import.meta.env.VITE_MIDTRANS_CLIENT_KEY || 'SB-Mid-client-YOUR_CLIENT_KEY');
    
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setError('Failed to load payment system. Please check your connection.');
    
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const proceedToNextStep = () => {
    if (activeEvent.photo_flow === 'default_frame') {
      setStep('booth_capture');
    } else {
      setStep('frame_select');
    }
  };

  const startPolling = (currentOrderId) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/status/${currentOrderId}`);
        const result = await res.json();
        if (result.success && result.data) {
          const status = result.data.transaction_status;
          if (status === 'settlement' || status === 'capture') {
            clearInterval(pollIntervalRef.current);
            window.snap.hide(); // Close snap popup if it's still open
            proceedToNextStep();
          } else if (status === 'deny' || status === 'cancel' || status === 'expire') {
            clearInterval(pollIntervalRef.current);
            window.snap.hide();
            setError('Payment ' + status + '. Please try again.');
            setLoading(false);
            setOrderId(null);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000); // Check every 3 seconds
  };

  const handlePay = async () => {
    if (!scriptLoaded) {
      setError('Payment system is still loading...');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Create return URL that includes the event ID so we don't lose the kiosk context
      // We'll append an extra parameter so BoothContext knows it's a redirect
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('transaction_status', 'settlement');
      
      const response = await fetch('/api/payments/create-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          eventId: activeEvent.id,
          returnUrl: currentUrl.toString()
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to initialize payment');
      }

      const snapToken = result.data.token;
      const newOrderId = result.data.order_id;
      setOrderId(newOrderId);
      
      // Start polling for this order
      startPolling(newOrderId);

      window.snap.pay(snapToken, {
        onSuccess: function (result) {
          console.log('Payment success:', result);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          window.snap.hide();
          proceedToNextStep();
        },
        onPending: function (result) {
          console.log('Payment pending:', result);
          // Don't set error, let the polling continue
        },
        onError: function (result) {
          console.log('Payment error:', result);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setError('Payment failed. Please try again.');
          setLoading(false);
          setOrderId(null);
        },
        onClose: function () {
          console.log('Customer closed the popup');
          // We keep polling even if closed, in case they pay via ATM/Ovo later
          // But allow them to try again if they want
          setLoading(false);
        }
      });
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred during payment initialization.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className="glass-panel rounded-3xl border border-white/15 p-10 max-w-md w-full text-center flex flex-col items-center gap-6">
        <div className="p-5 rounded-2xl bg-gradient-to-tr from-violet-600 to-pink-600 text-white shadow-xl">
          <Wallet className="w-8 h-8" />
        </div>
        
        <div className="flex flex-col gap-2">
          <h2 className="font-display font-black text-2xl text-white">
            {orderId ? 'Waiting for Payment...' : 'Payment Required'}
          </h2>
          <p className="text-sm text-slate-300">
            {activeEvent?.event_name} charges Rp {Number(activeEvent?.price_per_photo || 0).toLocaleString('id-ID')} per photo session.
          </p>
        </div>

        {error && (
          <div className="w-full p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="w-full flex flex-col gap-3 mt-2">
          {!orderId ? (
            <Button 
              variant="primary" 
              size="lg" 
              className="w-full justify-center"
              onClick={handlePay}
              disabled={loading || !scriptLoaded}
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
              ) : (
                <><CreditCard className="w-5 h-5" /> Pay Rp {Number(activeEvent?.price_per_photo || 0).toLocaleString('id-ID')}</>
              )}
            </Button>
          ) : (
            <div className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-xl border border-white/10">
              <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
              <p className="text-sm text-slate-300">Please complete the payment in the popup or your app.</p>
              <Button 
                variant="secondary" 
                size="sm" 
                className="mt-2 text-xs" 
                onClick={() => setOrderId(null)}
              >
                Change Payment Method
              </Button>
            </div>
          )}
          
          <Button variant="secondary" size="lg" className="w-full justify-center" onClick={resetToWelcome}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
