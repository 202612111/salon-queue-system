import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, Scissors, Plus, PhoneCall, AlertTriangle, 
  Clock, XCircle, CheckCircle2, Coffee, ShieldOff, 
  ToggleLeft, ToggleRight, ArrowRight, Loader2, Sparkles, AlertCircle, RefreshCw
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { api } from '../services/api';
import { socket } from '../services/socket';
import { Barber, QueueEntry, QueueSummary, Service } from '../../../shared/types';

export const ReceptionPage: React.FC = () => {
  const { t, language } = useLanguage();

  // Data State
  const [summary, setSummary] = useState<QueueSummary | null>(null);
  const [waitingQueue, setWaitingQueue] = useState<QueueEntry[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Walk-in Modal State
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInSelectedServices, setWalkInSelectedServices] = useState<Service[]>([]);
  const [walkInBarberPref, setWalkInBarberPref] = useState('Any');
  const [walkInSubmitting, setWalkInSubmitting] = useState(false);
  const [walkInError, setWalkInError] = useState<string | null>(null);

  // Destructive Action Modals State
  const [confirmNoShowToken, setConfirmNoShowToken] = useState<string | null>(null);
  const [confirmCancelToken, setConfirmCancelToken] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Timer tick for live elapsed time updates
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Fetch all reception dashboard data
  const loadDashboardData = async () => {
    try {
      const [sum, wait, barbs, servs] = await Promise.all([
        api.getSummary(),
        api.getWaitingQueue(),
        api.getBarbers(),
        api.getServices(),
      ]);
      setSummary(sum);
      setWaitingQueue(wait);
      setBarbers(barbs);
      setServices(servs);
    } catch (err) {
      console.error('Failed to load reception data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    const handleUpdate = () => {
      loadDashboardData();
    };

    socket.on('queue:updated', handleUpdate);
    socket.on('barber:updated', handleUpdate);
    socket.on('customer:called', handleUpdate);

    return () => {
      socket.off('queue:updated', handleUpdate);
      socket.off('barber:updated', handleUpdate);
      socket.off('customer:called', handleUpdate);
    };
  }, []);

  // Toggle Online Queue Open/Close
  const handleToggleOnlineQueue = async () => {
    if (!summary) return;
    try {
      const newStatus = !summary.is_online_queue_open;
      await api.toggleOnlineQueue(newStatus);
      loadDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle online queue');
    }
  };

  // Call Next Customer for a barber
  const handleCallNext = async (barberName: string) => {
    setActionLoading(true);
    try {
      const res = await api.callNext(barberName);
      if (!res.success) {
        alert(res.error || `No eligible customers waiting for ${barberName}`);
      } else {
        loadDashboardData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to call customer');
    } finally {
      setActionLoading(false);
    }
  };

  // Mark No-Show confirm
  const handleMarkNoShow = async () => {
    if (!confirmNoShowToken) return;
    setActionLoading(true);
    try {
      const res = await api.markNoShow(confirmNoShowToken);
      if (res.success) {
        setConfirmNoShowToken(null);
        loadDashboardData();
      } else {
        alert(res.error || 'Failed to mark customer as no-show');
      }
    } catch (err: any) {
      alert(err.message || 'Error marking no-show');
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel Entry confirm
  const handleCancelEntry = async () => {
    if (!confirmCancelToken) return;
    setActionLoading(true);
    try {
      const res = await api.cancelEntry(confirmCancelToken);
      if (res.success) {
        setConfirmCancelToken(null);
        loadDashboardData();
      } else {
        alert(res.error || 'Failed to cancel entry');
      }
    } catch (err: any) {
      alert(err.message || 'Error cancelling entry');
    } finally {
      setActionLoading(false);
    }
  };

  // Add Walk-in Submission
  const handleWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalkInError(null);

    if (!walkInName.trim()) {
      setWalkInError(t.nameRequiredError);
      return;
    }
    if (walkInPhone.length !== 10) {
      setWalkInError(t.invalidPhoneError);
      return;
    }
    if (walkInSelectedServices.length === 0) {
      setWalkInError(t.serviceRequiredError);
      return;
    }
    if (walkInSelectedServices.length > 3) {
      setWalkInError(t.maxServicesNotice);
      return;
    }

    setWalkInSubmitting(true);
    try {
      const res = await api.addWalkIn({
        customer_name: walkInName.trim(),
        phone: walkInPhone.trim(),
        service_ids: walkInSelectedServices.map((s) => s.id),
        barber_preference: walkInBarberPref,
      });

      if (!res.success) {
        setWalkInError(res.error || 'Failed to add walk-in');
        return;
      }

      // Reset and close
      setWalkInName('');
      setWalkInPhone('');
      setWalkInSelectedServices([]);
      setWalkInBarberPref('Any');
      setShowWalkInModal(false);
      loadDashboardData();
    } catch (err: any) {
      setWalkInError(err.message || 'Error creating walk-in entry');
    } finally {
      setWalkInSubmitting(false);
    }
  };

  const walkInTotalPrice = walkInSelectedServices.reduce((sum, s) => sum + s.price, 0);
  const walkInTotalDuration = walkInSelectedServices.reduce((sum, s) => sum + s.duration, 0);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading reception dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      
      {/* Top Header & Operational Controls */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              LIVE CONSOLE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 tracking-tight mt-1">
            {t.receptionTitle}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            {t.receptionSubtitle}
          </p>
        </div>

        {/* Quick Actions & Online Queue Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Online Queue Toggle Button */}
          <button
            onClick={handleToggleOnlineQueue}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${
              summary?.is_online_queue_open
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
            }`}
          >
            {summary?.is_online_queue_open ? (
              <>
                <ToggleRight className="w-5 h-5 text-emerald-600" />
                <span>{t.onlineQueueOpen}</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-5 h-5 text-amber-600" />
                <span>{t.onlineQueueClosed}</span>
              </>
            )}
          </button>

          {/* Add Walk-in Customer Button */}
          <button
            onClick={() => {
              setWalkInError(null);
              setShowWalkInModal(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-charcoal-900 text-white font-bold text-xs hover:bg-charcoal-800 border border-charcoal-700 shadow-md transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 text-gold" />
            <span>{t.addWalkInBtn}</span>
          </button>
        </div>
      </div>

      {/* 3-Column Barber Cards (Tablet Landscape Row) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-charcoal-900 flex items-center gap-2">
            <Scissors className="w-4 h-4 text-gold" />
            <span>{language === 'en' ? 'Barber Stations & Active Chairs' : 'વાળંદ સ્ટેશન અને ચાલુ ખુરશીઓ'}</span>
          </h2>
          <span className="text-xs text-gray-400 font-medium">
            {barbers.filter((b) => b.is_on_duty && !b.is_on_break).length} / {barbers.length} {language === 'en' ? 'on duty' : 'હાજર'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {barbers.map((barber) => {
            const isOnDuty = barber.is_on_duty;
            const isOnBreak = barber.is_on_break;
            const hasCustomer = !!barber.current_token;
            const isCalled = barber.current_status === 'Called';
            const isInChair = barber.current_status === 'In chair';

            // Calculate elapsed minutes since called
            let minutesCalled = 0;
            if (isCalled && barber.current_called_at) {
              const diffMs = currentTime - new Date(barber.current_called_at).getTime();
              minutesCalled = Math.max(0, Math.floor(diffMs / (1000 * 60)));
            }
            const isEligibleForNoShow = isCalled && minutesCalled >= 10;

            // Calculate in-chair progress if applicable
            let serviceProgress = 0;
            let minutesRemaining = 0;
            if (isInChair && barber.current_started_at && barber.estimated_service_duration) {
              const elapsedMs = currentTime - new Date(barber.current_started_at).getTime();
              const elapsedMin = Math.max(0, Math.floor(elapsedMs / (1000 * 60)));
              serviceProgress = Math.min(100, Math.round((elapsedMin / barber.estimated_service_duration) * 100));
              minutesRemaining = Math.max(0, barber.estimated_service_duration - elapsedMin);
            }

            return (
              <div
                key={barber.id}
                className={`p-6 rounded-3xl border transition-all shadow-sm flex flex-col justify-between space-y-4 ${
                  !isOnDuty
                    ? 'bg-gray-50 border-gray-200 opacity-60'
                    : isOnBreak
                    ? 'bg-amber-50/40 border-amber-200'
                    : isCalled
                    ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-400/30'
                    : isInChair
                    ? 'bg-indigo-50/40 border-indigo-200'
                    : 'bg-white border-gray-200 hover:border-gold/40'
                }`}
              >
                {/* Header: Name and Status Badge */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-lg text-charcoal-900 flex items-center gap-2">
                      <span>{barber.name}</span>
                    </h3>

                    {/* Status Badge */}
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      !isOnDuty
                        ? 'bg-gray-200 text-gray-700'
                        : isOnBreak
                        ? 'bg-amber-100 text-amber-800'
                        : isCalled
                        ? 'bg-amber-500 text-white animate-pulse'
                        : isInChair
                        ? 'bg-indigo-600 text-white'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {!isOnDuty ? (
                        <>
                          <ShieldOff className="w-3 h-3" />
                          <span>{t.offDuty}</span>
                        </>
                      ) : isOnBreak ? (
                        <>
                          <Coffee className="w-3 h-3" />
                          <span>{t.onBreak}</span>
                        </>
                      ) : isCalled ? (
                        <>
                          <PhoneCall className="w-3 h-3" />
                          <span>{t.called}</span>
                        </>
                      ) : isInChair ? (
                        <>
                          <Scissors className="w-3 h-3" />
                          <span>{t.inChair}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{t.available}</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Customer Information in Station */}
                  {hasCustomer ? (
                    <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-2xl font-black text-charcoal-900">
                          {barber.current_token}
                        </span>
                        <span className="text-xs font-bold text-gray-500">
                          {barber.current_customer_name}
                        </span>
                      </div>

                      {/* Services summary */}
                      {barber.current_service_names && (
                        <div className="text-xs text-gray-500">
                          <span>{barber.current_service_names.join(', ')}</span>
                        </div>
                      )}

                      {/* Called State Details */}
                      {isCalled && (
                        <div className="space-y-2 pt-2 border-t border-gray-100">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">{language === 'en' ? 'Called Since:' : 'બોલાવ્યાને:'}</span>
                            <span className={`font-mono font-bold ${isEligibleForNoShow ? 'text-red-600' : 'text-amber-700'}`}>
                              {minutesCalled} min ago
                            </span>
                          </div>

                          {isEligibleForNoShow ? (
                            <div className="p-2 rounded-lg bg-red-50 text-[11px] text-red-700 font-semibold flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                              <span>{language === 'en' ? 'Customer called >10m ago (Eligible for No-show)' : '૧૦ મિનિટથી વધુ સમય થયો (ગેરહાજર પાત્ર)'}</span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-gray-400">
                              {language === 'en' ? `No-show eligible in ${10 - minutesCalled}m` : `૧૦ મિનિટ પૂર્ણ થવામાં ${10 - minutesCalled}m બાકી`}
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => setConfirmNoShowToken(barber.current_token!)}
                              className="w-full py-2 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors shadow-sm"
                            >
                              {t.noShowBtn}
                            </button>
                            <Link
                              to={`/status/${barber.current_token}`}
                              className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-xs hover:bg-gray-200 transition-colors shrink-0"
                            >
                              View
                            </Link>
                          </div>
                        </div>
                      )}

                      {/* In Chair State Progress */}
                      {isInChair && (
                        <div className="space-y-2 pt-2 border-t border-gray-100">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-gray-500">{language === 'en' ? 'Service Progress' : 'સેવા પ્રગતિ'}</span>
                            <span className="text-indigo-600">~{minutesRemaining} min left</span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                              style={{ width: `${serviceProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : isOnBreak ? (
                    <div className="p-4 rounded-2xl bg-amber-100/50 text-center py-6 text-xs text-amber-800">
                      <Coffee className="w-6 h-6 mx-auto mb-1.5 text-amber-700" />
                      <p className="font-bold">{barber.name} {language === 'en' ? 'is on break' : 'વિરામ પર છે'}</p>
                      <p className="text-gray-500 mt-1">{language === 'en' ? 'Cannot receive new assignments' : 'નવા ગ્રાહકો સોંપી શકાશે નહીં'}</p>
                    </div>
                  ) : !isOnDuty ? (
                    <div className="p-4 rounded-2xl bg-gray-100 text-center py-6 text-xs text-gray-500">
                      <ShieldOff className="w-6 h-6 mx-auto mb-1.5 text-gray-400" />
                      <p className="font-bold">{barber.name} {language === 'en' ? 'is off duty' : 'રજા પર છે'}</p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-center py-6 text-xs text-emerald-800">
                      <CheckCircle2 className="w-6 h-6 mx-auto mb-1.5 text-emerald-600" />
                      <p className="font-bold">{language === 'en' ? 'Station Ready & Available' : 'સ્ટેશન ખાલી અને તૈયાર છે'}</p>
                      <p className="text-emerald-700/80 mt-0.5">{language === 'en' ? 'Eligible for next customer' : 'આગામી ગ્રાહક માટે તૈયાર'}</p>
                    </div>
                  )}
                </div>

                {/* Card Action: Call Next Button */}
                {!hasCustomer && isOnDuty && !isOnBreak && (
                  <button
                    onClick={() => handleCallNext(barber.name)}
                    disabled={actionLoading || waitingQueue.length === 0}
                    className={`w-full py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                      waitingQueue.length === 0
                        ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                        : 'bg-gradient-to-r from-gold via-gold-light to-gold text-charcoal-900 hover:shadow-gold/20 hover:scale-[1.01] active:scale-[0.99]'
                    }`}
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>{t.callNextBtn} ({barber.name})</span>
                  </button>
                )}

                {/* Barber Station Direct Link */}
                <div className="pt-1 text-center">
                  <Link
                    to={`/barber/${barber.name}`}
                    className="text-[11px] font-semibold text-gray-400 hover:text-gold transition-colors inline-flex items-center gap-1"
                  >
                    <span>{language === 'en' ? `Open ${barber.name}'s Mobile View` : `${barber.name}નો વ્યૂ ખોલો`}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live FCFS Waiting Queue Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-charcoal-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-gold" />
              <span>{t.activeWaitingQueue}</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {language === 'en' ? 'Strict first-come, first-served order. Walk-ins join at the end.' : 'પ્રથમ આવનાર પ્રથમ સેવા મુજબ ક્રમ.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-charcoal-800 bg-gray-100 px-3 py-1 rounded-full">
              {waitingQueue.length} {language === 'en' ? 'in line' : 'કતારમાં'}
            </span>
          </div>
        </div>

        {/* Table / List */}
        {waitingQueue.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
            <div className="w-12 h-12 rounded-full bg-gray-200 text-gray-500 mx-auto flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <p className="font-bold text-charcoal-800 text-base">{t.noWaitingCustomers}</p>
            <p className="text-xs text-gray-400">
              {language === 'en' ? 'New online registrations and walk-in arrivals will show here.' : 'નવા ગ્રાહકો અહીં દેખાશે.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">{t.tokenCol}</th>
                  <th className="py-3 px-3">{t.customerCol}</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">{t.servicesCol}</th>
                  <th className="py-3 px-3">{t.preferenceCol}</th>
                  <th className="py-3 px-3">{t.waitTimeCol}</th>
                  <th className="py-3 px-3 text-right">{t.actionsCol}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {waitingQueue.map((entry, idx) => (
                  <tr key={entry.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* Position */}
                    <td className="py-3.5 px-3 font-bold text-gray-400">
                      #{idx + 1}
                    </td>

                    {/* Token */}
                    <td className="py-3.5 px-3">
                      <Link
                        to={`/status/${entry.token}`}
                        className="font-mono font-black text-sm text-gold-dark bg-gold-50 px-2.5 py-1 rounded-lg border border-gold/20 hover:border-gold transition-colors inline-block"
                      >
                        {entry.token}
                      </Link>
                    </td>

                    {/* Customer & Phone */}
                    <td className="py-3.5 px-3">
                      <p className="font-bold text-charcoal-900 text-sm">{entry.customer_name}</p>
                      <p className="text-[11px] font-mono text-gray-400">{entry.phone}</p>
                    </td>

                    {/* Type Badge */}
                    <td className="py-3.5 px-3">
                      {entry.is_walk_in ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          Walk-in
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Online
                        </span>
                      )}
                    </td>

                    {/* Services */}
                    <td className="py-3.5 px-3">
                      <p className="font-medium text-charcoal-800">
                        {(language === 'gu' ? entry.service_names_gu : entry.service_names_en).join(', ')}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {entry.total_duration}m • ₹{entry.total_price}
                      </p>
                    </td>

                    {/* Barber Preference */}
                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                        entry.barber_preference === 'Any' 
                          ? 'bg-gray-100 text-gray-700' 
                          : 'bg-gold-50 text-gold-dark border border-gold/20'
                      }`}>
                        {entry.barber_preference}
                      </span>
                    </td>

                    {/* Waiting Duration */}
                    <td className="py-3.5 px-3 text-gray-500 font-mono text-[11px]">
                      {entry.created_at ? `${Math.max(0, Math.floor((currentTime - new Date(entry.created_at).getTime()) / (1000 * 60)))}m ago` : '-'}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => setConfirmCancelToken(entry.token)}
                        className="px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-semibold transition-colors"
                      >
                        {t.cancelBtn}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Register Walk-in Customer */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-charcoal-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-gold" />
                  <span>{t.walkInModalTitle}</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {language === 'en' ? 'Registers customer at the exact end of the shared queue' : 'ગ્રાહકને કતારના અંતમાં ઉમેરે છે'}
                </p>
              </div>
              <button
                onClick={() => setShowWalkInModal(false)}
                className="text-gray-400 hover:text-charcoal-900 p-1 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {walkInError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{walkInError}</span>
              </div>
            )}

            <form onSubmit={handleWalkInSubmit} className="space-y-4">
              {/* Customer Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                  {t.fullNameLabel} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  placeholder="e.g. Ramesh Bhai"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gold"
                />
              </div>

              {/* Phone (10 digits) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700">
                    {t.phoneLabel} <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-gray-400">
                    {walkInPhone.length}/10 digits
                  </span>
                </div>
                <input
                  type="tel"
                  value={walkInPhone}
                  onChange={(e) => setWalkInPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:border-gold"
                />
              </div>

              {/* Services (1 to 3 max) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700">
                    {t.selectServicesLabel} <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs font-semibold text-gold-dark">
                    {walkInSelectedServices.length}/3
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                  {services.map((service) => {
                    const isSelected = walkInSelectedServices.some((s) => s.id === service.id);
                    return (
                      <div
                        key={service.id}
                        onClick={() => {
                          if (isSelected) {
                            setWalkInSelectedServices(walkInSelectedServices.filter((s) => s.id !== service.id));
                          } else if (walkInSelectedServices.length < 3) {
                            setWalkInSelectedServices([...walkInSelectedServices, service]);
                          }
                        }}
                        className={`p-2.5 rounded-lg border text-left cursor-pointer text-xs transition-colors ${
                          isSelected
                            ? 'bg-gold-50 border-gold font-bold text-charcoal-900'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p>{language === 'gu' ? service.name_gu : service.name_en}</p>
                        <p className="text-[10px] text-gray-500">₹{service.price} • {service.duration}m</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Barber Preference */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                  {t.preferredBarberLabel}
                </label>
                <select
                  value={walkInBarberPref}
                  onChange={(e) => setWalkInBarberPref(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-gold"
                >
                  <option value="Any">{t.anyBarber}</option>
                  {barbers.filter((b) => b.is_on_duty).map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name} {b.is_on_break ? `(${t.onBreak})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Totals Preview */}
              <div className="p-3 rounded-xl bg-gray-50 flex items-center justify-between text-xs font-semibold">
                <span>{language === 'en' ? 'Walk-in Totals:' : 'કુલ વિગત:'} {walkInTotalDuration}m</span>
                <span className="text-sm font-black text-charcoal-900">₹{walkInTotalPrice}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={walkInSubmitting}
                  className="flex-1 py-3 rounded-xl bg-gold text-charcoal-900 font-bold text-sm hover:bg-gold-light transition-colors shadow-md flex items-center justify-center gap-2"
                >
                  {walkInSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Registering...</span>
                    </>
                  ) : (
                    <span>Register Walk-in</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowWalkInModal(false)}
                  className="px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors"
                >
                  {t.closeBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Confirm Mark No-Show */}
      {confirmNoShowToken && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-5 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-charcoal-900">
                {t.confirmNoShowTitle}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {t.confirmNoShowMsg} (Token: <span className="font-mono font-bold text-red-600">{confirmNoShowToken}</span>)
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={handleMarkNoShow}
                disabled={actionLoading}
                className="w-full py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{t.confirmNoShowYes}</span>}
              </button>

              <button
                onClick={() => setConfirmNoShowToken(null)}
                disabled={actionLoading}
                className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors"
              >
                {t.closeBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Confirm Cancellation */}
      {confirmCancelToken && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-5 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-charcoal-900">
                {t.cancelConfirmTitle}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {t.cancelConfirmMessage} (Token: <span className="font-mono font-bold text-charcoal-900">{confirmCancelToken}</span>)
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={handleCancelEntry}
                disabled={actionLoading}
                className="w-full py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{t.confirmCancelBtn}</span>}
              </button>

              <button
                onClick={() => setConfirmCancelToken(null)}
                disabled={actionLoading}
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
