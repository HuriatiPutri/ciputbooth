import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  CloudCheck, 
  Upload, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  ShieldCheck, 
  Clock, 
  Globe, 
  FolderCheck,
  FileJson,
  Eye,
  EyeOff,
  RefreshCw,
  Lock,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  Check,
  HelpCircle,
  FolderPlus
} from 'lucide-react';
import { Button } from '../common';
import { useAuth } from '../../context/AuthContext';

export default function GoogleDriveSettings() {
  const { authFetch } = useAuth();
  const [authMode, setAuthMode] = useState('oauth2'); // 'oauth2' | 'service_account'
  const [config, setConfig] = useState({
    googleDriveEnabled: false,
    googleDriveClientEmail: '',
    googleDrivePrivateKey: '',
    googleDriveProjectId: '',
    googleDriveFolderId: '',
    googleDriveRootName: 'Photobooth',
    qrExpiryHours: 48,
    publicShareDomain: '',
    // OAuth 2.0 User fields (for personal @gmail.com)
    googleDriveClientId: '',
    googleDriveClientSecret: '',
    googleDriveRefreshToken: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [guideTab, setGuideTab] = useState('oauth2'); // 'oauth2' | 'service_account'
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPlaygroundUri, setCopiedPlaygroundUri] = useState(false);

  const copyToClipboard = (text, type = 'email') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'email') {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2500);
    } else {
      setCopiedPlaygroundUri(true);
      setTimeout(() => setCopiedPlaygroundUri(false), 2500);
    }
  };

  // Load active settings
  useEffect(() => {
    setIsLoading(true);
    authFetch('/api/settings')
      .then((data) => {
        if (data) {
          const hasOAuth = Boolean(data.googleDriveRefreshToken && data.googleDriveClientId);
          if (hasOAuth) {
            setAuthMode('oauth2');
            setGuideTab('oauth2');
          } else if (data.googleDriveClientEmail) {
            setAuthMode('service_account');
            setGuideTab('service_account');
          }

          setConfig((prev) => ({
            ...prev,
            googleDriveEnabled: Boolean(data.googleDriveEnabled),
            googleDriveClientEmail: data.googleDriveClientEmail || '',
            googleDrivePrivateKey: data.googleDrivePrivateKey || '',
            googleDriveProjectId: data.googleDriveProjectId || '',
            googleDriveFolderId: data.googleDriveFolderId || '',
            googleDriveRootName: data.googleDriveRootName || 'Photobooth',
            qrExpiryHours: data.qrExpiryHours || 48,
            publicShareDomain: data.publicShareDomain || '',
            googleDriveClientId: data.googleDriveClientId || '',
            googleDriveClientSecret: data.googleDriveClientSecret || '',
            googleDriveRefreshToken: data.googleDriveRefreshToken || ''
          }));
        }
      })
      .catch((err) => console.error('Failed to load Google Drive settings:', err))
      .finally(() => setIsLoading(false));
  }, []);

  // Handle JSON Service Account Key file upload
  const handleJsonUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result);
        if (parsed.client_email && parsed.private_key) {
          setConfig((prev) => ({
            ...prev,
            googleDriveEnabled: true,
            googleDriveClientEmail: parsed.client_email,
            googleDrivePrivateKey: parsed.private_key,
            googleDriveProjectId: parsed.project_id || prev.googleDriveProjectId
          }));
          setTestResult({
            type: 'success',
            message: `Service Account JSON loaded for ${parsed.client_email}! Click "Test Connection" to verify.`
          });
        } else {
          setTestResult({
            type: 'error',
            message: 'Invalid Google Service Account JSON. Ensure "client_email" and "private_key" are present.'
          });
        }
      } catch (err) {
        setTestResult({
          type: 'error',
          message: 'Could not parse JSON file: ' + err.message
        });
      }
    };
    reader.readAsText(file);
  };

  // Test connection to Google Drive API
  const handleTestConnection = async () => {
    if (authMode === 'oauth2') {
      if (!config.googleDriveRefreshToken?.trim() || !config.googleDriveClientId?.trim() || !config.googleDriveClientSecret?.trim()) {
        setTestResult({
          type: 'error',
          message: 'Mohon lengkapi Client ID, Client Secret, dan Refresh Token OAuth 2.0 terlebih dahulu.'
        });
        return;
      }
    } else {
      if (!config.googleDriveClientEmail?.trim() || !config.googleDrivePrivateKey?.trim()) {
        setTestResult({
          type: 'error',
          message: 'Mohon isi Service Account Client Email dan Private Key terlebih dahulu.'
        });
        return;
      }
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const payload = {
        googleDriveRefreshToken: config.googleDriveRefreshToken?.trim() || '',
        googleDriveClientId: config.googleDriveClientId?.trim() || '',
        googleDriveClientSecret: config.googleDriveClientSecret?.trim() || '',
        googleDriveClientEmail: config.googleDriveClientEmail?.trim() || '',
        googleDrivePrivateKey: config.googleDrivePrivateKey?.trim() || '',
        googleDriveProjectId: config.googleDriveProjectId?.trim() || ''
      };

      const res = await authFetch('/api/drive/test-connection', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const userEmail = res?.user?.email || config.googleDriveClientEmail || 'Google Drive User';
      setTestResult({
        type: 'success',
        message: `Koneksi berhasil! Terhubung ke Google Drive API sebagai ${userEmail}`
      });
    } catch (err) {
      setTestResult({
        type: 'error',
        message: err.message || 'Gagal terhubung ke Google Drive API'
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Save settings
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await authFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(config)
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-black text-xl text-white">Google Drive Cloud Storage & Privacy</h3>
            <p className="text-slate-400 text-xs sm:text-sm">
              Private cloud backup, zero-trust photo proxy, and unique customer QR codes
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={handleTestConnection}
          disabled={
            isTesting ||
            (authMode === 'oauth2'
              ? !config.googleDriveRefreshToken || !config.googleDriveClientId || !config.googleDriveClientSecret
              : !config.googleDriveClientEmail || !config.googleDrivePrivateKey)
          }
          className="flex items-center gap-2 text-xs py-2 px-4 border border-blue-500/30"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isTesting ? 'animate-spin' : ''}`} />
          <span>{isTesting ? 'Testing Connection...' : 'Test Connection'}</span>
        </Button>
      </div>

      {/* Test Result Banner */}
      {testResult && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-semibold border ${
            testResult.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {testResult.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{testResult.message}</span>
        </div>
      )}

      {/* Panduan Setup Google Drive (Collapsible Step-by-Step Guide) */}
      <div className="bg-slate-900/90 border border-blue-500/30 rounded-3xl overflow-hidden shadow-2xl transition">
        {/* Guide Header / Toggle */}
        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-6 sm:p-7 bg-gradient-to-r from-blue-950/40 via-slate-900/40 to-slate-900/40 border-b border-white/10 gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-display font-bold text-base sm:text-lg text-white">
                  Panduan Setup Google Cloud Storage
                </h4>
                <span className="text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
                  Tutorial
                </span>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                Pilih metode sesuai tipe akun Google yang Anda gunakan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Guide Tabs */}
            <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setGuideTab('oauth2')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  guideTab === 'oauth2'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                OAuth 2.0 (@gmail.com)
              </button>
              <button
                type="button"
                onClick={() => setGuideTab('service_account')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  guideTab === 'service_account'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Service Account (Workspace)
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 p-2 rounded-lg bg-blue-500/10 transition cursor-pointer ml-1"
            >
              <span>{showGuide ? 'Tutup' : 'Buka'}</span>
              {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Guide Body */}
        {showGuide && (
          <div className="p-6 sm:p-8 space-y-6 text-sm text-slate-300">
            {guideTab === 'oauth2' ? (
              /* --- PANDUAN OAUTH 2.0 (GMAIL PRIBADI) --- */
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs sm:text-sm text-amber-300 leading-relaxed">
                  <strong>💡 Mengapa OAuth 2.0?</strong> Akun Google Service Account dibatasi kuota 0 byte oleh Google di folder Gmail biasa. Dengan <strong>OAuth 2.0</strong>, foto akan diunggah atas nama akun Gmail Anda sendiri dan menggunakan kuota <strong>15 GB gratis</strong> Anda tanpa kendala!
                </div>

                {/* Step 1 */}
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 font-black text-sm flex items-center justify-center shrink-0 border border-blue-500/40 mt-0.5">
                    1
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white text-sm sm:text-base">
                        Aktifkan Google Drive API & Buka Layar Izin OAuth
                      </span>
                      <a
                        href="https://console.cloud.google.com/apis/credentials/consent"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 underline font-semibold"
                      >
                        Buka OAuth Consent Screen <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-xs sm:text-sm text-slate-400 pl-1">
                      <li>Buka Google Cloud Console &gt; pilih project Anda (misal: <em>Photobooth</em>).</li>
                      <li>Pastikan <strong>Google Drive API</strong> sudah diaktifkan di menu <strong>APIs & Services &gt; Library</strong>.</li>
                      <li>Masuk ke <strong>APIs & Services &gt; OAuth consent screen</strong>.</li>
                      <li>Pilih User Type: <strong>External</strong>, lalu klik <strong>Create</strong>.</li>
                      <li>Isi <strong>App name</strong> (misal: <em>Photobooth</em>) dan <strong>User support email</strong> dengan email Anda.</li>
                      <li>Di bagian <strong>Audience &gt; Test users</strong>, klik <strong>Add Users</strong> dan masukkan email Gmail Anda (misal: <em>{config.googleDriveClientEmail?.includes('@gmail.com') ? config.googleDriveClientEmail : 'putrihuriati7@gmail.com'}</em>) agar diizinkan login. Klik Save.</li>
                    </ol>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 font-black text-sm flex items-center justify-center shrink-0 border border-blue-500/40 mt-0.5">
                    2
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white text-sm sm:text-base">
                        Buat OAuth 2.0 Client ID & Client Secret
                      </span>
                      <a
                        href="https://console.cloud.google.com/apis/credentials"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 underline font-semibold"
                      >
                        Buka Menu Credentials <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-xs sm:text-sm text-slate-400 pl-1">
                      <li>Buka <strong>APIs & Services &gt; Credentials</strong>.</li>
                      <li>Klik <strong>Create Credentials &gt; OAuth client ID</strong>.</li>
                      <li>Pilih Application type: <strong>Web application</strong>.</li>
                      <li>Beri nama (misal: <em>Photobooth Web Client</em>).</li>
                      <li>
                        Di bagian <strong>Authorized redirect URIs</strong>, klik <strong>Add URI</strong> dan tempel URL berikut:
                      </li>
                    </ol>

                    <div className="mt-2 p-2.5 rounded-xl bg-slate-950 border border-blue-500/30 flex items-center justify-between gap-2 max-w-xl">
                      <code className="text-blue-300 font-mono text-xs select-all">
                        https://developers.google.com/oauthplayground
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard('https://developers.google.com/oauthplayground', 'playground')}
                        className="inline-flex items-center gap-1 text-xs font-bold py-1 px-2.5 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition shrink-0"
                      >
                        {copiedPlaygroundUri ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedPlaygroundUri ? 'Tersalin' : 'Salin URI'}</span>
                      </button>
                    </div>

                    <p className="text-xs text-slate-400 mt-1">
                      Klik <strong>Create</strong>. Simpan <strong>Client ID</strong> dan <strong>Client Secret</strong> yang muncul di layar.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-sm flex items-center justify-center shrink-0 border border-emerald-500/40 mt-0.5">
                    3
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white text-sm sm:text-base">
                        Ambil Refresh Token di Google OAuth Playground
                      </span>
                      <a
                        href="https://developers.google.com/oauthplayground"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 underline font-semibold"
                      >
                        Buka OAuth Playground <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-xs sm:text-sm text-slate-400 pl-1">
                      <li>Buka tautan <strong>Google OAuth Playground</strong> di atas.</li>
                      <li>
                        Klik ikon <strong>⚙️ Gear (Settings)</strong> di pojok kanan atas:
                        <ul className="list-disc list-inside pl-4 text-slate-400 space-y-0.5 mt-0.5">
                          <li>Centang kotak <strong>"Use your own OAuth credentials"</strong>.</li>
                          <li>Tempel <strong>OAuth Client ID</strong> dan <strong>OAuth Client Secret</strong> dari Langkah 2.</li>
                        </ul>
                      </li>
                      <li>
                        Di kolom kiri (<strong>Step 1: Select & authorize APIs</strong>):
                        <ul className="list-disc list-inside pl-4 text-slate-400 space-y-0.5 mt-0.5">
                          <li>Scroll ke bawah, cari <strong>Drive API v3</strong>, centang <code className="text-blue-300">https://www.googleapis.com/auth/drive</code>.</li>
                          <li>Klik tombol biru <strong>Authorize APIs</strong>.</li>
                          <li>Pilih akun Google Anda &gt; klik <em>Continue / Lanjutkan</em> untuk mengizinkan akses.</li>
                        </ul>
                      </li>
                      <li>
                        Di kolom tengah (<strong>Step 2: Exchange authorization code for tokens</strong>):
                        <ul className="list-disc list-inside pl-4 text-slate-400 space-y-0.5 mt-0.5">
                          <li>Klik tombol biru <strong>Exchange authorization code for tokens</strong>.</li>
                          <li>Salin nilai yang ada di kolom <strong>Refresh token</strong> (berawalan <code className="text-emerald-300">1//...</code>).</li>
                        </ul>
                      </li>
                    </ol>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 font-black text-sm flex items-center justify-center shrink-0 border border-blue-500/40 mt-0.5">
                    4
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <span className="font-bold text-white text-sm sm:text-base block">
                      Tempel Kredensial & Uji Koneksi di Formulir Bawah
                    </span>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      Masukkan <strong>Client ID</strong>, <strong>Client Secret</strong>, dan <strong>Refresh Token</strong> ke formulir di bawah, lalu klik tombol <strong>"Test Connection"</strong> di kanan atas dan klik <strong>"Save Cloud Settings"</strong>. Selesai!
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* --- PANDUAN SERVICE ACCOUNT (WORKSPACE) --- */
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-xs sm:text-sm text-blue-300 leading-relaxed">
                  <strong>🏢 Catatan Service Account:</strong> Service Account memiliki kuota 0 byte jika mengunggah ke Google Drive personal biasa. Metode ini ditujukan khusus untuk organisasi yang menggunakan <strong>Drive Bersama (Shared Drives)</strong> di Google Workspace.
                </div>

                {/* Step 1 */}
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 font-black text-sm flex items-center justify-center shrink-0 border border-blue-500/40 mt-0.5">
                    1
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <span className="font-bold text-white text-sm sm:text-base block">
                      Buat Service Account & Download Kunci JSON
                    </span>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      Buka Google Cloud Console &gt; <strong>IAM & Admin &gt; Service Accounts</strong> &gt; buat Service Account baru &gt; buka tab <strong>Keys &gt; Add Key &gt; Create new key (JSON)</strong>. File JSON akan terdownload.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 font-black text-sm flex items-center justify-center shrink-0 border border-amber-500/40 mt-0.5">
                    2
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <span className="font-bold text-white text-sm sm:text-base block">
                      Tambahkan Service Account ke Drive Bersama (Shared Drive)
                    </span>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      Buka Google Drive Google Workspace Anda &gt; menu <strong>Drive Bersama (Shared Drives)</strong> &gt; buat Shared Drive baru &gt; klik <strong>Kelola Anggota</strong> &gt; tambahkan email Service Account Anda sebagai <strong>Pengelola Konten (Content Manager)</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Toggle Enable Google Drive */}
        <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
          <label className="flex items-start gap-4 p-5 sm:p-6 rounded-2xl bg-slate-950/70 border border-white/15 hover:border-blue-500/50 cursor-pointer transition shadow-inner">
            <input
              type="checkbox"
              checked={config.googleDriveEnabled}
              onChange={(e) => setConfig({ ...config, googleDriveEnabled: e.target.checked })}
              className="w-5 h-5 mt-1 rounded text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-sm sm:text-base">
                  Enable Google Drive Automatic Cloud Backup
                </span>
                <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Private Storage
                </span>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                Automatically uploads each customer's session photos to a private folder in Google Drive. Files are kept private with zero public link permissions.
              </p>
            </div>
          </label>
        </div>

        {/* Auth Method Selector */}
        <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="border-b border-white/10 pb-4">
            <span className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              Pilih Metode Autentikasi Google Drive
            </span>
            <p className="text-slate-400 text-xs mt-1">
              Gunakan OAuth 2.0 untuk akun Gmail pribadi agar mendapatkan kuota 15 GB penuh tanpa error quota.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                setAuthMode('oauth2');
                setGuideTab('oauth2');
              }}
              className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-3 ${
                authMode === 'oauth2'
                  ? 'bg-blue-600/15 border-blue-500 text-white shadow-lg'
                  : 'bg-slate-950/60 border-white/10 text-slate-400 hover:border-white/30'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">OAuth 2.0 (User Account)</span>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    Rekomendasi
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Cocok untuk akun pribadi (<strong className="text-slate-200">@gmail.com</strong>). File diunggah menggunakan kuota 15 GB akun Anda sendiri.
                </p>
              </div>
              <div className="text-[11px] font-semibold text-blue-400 flex items-center gap-1">
                {authMode === 'oauth2' ? '✓ Sedang Digunakan' : 'Klik untuk Pilih'}
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode('service_account');
                setGuideTab('service_account');
              }}
              className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-3 ${
                authMode === 'service_account'
                  ? 'bg-blue-600/15 border-blue-500 text-white shadow-lg'
                  : 'bg-slate-950/60 border-white/10 text-slate-400 hover:border-white/30'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">Service Account (JSON Key)</span>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
                    Workspace
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Khusus untuk <strong className="text-slate-200">Drive Bersama (Shared Drives)</strong> Google Workspace. Membutuhkan Service Account JSON.
                </p>
              </div>
              <div className="text-[11px] font-semibold text-blue-400 flex items-center gap-1">
                {authMode === 'service_account' ? '✓ Sedang Digunakan' : 'Klik untuk Pilih'}
              </div>
            </button>
          </div>

          {/* Form Fields: OAuth 2.0 */}
          {authMode === 'oauth2' ? (
            <div className="space-y-5 pt-2 border-t border-white/10">
              <div>
                <label className="text-xs sm:text-sm font-bold text-slate-300 block mb-2">
                  OAuth 2.0 Client ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1234567890-xxx.apps.googleusercontent.com"
                  value={config.googleDriveClientId}
                  onChange={(e) => setConfig({ ...config, googleDriveClientId: e.target.value })}
                  className="w-full bg-slate-950 border border-white/15 px-4 py-3 rounded-2xl text-sm text-white focus:border-blue-500 outline-none shadow-inner"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-300">
                    OAuth 2.0 Client Secret
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowClientSecret(!showClientSecret)}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    {showClientSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showClientSecret ? 'Hide' : 'Show'} Secret</span>
                  </button>
                </div>
                <input
                  type={showClientSecret ? 'text' : 'password'}
                  placeholder="e.g. GOCSPX-xxxxxxxxxxxxxx"
                  value={config.googleDriveClientSecret}
                  onChange={(e) => setConfig({ ...config, googleDriveClientSecret: e.target.value })}
                  className="w-full bg-slate-950 border border-white/15 px-4 py-3 rounded-2xl text-sm text-white focus:border-blue-500 outline-none shadow-inner"
                />
              </div>

              <div>
                <label className="text-xs sm:text-sm font-bold text-slate-300 block mb-2">
                  OAuth 2.0 Refresh Token
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1//04xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={config.googleDriveRefreshToken}
                  onChange={(e) => setConfig({ ...config, googleDriveRefreshToken: e.target.value })}
                  className="w-full bg-slate-950 border border-white/15 px-4 py-3 rounded-2xl text-xs font-mono text-emerald-300 focus:border-blue-500 outline-none shadow-inner"
                />
                <p className="text-slate-400 text-xs mt-1.5">
                  Didapatkan dari Google OAuth Playground (lihat panduan Langkah 3 di atas).
                </p>
              </div>
            </div>
          ) : (
            /* Form Fields: Service Account */
            <div className="space-y-5 pt-2 border-t border-white/10">
              <div className="flex justify-end">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 cursor-pointer py-1.5 px-3 rounded-xl bg-blue-500/10 border border-blue-500/30 transition">
                  <FileJson className="w-3.5 h-3.5" />
                  <span>Import Key (.json)</span>
                  <input type="file" accept=".json" onChange={handleJsonUpload} className="hidden" />
                </label>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-bold text-slate-300 block mb-2">
                  Service Account Client Email
                </label>
                <input
                  type="email"
                  placeholder="e.g. photobooth-sa@your-project.iam.gserviceaccount.com"
                  value={config.googleDriveClientEmail}
                  onChange={(e) => setConfig({ ...config, googleDriveClientEmail: e.target.value })}
                  className="w-full bg-slate-950 border border-white/15 px-4 py-3 rounded-2xl text-sm text-white focus:border-blue-500 outline-none shadow-inner"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-300">
                    Service Account Private Key (PEM format)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    {showPrivateKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPrivateKey ? 'Hide' : 'Show'} Key</span>
                  </button>
                </div>
                <textarea
                  rows={showPrivateKey ? 5 : 2}
                  placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                  value={config.googleDrivePrivateKey}
                  onChange={(e) => setConfig({ ...config, googleDrivePrivateKey: e.target.value })}
                  className="w-full bg-slate-950 border border-white/15 px-4 py-3 rounded-2xl text-xs font-mono text-white focus:border-blue-500 outline-none shadow-inner resize-y"
                />
              </div>

              <div>
                <label className="text-xs sm:text-sm font-bold text-slate-300 block mb-2">
                  Target Shared Drive / Folder ID (Wajib untuk Service Account)
                </label>
                <input
                  type="text"
                  placeholder="ID Shared Drive atau Folder (contoh: 1OL3dP2ySkJ2Os4ljwMyszGB4o7_DLB5n)"
                  value={config.googleDriveFolderId}
                  onChange={(e) => setConfig({ ...config, googleDriveFolderId: e.target.value })}
                  className="w-full bg-slate-950 border border-white/15 px-4 py-3 rounded-2xl text-sm text-white focus:border-blue-500 outline-none shadow-inner"
                />
              </div>
            </div>
          )}

          {/* Common Field: Folder Name */}
          <div className="pt-4 border-t border-white/10">
            <label className="text-xs sm:text-sm font-bold text-slate-300 block mb-2">
              Target Root Folder Name
            </label>
            <input
              type="text"
              placeholder="Photobooth"
              value={config.googleDriveRootName}
              onChange={(e) => setConfig({ ...config, googleDriveRootName: e.target.value })}
              className="w-full bg-slate-950 border border-white/15 px-4 py-3 rounded-2xl text-sm text-white focus:border-blue-500 outline-none shadow-inner"
            />
          </div>
        </div>

        {/* Security & Token Policy Card */}
        <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="border-b border-white/10 pb-4">
            <span className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Customer QR Code Security & Expiry Policy
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs sm:text-sm font-bold text-slate-300 block mb-2">
                QR Code Expiry Duration
              </label>
              <select
                value={config.qrExpiryHours}
                onChange={(e) => setConfig({ ...config, qrExpiryHours: parseInt(e.target.value, 10) })}
                className="w-full bg-slate-950 border border-white/15 px-4 py-3 rounded-2xl text-sm text-white focus:border-blue-500 outline-none cursor-pointer shadow-inner"
              >
                <option value={24}>24 Hours (1 Day)</option>
                <option value={48}>48 Hours (2 Days - Recommended)</option>
                <option value={72}>72 Hours (3 Days)</option>
                <option value={168}>7 Days (1 Week)</option>
                <option value={720}>30 Days (1 Month)</option>
              </select>
              <p className="text-slate-400 text-xs mt-1.5">
                After this period, the QR code link will automatically expire and refuse access.
              </p>
            </div>

            <div>
              <label className="text-xs sm:text-sm font-bold text-slate-300 block mb-2">
                Custom Public Domain / Hostname (Optional)
              </label>
              <input
                type="text"
                placeholder="https://share.yourbrand.com (Leave blank for local IP)"
                value={config.publicShareDomain}
                onChange={(e) => setConfig({ ...config, publicShareDomain: e.target.value })}
                className="w-full bg-slate-950 border border-white/15 px-4 py-3 rounded-2xl text-sm text-white focus:border-blue-500 outline-none shadow-inner"
              />
              <p className="text-slate-400 text-xs mt-1.5">
                If provided, QR codes will encode this domain instead of the local Wi-Fi IP address.
              </p>
            </div>
          </div>

          {/* Privacy Architecture Notice */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 flex items-start gap-3">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 space-y-1">
              <p className="font-bold text-white">Zero-Trust Privacy Architecture</p>
              <p className="text-slate-400 leading-relaxed">
                Files are uploaded to Google Drive with <strong>private</strong> permissions only. Customers access photos through a 256-bit cryptographically random token verified by the backend proxy. Google Drive IDs and credentials are never exposed to the public.
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between">
          {saveSuccess && (
            <span className="text-xs sm:text-sm font-bold text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Cloud & Security settings saved successfully!</span>
            </span>
          )}
          <Button type="submit" disabled={isSaving} className="ml-auto flex items-center gap-2 px-8 py-3.5 shadow-xl">
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Settings...' : 'Save Cloud Settings'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

