import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Clock, Scissors, ArrowRight, Sparkles, AlertTriangle, CheckCircle2, Coffee, ShieldOff } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { api } from '../services/api';
import { socket } from '../services/socket';
import { QueueSummary } from '../../../shared/types';

export const HomePage: React.FC = () => {
  const { t, language } = useLanguage();
  const [summary, setSummary] = useState<QueueSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    try {
      const data = await api.getSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();

    const handleUpdate = () => {
      fetchSummary();
    };

    socket.on('queue:updated', handleUpdate);
    socket.on('barber:updated', handleUpdate);

    return () => {
      socket.off('queue:updated', handleUpdate);
      socket.off('barber:updated', handleUpdate);
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Hero Brand Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-charcoal-900 via-charcoal-800 to-charcoal-900 text-white p-8 sm:p-10 shadow-2xl border border-charcoal-700">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-charcoal-700/80 border border-gold/30 text-gold text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.welcomeTitle}</span>
            </div>

            {/* Operating Hours & Live Status Pill */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                summary?.salon_status === 'open' 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                  : summary?.salon_status === 'online_closed'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-red-500/20 text-red-300 border border-red-500/40'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  summary?.salon_status === 'open' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`} />
                <span>
                  {summary?.salon_status === 'open' 
                    ? (language === 'en' ? 'Salon Open' : 'સલૂન ખુલ્લું છે')
                    : summary?.salon_status === 'online_closed'
                    ? (language === 'en' ? 'Online Queue Paused' : 'ઓનલાઇન કતાર બંધ')
                    : (language === 'en' ? 'Salon Closed' : 'સલૂન બંધ છે')}
                </span>
              </span>
            </div>
          </div>

          <div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              {t.salonName}
            </h1>
            <p className="text-base sm:text-lg text-gray-300 max-w-2xl font-normal leading-relaxed mt-2">
              {t.welcomeSubtitle}
            </p>
          </div>

          {/* Online Queue Closed Banner */}
          {summary && !summary.is_online_queue_open && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-200 text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  {summary.salon_status === 'salon_closed' ? t.salonClosedBanner : t.queueClosedBanner}
                </p>
                <p className="text-xs text-amber-300/80 mt-1">
                  {language === 'en' 
                    ? 'Walk-ins are welcomed and managed directly at the salon reception desk.' 
                    : 'વૉક-ઇન ગ્રાહકોનું સ્વાગત છે અને રિસેપ્શન ડેસ્ક પર સીધી નોંધણી કરવામાં આવે છે.'}
                </p>
              </div>
            </div>
          )}

          {/* Primary CTA Buttons */}
          <div className="pt-2 flex flex-wrap gap-4">
            {summary?.is_online_queue_open ? (
              <Link
                to="/join"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-gold via-gold-light to-gold font-bold text-charcoal-900 text-lg hover:shadow-xl hover:shadow-gold/30 hover:scale-[1.02] active:scale-[0.99] transition-all"
              >
                <span>{t.joinNowBtn}</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  disabled
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-charcoal-700 font-bold text-gray-400 text-lg cursor-not-allowed border border-charcoal-600"
                >
                  <span>{t.joinNowBtn}</span>
                  <span className="text-xs bg-charcoal-800 px-2 py-0.5 rounded text-gray-400">Offline</span>
                </button>
                <Link
                  to="/reception"
                  className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl bg-gold/20 text-gold font-semibold border border-gold/40 hover:bg-gold/30 transition-colors"
                >
                  <span>{language === 'en' ? 'Register as Walk-in at Reception' : 'રિસેપ્શન પર વૉક-ઇન નોંધાવો'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            <Link
              to="/reception"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl bg-charcoal-800/80 hover:bg-charcoal-700 text-gray-200 font-semibold border border-charcoal-600 hover:border-gold/40 transition-colors"
            >
              <Scissors className="w-4 h-4 text-gold" />
              <span>{t.reception}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Live Queue Overview Stats */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-charcoal-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gold" />
            <span>{t.liveQueueStatus}</span>
          </h2>
          <span className="text-xs text-gray-400 font-mono">Live Sync</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-white border border-gray-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Stat 1: Waiting */}
            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center gap-4 hover:border-gold/30 transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-gold flex items-center justify-center shrink-0">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{t.peopleWaiting}</p>
                <p className="text-3xl font-extrabold text-charcoal-900 mt-1">
                  {summary?.waiting_count ?? 0}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {summary?.waiting_count === 0 
                    ? (language === 'en' ? 'No queue currently' : 'હાલ કોઈ કતાર નથી') 
                    : (language === 'en' ? 'Waiting in line' : 'કતારમાં પ્રતીક્ષારત')}
                </p>
              </div>
            </div>

            {/* Stat 2: Estimated Wait */}
            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center gap-4 hover:border-gold/30 transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Clock className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{t.estWaitTime}</p>
                <p className="text-3xl font-extrabold text-charcoal-900 mt-1">
                  {summary?.estimated_wait_minutes !== null 
                    ? (summary?.estimated_wait_minutes === 0 ? '0 min' : `~${summary?.estimated_wait_minutes} min`) 
                    : 'N/A'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {summary?.working_barbers_count === 0 
                    ? (language === 'en' ? 'No barbers working' : 'કોઈ વાળંદ હાજર નથી') 
                    : (language === 'en' ? 'Paced across working chairs' : 'હાજર વાળંદ અનુસાર')}
                </p>
              </div>
            </div>

            {/* Stat 3: Barbers Working */}
            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center gap-4 hover:border-gold/30 transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Scissors className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{t.barbersWorking}</p>
                <p className="text-3xl font-extrabold text-charcoal-900 mt-1">
                  {summary?.working_barbers_count ?? 0}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {summary?.barbers.length ? `${summary.barbers.length} ${language === 'en' ? 'total staff' : 'કુલ વાળંદ'}` : ''}
                </p>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 italic">
          {t.approximateNotice}
        </p>
      </div>

      {/* Barbers Roster Cards */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-charcoal-800 flex items-center gap-2">
          <Scissors className="w-5 h-5 text-gold" />
          <span>{t.barberRoster}</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {summary?.barbers.map((barber) => {
            const isWorking = barber.is_on_duty && !barber.is_on_break;
            const isBusy = !!barber.current_token;

            return (
              <div
                key={barber.id}
                className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-charcoal-900 text-lg">{barber.name}</h3>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      !barber.is_on_duty
                        ? 'bg-gray-100 text-gray-600'
                        : barber.is_on_break
                        ? 'bg-amber-100 text-amber-700'
                        : isBusy
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {!barber.is_on_duty ? (
                      <ShieldOff className="w-3 h-3" />
                    ) : barber.is_on_break ? (
                      <Coffee className="w-3 h-3" />
                    ) : isBusy ? (
                      <Scissors className="w-3 h-3" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3" />
                    )}
                    <span>
                      {!barber.is_on_duty
                        ? t.offDuty
                        : barber.is_on_break
                        ? t.onBreak
                        : isBusy
                        ? t.busy
                        : t.available}
                    </span>
                  </span>
                </div>

                <div className="text-xs text-gray-500">
                  {isBusy ? (
                    <div className="space-y-1">
                      <p className="flex items-center gap-1.5 font-medium text-charcoal-700">
                        <span>{language === 'en' ? 'Serving token:' : 'ચાલુ ટોકન:'}</span>
                        <span className="font-mono font-bold text-gold-dark bg-gold-50 px-2 py-0.5 rounded border border-gold/20">
                          {barber.current_token}
                        </span>
                      </p>
                      {barber.current_customer_name && (
                        <p className="text-gray-500">
                          {language === 'en' ? 'Customer:' : 'ગ્રાહક:'} <span className="font-medium text-charcoal-800">{barber.current_customer_name}</span>
                        </p>
                      )}
                    </div>
                  ) : barber.is_on_break ? (
                    <p className="text-amber-600 italic">
                      {language === 'en' ? 'Currently on a break' : 'હાલમાં વિરામ પર છે'}
                    </p>
                  ) : isWorking ? (
                    <p className="text-emerald-600 font-medium">
                      {language === 'en' ? 'Ready for next customer' : 'આગામી ગ્રાહક માટે તૈયાર'}
                    </p>
                  ) : (
                    <p className="text-gray-400">
                      {language === 'en' ? 'Not on duty today' : 'આજે રજા પર છે'}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <Link
                    to={`/barber/${barber.name}`}
                    className="text-xs font-semibold text-charcoal-700 hover:text-gold flex items-center justify-between group transition-colors"
                  >
                    <span>{language === 'en' ? 'View Barber Station' : 'વાળંદ સ્ટેશન જુઓ'}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
