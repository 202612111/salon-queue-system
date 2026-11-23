import React, { useState, useEffect, useRef } from 'react';
import { 
  Crown, Clock, Volume2, VolumeX, Scissors, 
  Sparkles, Users, CheckCircle2, PhoneCall 
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { api } from '../services/api';
import { socket } from '../services/socket';
import { Barber, QueueEntry, QueueSummary } from '../../../shared/types';

export const DisplayPage: React.FC = () => {
  const { t, language } = useLanguage();

  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [waitingQueue, setWaitingQueue] = useState<QueueEntry[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Sound chime state
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Newly called token highlight
  const [newlyCalledToken, setNewlyCalledToken] = useState<{
    token: string;
    barberName: string;
    customerName?: string;
  } | null>(null);

  // Live Clock updater
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Web Audio Melodic Chime Synthesizer
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Note 1: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      // Note 2: G#5 (830.61 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(830.61, now + 0.22);
      gain2.gain.setValueAtTime(0.45, now + 0.22);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.22);
      osc2.stop(now + 1.1);
    } catch (err) {
      console.warn('Web Audio chime not permitted or failed:', err);
    }
  };

  const enableAudio = () => {
    setSoundEnabled(true);
    playChime();
  };

  // Fetch display data
  const loadDisplayData = async () => {
    try {
      const [barbersList, waitingList] = await Promise.all([
        api.getBarbers(),
        api.getWaitingQueue(),
      ]);
      setBarbers(barbersList);
      setWaitingQueue(waitingList);
    } catch (err) {
      console.error('Failed to load display data:', err);
    }
  };

  useEffect(() => {
    loadDisplayData();

    const handleUpdate = () => {
      loadDisplayData();
    };

    const handleCustomerCalled = (payload: any) => {
      if (payload && payload.token) {
        setNewlyCalledToken({
          token: payload.token,
          barberName: payload.barberName,
          customerName: payload.customerName,
        });

        // Trigger Audio Chime
        if (soundEnabled) {
          playChime();
        }

        // Auto clear flash highlight after 12 seconds
        setTimeout(() => {
          setNewlyCalledToken(null);
        }, 12000);
      }
      loadDisplayData();
    };

    socket.on('queue:updated', handleUpdate);
    socket.on('barber:updated', handleUpdate);
    socket.on('customer:called', handleCustomerCalled);

    return () => {
      socket.off('queue:updated', handleUpdate);
      socket.off('barber:updated', handleUpdate);
      socket.off('customer:called', handleCustomerCalled);
    };
  }, [soundEnabled]);

  const nextFive = waitingQueue.slice(0, 5);

  return (
    <div className="min-h-screen bg-charcoal-900 text-white flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden">
      
      {/* Top TV Header Bar */}
      <header className="flex items-center justify-between border-b border-charcoal-700/80 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold to-gold-dark text-charcoal-900 flex items-center justify-center font-black shadow-lg shadow-gold/20">
            <Crown className="w-9 h-9" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <span>{t.salonName}</span>
              <span className="text-xs uppercase font-mono tracking-widest text-gold bg-charcoal-800 border border-gold/30 px-3 py-1 rounded-full">
                LIVE QUEUE
              </span>
            </h1>
            <p className="text-sm text-gray-400 font-medium tracking-wider uppercase mt-1">
              {t.salonTagline}
            </p>
          </div>
        </div>

        {/* Live Clock & Sound Enable Toggle */}
        <div className="flex items-center gap-6">
          {!soundEnabled ? (
            <button
              onClick={enableAudio}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-charcoal-800 border border-gold/40 text-gold text-xs font-bold hover:bg-gold hover:text-charcoal-900 transition-all shadow-md animate-bounce"
            >
              <Volume2 className="w-4 h-4" />
              <span>{t.enableAudioBtn}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-charcoal-800/80 px-3 py-1.5 rounded-xl border border-charcoal-700">
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span>{language === 'en' ? 'Sound On' : 'અવાજ ચાલુ'}</span>
            </div>
          )}

          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">
              {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>
      </header>

      {/* Newly Called Token Pop-up / Alert Flash Banner */}
      {newlyCalledToken && (
        <div className="my-6 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-gold via-gold-light to-gold text-charcoal-900 shadow-2xl border-4 border-white animate-gold-pulse flex flex-col sm:flex-row items-center justify-between gap-6 transition-all">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-charcoal-900 text-gold flex items-center justify-center shrink-0">
              <PhoneCall className="w-8 h-8 animate-bounce" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-widest bg-charcoal-900 text-white px-3 py-1 rounded-full">
                {t.newlyCalledBanner}
              </span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-1">
                Token <span className="font-mono underline decoration-charcoal-900">{newlyCalledToken.token}</span>
              </h2>
              {newlyCalledToken.customerName && (
                <p className="text-base font-bold text-charcoal-800">
                  {newlyCalledToken.customerName}
                </p>
              )}
            </div>
          </div>

          <div className="text-center sm:text-right">
            <p className="text-xs font-black uppercase tracking-wider text-charcoal-800">
              {t.pleaseProceedTo}
            </p>
            <p className="text-2xl sm:text-4xl font-black tracking-tight text-charcoal-900">
              Station: {newlyCalledToken.barberName}
            </p>
          </div>
        </div>
      )}

      {/* Main TV Content Area: Split 2-Column Grid */}
      <main className="flex-1 my-6 grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        
        {/* Left Section: Active Barber Stations (2 Cols) */}
        <section className="lg:col-span-2 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
              <Scissors className="w-6 h-6 text-gold" />
              <span>{t.servingNow}</span>
            </h2>
            <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">
              {barbers.filter((b) => b.is_on_duty).length} Active Stations
            </span>
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-5">
            {barbers.map((barber) => {
              const isServing = !!barber.current_token;
              const isCalled = barber.current_status === 'Called';
              const isInChair = barber.current_status === 'In chair';

              return (
                <div
                  key={barber.id}
                  className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between border-2 transition-all shadow-xl ${
                    isCalled
                      ? 'bg-amber-500/15 border-amber-400 animate-gold-pulse'
                      : isInChair
                      ? 'bg-charcoal-800 border-gold/40'
                      : barber.is_on_break
                      ? 'bg-charcoal-800/40 border-charcoal-700 opacity-60'
                      : 'bg-charcoal-800/80 border-charcoal-700'
                  }`}
                >
                  {/* Station Name & Status Badge */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-widest text-gray-400">
                        Station
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                        isCalled
                          ? 'bg-amber-400 text-charcoal-900 animate-pulse'
                          : isInChair
                          ? 'bg-gold text-charcoal-900'
                          : barber.is_on_break
                          ? 'bg-charcoal-700 text-gray-300'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      }`}>
                        {isCalled
                          ? t.called
                          : isInChair
                          ? t.inChair
                          : barber.is_on_break
                          ? t.onBreak
                          : t.available}
                      </span>
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-black text-white">
                      {barber.name}
                    </h3>

                    {/* Massive Token Number Display (5m Readable) */}
                    {isServing ? (
                      <div className="py-4 text-center">
                        <span className="font-mono text-6xl sm:text-7xl font-black text-gold tracking-tight block">
                          {barber.current_token}
                        </span>
                        {barber.current_customer_name && (
                          <p className="text-lg font-bold text-gray-200 mt-2 truncate">
                            {barber.current_customer_name}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-gray-500">
                        <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500/60" />
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                          Ready for Customer
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Station Bottom Info */}
                  <div className="pt-4 border-t border-charcoal-700/60 text-xs text-gray-400 flex items-center justify-between">
                    <span>
                      {isServing ? 'Session Active' : (barber.is_on_break ? 'On Short Break' : 'Available')}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-gold" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Section: Next 5 in Line (1 Col) */}
        <section className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
              <Users className="w-6 h-6 text-gold" />
              <span>{t.nextUp}</span>
            </h2>
            <span className="text-xs text-gold font-mono font-bold">
              {waitingQueue.length} {language === 'en' ? 'Waiting' : 'પ્રતીક્ષારત'}
            </span>
          </div>

          <div className="flex-1 bg-charcoal-800/90 rounded-3xl p-6 border border-charcoal-700 shadow-xl flex flex-col justify-start space-y-3">
            {nextFive.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400 space-y-3">
                <Sparkles className="w-12 h-12 text-gold/40" />
                <p className="text-base font-bold text-gray-300">{t.queueEmptyTV}</p>
                <p className="text-xs text-gray-500">
                  {language === 'en' ? 'Scan QR or visit reception to join immediately.' : 'કતારમાં જોડાવા માટે રિસેપ્શનનો સંપર્ક કરો.'}
                </p>
              </div>
            ) : (
              nextFive.map((entry, idx) => (
                <div
                  key={entry.id}
                  className={`p-4 rounded-2xl flex items-center justify-between transition-all ${
                    idx === 0
                      ? 'bg-gold/15 border-2 border-gold/40 text-white shadow-md'
                      : 'bg-charcoal-900/60 border border-charcoal-700/60 text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                      idx === 0 ? 'bg-gold text-charcoal-900' : 'bg-charcoal-700 text-gray-300'
                    }`}>
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-sm text-white">
                        {entry.customer_name}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {entry.service_names_en.slice(0, 2).join(', ')}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-xl sm:text-2xl font-black text-gold">
                      {entry.token}
                    </span>
                    <p className="text-[10px] text-gray-400 font-medium">
                      Pref: {entry.barber_preference}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </main>

      {/* Bottom Footer Notice */}
      <footer className="border-t border-charcoal-700/80 pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-2">
        <p>
          {language === 'en' 
            ? 'Tokens are called in sequence. When your token is highlighted in gold, proceed directly to your assigned station.' 
            : 'જ્યારે તમારો ટોકન ગોલ્ડ કલરમાં ચમકે, ત્યારે તમારા સોંપેલ સ્ટેશન પર જાઓ.'}
        </p>
        <p className="font-mono text-gold">
          Royal Crown Digital Queue System
        </p>
      </footer>

    </div>
  );
};
