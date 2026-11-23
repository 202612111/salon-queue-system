import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Scissors, Play, CheckCircle2, Coffee, Clock, 
  ArrowRight, Users, Sparkles, AlertCircle, Loader2, 
  ChevronDown, Phone, ShieldOff
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { api } from '../services/api';
import { socket } from '../services/socket';
import { Barber, QueueEntry, QueueSummary } from '../../../shared/types';

export const BarberPage: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const [barber, setBarber] = useState<Barber | null>(null);
  const [allBarbers, setAllBarbers] = useState<Barber[]>([]);
  const [waitingQueue, setWaitingQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Timer tick for service timer
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Barber data
  const loadBarberData = async () => {
    try {
      const [barbersList, waitingList] = await Promise.all([
        api.getBarbers(),
        api.getWaitingQueue(),
      ]);
      setAllBarbers(barbersList);
      setWaitingQueue(waitingList);

      const current = barbersList.find(
        (b) => b.name.toLowerCase() === (name || '').toLowerCase()
      );
      if (current) {
        setBarber(current);
      } else if (barbersList.length > 0) {
        // Redirect to first available barber if param doesn't match
        navigate(`/barber/${barbersList[0].name}`, { replace: true });
      }
    } catch (err) {
      console.error('Failed to load barber view:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBarberData();

    const handleUpdate = () => {
      loadBarberData();
    };

    socket.on('queue:updated', handleUpdate);
    socket.on('barber:updated', handleUpdate);
    socket.on('customer:called', handleUpdate);

    return () => {
      socket.off('queue:updated', handleUpdate);
      socket.off('barber:updated', handleUpdate);
      socket.off('customer:called', handleUpdate);
    };
  }, [name]);

  // Start Service (In chair)
  const handleStartService = async () => {
    if (!barber) return;
    setActionLoading(true);
    try {
      const res = await api.startService(barber.name);
      if (res.success) {
        loadBarberData();
      } else {
        alert(res.error || 'Failed to start service');
      }
    } catch (err: any) {
      alert(err.message || 'Error starting service');
    } finally {
      setActionLoading(false);
    }
  };

  // Complete Service (Done)
  const handleCompleteService = async () => {
    if (!barber) return;
    setActionLoading(true);
    try {
      const res = await api.completeService(barber.name);
      if (res.success) {
        loadBarberData();
      } else {
        alert(res.error || 'Failed to complete service');
      }
    } catch (err: any) {
      alert(err.message || 'Error completing service');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Break
  const handleToggleBreak = async () => {
    if (!barber) return;
    setActionLoading(true);
    try {
      const newBreakStatus = !barber.is_on_break;
      const res = await api.toggleBarberBreak(barber.name, newBreakStatus);
      if (res.success) {
        loadBarberData();
      } else {
        alert(res.error || 'Failed to toggle break');
      }
    } catch (err: any) {
      alert(err.message || 'Error toggling break');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading barber station...</p>
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Barber not found.</p>
        <Link to="/" className="text-gold font-bold underline mt-2 inline-block">Back Home</Link>
      </div>
    );
  }

  const isCalled = barber.current_status === 'Called';
  const isInChair = barber.current_status === 'In chair';
  const hasCustomer = isCalled || isInChair;

  // Next eligible customer waiting for this barber
  const nextEligible = waitingQueue.find(
    (q) => q.barber_preference === barber.name || q.barber_preference === 'Any'
  );

  // Elapsed timer formatting (MM:SS)
  let elapsedFormatted = '00:00';
  let progressPercent = 0;
  if (isInChair && barber.current_started_at) {
    const elapsedSec = Math.max(0, Math.floor((currentTime - new Date(barber.current_started_at).getTime()) / 1000));
    const mins = Math.floor(elapsedSec / 60);
    const secs = elapsedSec % 60;
    elapsedFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    if (barber.estimated_service_duration) {
      const totalSec = barber.estimated_service_duration * 60;
      progressPercent = Math.min(100, Math.round((elapsedSec / totalSec) * 100));
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 sm:py-8 space-y-6">
      
      {/* Barber Station Header & Profile Selector */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold to-gold-dark text-charcoal-900 flex items-center justify-center font-black text-lg shadow-md shadow-gold/20">
              <Scissors className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-charcoal-900 tracking-tight">
                  {barber.name}
                </h1>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  !barber.is_on_duty
                    ? 'bg-gray-100 text-gray-600'
                    : barber.is_on_break
                    ? 'bg-amber-100 text-amber-800'
                    : hasCustomer
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {!barber.is_on_duty
                    ? t.offDuty
                    : barber.is_on_break
                    ? t.onBreak
                    : hasCustomer
                    ? (isCalled ? t.called : t.inChair)
                    : t.available}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {language === 'en' ? 'Station Mobile Console' : 'વાળંદ મોબાઇલ કન્સોલ'}
              </p>
            </div>
          </div>

          {/* Quick Barber Switch Dropdown */}
          <div className="relative">
            <select
              value={barber.name}
              onChange={(e) => navigate(`/barber/${e.target.value}`)}
              className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-charcoal-800 focus:outline-none focus:border-gold cursor-pointer"
            >
              {allBarbers.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Break Toggle Action */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500 font-medium">
            {language === 'en' ? 'Availability Toggle:' : 'હાજરી સ્થિતિ:'}
          </span>
          <button
            onClick={handleToggleBreak}
            disabled={actionLoading || hasCustomer}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              barber.is_on_break
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                : 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200'
            } ${hasCustomer ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>{barber.is_on_break ? t.resumeDutyBtn : t.toggleBreakBtn}</span>
          </button>
        </div>
      </div>

      {/* On Break Notice */}
      {barber.is_on_break && (
        <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 shadow-sm flex items-start gap-3">
          <Coffee className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-amber-950">
              {language === 'en' ? "You're Currently on Break" : 'તમે હાલમાં વિરામ પર છો'}
            </h3>
            <p className="text-xs text-amber-800 leading-relaxed">
              {t.onBreakNotice}
            </p>
          </div>
        </div>
      )}

      {/* Main Focus: Current Customer Card */}
      {hasCustomer ? (
        <div className="p-6 sm:p-8 rounded-3xl bg-charcoal-900 text-white border border-charcoal-700 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              {t.currentCustomer}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
              isCalled ? 'bg-amber-400 text-charcoal-900 animate-pulse' : 'bg-gold text-charcoal-900'
            }`}>
              {isCalled ? t.called : t.inChair}
            </span>
          </div>

          {/* Token & Customer Name */}
          <div className="space-y-1">
            <span className="font-mono text-5xl sm:text-6xl font-black text-gold">
              {barber.current_token}
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
              {barber.current_customer_name}
            </h2>
            {barber.current_phone && (
              <p className="text-xs font-mono text-gray-400 flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-gold" />
                <span>+91 {barber.current_phone}</span>
              </p>
            )}
          </div>

          {/* Services List */}
          <div className="p-4 rounded-2xl bg-charcoal-800/80 border border-charcoal-700/80 space-y-2">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              {t.selectedServices}
            </span>
            <div className="space-y-1 text-sm font-medium text-gray-200">
              {barber.current_service_names?.map((sName, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                  <span>{sName}</span>
                </div>
              ))}
            </div>
            {barber.estimated_service_duration && (
              <p className="text-xs text-gold font-semibold pt-2 border-t border-charcoal-700 flex items-center justify-between">
                <span>{language === 'en' ? 'Estimated Total Time:' : 'અંદાજિત કુલ સમય:'}</span>
                <span>{barber.estimated_service_duration} min</span>
              </p>
            )}
          </div>

          {/* Live Timer if In Chair */}
          {isInChair && (
            <div className="p-5 rounded-2xl bg-charcoal-800 border border-charcoal-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gold" />
                  <span>{t.serviceTimer}</span>
                </span>
                <span className="font-mono text-2xl font-black text-white">
                  {elapsedFormatted}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-charcoal-700 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-gold to-gold-light transition-all duration-1000"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Primary Action Buttons: Start or Done */}
          <div className="pt-2">
            {isCalled ? (
              <button
                onClick={handleStartService}
                disabled={actionLoading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 font-bold text-white text-base shadow-xl hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                {actionLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    <span>{t.startServiceBtn}</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleCompleteService}
                disabled={actionLoading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-gold via-gold-light to-gold font-black text-charcoal-900 text-base shadow-xl hover:shadow-gold/30 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                {actionLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{t.completeServiceBtn}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Empty / Idle State */
        <div className="p-8 rounded-3xl bg-white border border-gray-200 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-charcoal-900">
              {t.noCustomerInChair}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {barber.is_on_break ? t.onBreakNotice : t.waitingForNext}
            </p>
          </div>

          {/* Next in Line Preview */}
          {nextEligible && !barber.is_on_break && (
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-left space-y-2 mt-4">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                {language === 'en' ? 'Next Eligible Customer in Queue:' : 'કતારમાં આગામી ગ્રાહક:'}
              </span>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-charcoal-900 text-sm">{nextEligible.customer_name}</p>
                  <p className="text-xs text-gray-500">{nextEligible.service_names_en.join(', ')}</p>
                </div>
                <span className="font-mono font-black text-gold-dark bg-gold-50 px-2.5 py-1 rounded-lg border border-gold/20">
                  {nextEligible.token}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Reception Link */}
      <div className="text-center">
        <Link
          to="/reception"
          className="text-xs font-semibold text-gray-500 hover:text-gold transition-colors inline-flex items-center gap-1"
        >
          <span>{language === 'en' ? 'Go to Reception Console' : 'રિસેપ્શન કન્સોલ પર જાઓ'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

    </div>
  );
};
