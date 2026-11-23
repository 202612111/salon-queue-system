import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Clock, Scissors, AlertTriangle, CheckCircle2, 
  ArrowLeft, Users, RefreshCw, XCircle, PhoneCall, 
  Sparkles, ShieldAlert, AlertCircle, Loader2
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { api } from '../services/api';
import { socket } from '../services/socket';
import { QueueEntry } from '../../../shared/types';

export const StatusPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const [entry, setEntry] = useState<QueueEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Fetch entry details
  const fetchEntry = async () => {
    if (!id) return;
    try {
      setError(null);
      const data = await api.getEntry(id);
      setEntry(data);
    } catch (err: any) {
      setError(err.message || t.tokenNotFound);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntry();

    // Socket.IO event listeners
    const handleQueueUpdate = () => {
      fetchEntry();
    };

    const handleCustomerCalled = (payload: any) => {
      if (entry && (payload.token === entry.token || payload.token === id)) {
        fetchEntry();
      } else {
        fetchEntry();
      }
    };

    socket.on('queue:updated', handleQueueUpdate);
    socket.on('customer:called', handleCustomerCalled);
    socket.on('barber:updated', handleQueueUpdate);

    return () => {
      socket.off('queue:updated', handleQueueUpdate);
      socket.off('customer:called', handleCustomerCalled);
      socket.off('barber:updated', handleQueueUpdate);
    };
  }, [id, entry?.token]);

  // Handle cancellation
  const handleConfirmCancel = async () => {
    if (!entry) return;
    setCancelling(true);
    try {
      const res = await api.cancelEntry(entry.token);
      if (res.success && res.entry) {
        setEntry(res.entry);
        setShowCancelModal(false);
      } else {
        alert(res.error || 'Failed to cancel queue entry');
      }
    } catch (err: any) {
      alert(err.message || 'Error cancelling entry');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
        <p className="text-sm text-gray-500 font-medium">
          {language === 'en' ? 'Fetching your live queue status...' : 'તમારું લાઈવ સ્ટેટસ લોડ થઈ રહ્યું છે...'}
        </p>
      </div>
    );
  }

  // Error / Not found state
  if (error || !entry) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="p-8 rounded-3xl bg-white border border-gray-200 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 mx-auto flex items-center justify-center">
            <XCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-charcoal-900">{t.tokenNotFound}</h1>
          <p className="text-gray-500 text-sm">
            {language === 'en'
              ? `We could not find an active token matching "${id}". Please check your token number or join the queue again.`
              : `ટોકન "${id}" મળ્યો નથી. કૃપા કરીને ટોકન નંબર તપાસો અથવા ફરીથી કતારમાં જોડાઓ.`}
          </p>
          <div className="pt-2 flex flex-col gap-3">
            <Link
              to="/join"
              className="w-full py-3.5 rounded-xl bg-gold text-charcoal-900 font-bold hover:bg-gold-light transition-colors"
            >
              {t.joinQueue}
            </Link>
            <Link
              to="/"
              className="w-full py-3.5 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
            >
              {t.home}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isWaiting = entry.status === 'Waiting';
  const isCalled = entry.status === 'Called';
  const isInChair = entry.status === 'In chair';
  const isDone = entry.status === 'Done';
  const isCancelled = entry.status === 'Cancelled';
  const isNoShow = entry.status === 'No-show';
  const isSecondInLine = isWaiting && entry.position === 2;
  const isNextInLine = isWaiting && entry.position === 1;

  return (
    <div className="max-w-md mx-auto px-4 py-6 sm:py-8 space-y-6">
      
      {/* Top Bar with Back Link and Refresh indicator */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{language === 'en' ? 'Back to Home' : 'મુખ્ય પૃષ્ઠ'}</span>
        </Link>
        <button
          onClick={fetchEntry}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-charcoal-900 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-sm"
          title="Refresh Status"
        >
          <RefreshCw className="w-3 h-3 text-gold" />
          <span>{language === 'en' ? 'Live' : 'લાઈવ'}</span>
        </button>
      </div>

      {/* Dynamic Status Notification Banners */}

      {/* 1. CALLED / IT'S YOUR TURN Banner */}
      {isCalled && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-gold via-gold-light to-gold text-charcoal-900 shadow-2xl border-2 border-gold-dark/30 animate-gold-pulse space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-charcoal-900 text-gold flex items-center justify-center shrink-0">
              <PhoneCall className="w-4 h-4" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider bg-charcoal-900 text-white px-2.5 py-0.5 rounded-full">
              NOW CALLING
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">
              {t.itsYourTurnAlert}
            </h2>
            <p className="text-sm font-bold text-charcoal-800 mt-1">
              {language === 'en' 
                ? `Please proceed to ${entry.assigned_barber}'s chair immediately!` 
                : `કૃપા કરીને તાત્કાલિક ${entry.assigned_barber}ની ખુરશી પર જાઓ!`
              }
            </p>
          </div>
        </div>
      )}

      {/* 2. START COMING Alert (2nd in line) */}
      {isSecondInLine && (
        <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 shadow-md flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
            <Clock className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <span className="inline-block text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
              {language === 'en' ? 'ACTION REQUIRED' : 'સૂચના'}
            </span>
            <h3 className="font-bold text-base text-amber-950">
              {t.startComingAlert}
            </h3>
            <p className="text-xs text-amber-800 leading-relaxed">
              {language === 'en' 
                ? 'Only 1 customer ahead of you. Head to the waiting lounge to avoid losing your turn.' 
                : 'તમારાથી આગળ માત્ર ૧ ગ્રાહક છે. તમારો વારો ન ચૂકી જાઓ તે માટે સલૂન પહોંચો.'}
            </p>
          </div>
        </div>
      )}

      {/* 3. NEXT IN LINE (1st in line) */}
      {isNextInLine && (
        <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 shadow-sm flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-blue-950">
              {language === 'en' ? "You're Next in Line!" : 'હવે પછી તમારો જ વારો છે!'}
            </h3>
            <p className="text-xs text-blue-800 mt-0.5">
              {language === 'en' ? 'The next available barber will call your token shortly.' : 'વાળંદ ટૂંક સમયમાં તમારો ટોકન બોલાવશે.'}
            </p>
          </div>
        </div>
      )}

      {/* 4. IN CHAIR Banner */}
      {isInChair && (
        <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 shadow-sm flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Scissors className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-indigo-950">
              {language === 'en' ? 'Service in Progress' : 'સેવા ચાલુ છે'}
            </h3>
            <p className="text-xs text-indigo-800 mt-0.5">
              {t.serviceInProgressAlert} ({entry.assigned_barber})
            </p>
          </div>
        </div>
      )}

      {/* 5. DONE Banner */}
      {isDone && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-sm flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-emerald-950">
              {language === 'en' ? 'Service Completed' : 'સેવા પૂર્ણ થઈ'}
            </h3>
            <p className="text-xs text-emerald-800 mt-0.5">
              {t.serviceCompletedAlert}
            </p>
          </div>
        </div>
      )}

      {/* 6. CANCELLED Banner */}
      {isCancelled && (
        <div className="p-5 rounded-2xl bg-red-50 border border-red-200 text-red-900 shadow-sm flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-red-950">
              {language === 'en' ? 'Queue Entry Cancelled' : 'કતાર નોંધણી રદ'}
            </h3>
            <p className="text-xs text-red-800 mt-0.5">
              {t.queueCancelledAlert}
            </p>
          </div>
        </div>
      )}

      {/* 7. NO-SHOW Banner */}
      {isNoShow && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 shadow-sm flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-amber-950">
              {language === 'en' ? 'Marked as No-Show' : 'ગેરહાજર નોંધવામાં આવ્યા'}
            </h3>
            <p className="text-xs text-amber-800 mt-0.5">
              {t.noShowAlert}
            </p>
          </div>
        </div>
      )}

      {/* Central Token & Position Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-gray-200 shadow-xl text-center space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
            {t.yourTokenNumber}
          </span>
          <div className="mt-2 inline-block">
            <span className="font-mono text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-charcoal-900 via-charcoal-700 to-charcoal-900 tracking-tight">
              {entry.token}
            </span>
          </div>
        </div>

        {/* Current Status Pill */}
        <div className="flex justify-center">
          <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
            isWaiting
              ? 'bg-amber-100 text-amber-800 border border-amber-200'
              : isCalled
              ? 'bg-gold text-charcoal-900 border border-gold-dark shadow-sm'
              : isInChair
              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
              : isDone
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              : isCancelled
              ? 'bg-red-100 text-red-800 border border-red-200'
              : 'bg-gray-100 text-gray-800 border border-gray-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isWaiting ? 'bg-amber-500' : isCalled ? 'bg-charcoal-900 animate-ping' : isInChair ? 'bg-indigo-500' : 'bg-emerald-500'
            }`} />
            <span>
              {isWaiting
                ? t.waiting
                : isCalled
                ? t.called
                : isInChair
                ? t.inChair
                : isDone
                ? t.done
                : isCancelled
                ? t.cancelled
                : t.noShow}
            </span>
          </span>
        </div>

        {/* Live Metrics: Position & Estimated Wait (Active Waiting Only) */}
        {isWaiting && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            {/* Position */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500 font-medium">{t.yourPosition}</p>
              <p className="text-3xl font-extrabold text-charcoal-900 mt-1">
                #{entry.position}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">{t.inLine}</p>
            </div>

            {/* Estimated Wait */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500 font-medium">{t.approxWait}</p>
              <p className="text-3xl font-extrabold text-charcoal-900 mt-1">
                {entry.estimated_wait_minutes !== null ? `~${entry.estimated_wait_minutes}m` : 'N/A'}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {language === 'en' ? 'approximate' : 'અંદાજિત'}
              </p>
            </div>
          </div>
        )}

        {/* Details List */}
        <div className="space-y-3 pt-4 border-t border-gray-100 text-left text-sm">
          <div className="flex items-center justify-between py-1 border-b border-gray-100 text-xs">
            <span className="text-gray-400 font-medium">{t.fullNameLabel}</span>
            <span className="font-bold text-charcoal-900">{entry.customer_name}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-gray-100 text-xs">
            <span className="text-gray-400 font-medium">{t.phoneLabel}</span>
            <span className="font-mono font-semibold text-charcoal-700">
              ••••••{entry.phone.slice(-4)}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-gray-100 text-xs">
            <span className="text-gray-400 font-medium">{t.barberPreference}</span>
            <span className="font-bold text-charcoal-900">{entry.barber_preference}</span>
          </div>

          {entry.assigned_barber && (
            <div className="flex items-center justify-between py-1 border-b border-gray-100 text-xs bg-gold-50/50 px-2 rounded-lg">
              <span className="text-gold-dark font-medium">{t.assignedBarber}</span>
              <span className="font-bold text-charcoal-900">{entry.assigned_barber}</span>
            </div>
          )}

          {/* Selected Services */}
          <div className="pt-2">
            <span className="text-xs text-gray-400 font-medium block mb-1.5">
              {t.selectedServices} ({entry.service_ids.length})
            </span>
            <div className="space-y-1">
              {(language === 'gu' ? entry.service_names_gu : entry.service_names_en).map((name, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-0.5 text-gray-700">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                    <span>{name}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500 font-medium">{t.totalPrice}</span>
            <span className="text-xl font-black text-charcoal-900">₹{entry.total_price}</span>
          </div>
        </div>

        {/* Cancel Action (Only available while Waiting) */}
        {isWaiting && (
          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={() => setShowCancelModal(true)}
              className="w-full py-3 rounded-xl border border-red-200 text-red-600 font-semibold text-xs hover:bg-red-50 hover:border-red-300 transition-colors"
            >
              {t.cancelQueueBtn}
            </button>
          </div>
        )}

        {/* If Cancelled or Done or No-show, offer button to join again */}
        {(isDone || isCancelled || isNoShow) && (
          <div className="pt-2 border-t border-gray-100">
            <Link
              to="/join"
              className="w-full py-3.5 rounded-xl bg-gold text-charcoal-900 font-bold text-sm hover:bg-gold-light transition-colors block text-center shadow-md shadow-gold/20"
            >
              {language === 'en' ? 'Join Queue Again' : 'ફરીથી કતારમાં જોડાઓ'}
            </Link>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Cancellation */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-5 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-charcoal-900">
                {t.cancelConfirmTitle}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {t.cancelConfirmMessage}
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="w-full py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>{t.confirmCancelBtn}</span>
                )}
              </button>

              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors"
              >
                {t.keepMyTurnBtn}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
