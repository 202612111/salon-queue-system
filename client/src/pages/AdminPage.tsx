import React, { useState, useEffect } from 'react';
import { 
  Settings, Scissors, Users, Clock, DollarSign, 
  TrendingUp, Plus, Edit2, CheckCircle2, ShieldOff, 
  Coffee, AlertCircle, Loader2, Sparkles, XCircle, Save, Check
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { api } from '../services/api';
import { socket } from '../services/socket';
import { Service, Barber, QueueSummary, SalonSettings } from '../../../shared/types';

export const AdminPage: React.FC = () => {
  const { t, language } = useLanguage();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'stats' | 'services' | 'barbers' | 'operations'>('stats');

  // Data States
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [summary, setSummary] = useState<QueueSummary | null>(null);
  const [stats, setStats] = useState<{
    today: string;
    total_served: number;
    estimated_revenue: number;
    average_wait_minutes: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Service Modal State (Add / Edit)
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [serviceNameEn, setServiceNameEn] = useState('');
  const [serviceNameGu, setServiceNameGu] = useState('');
  const [serviceDuration, setServiceDuration] = useState<number | ''>(30);
  const [servicePrice, setServicePrice] = useState<number | ''>(250);
  const [serviceIsActive, setServiceIsActive] = useState(true);
  const [serviceModalError, setServiceModalError] = useState<string | null>(null);
  const [serviceSubmitting, setServiceSubmitting] = useState(false);

  // Add Barber Modal State
  const [showAddBarberModal, setShowAddBarberModal] = useState(false);
  const [newBarberName, setNewBarberName] = useState('');
  const [addBarberError, setAddBarberError] = useState<string | null>(null);
  const [barberSubmitting, setBarberSubmitting] = useState(false);

  // Operating Hours State
  const [openTime, setOpenTime] = useState('00:00');
  const [closeTime, setCloseTime] = useState('23:59');
  const [hoursSaving, setHoursSaving] = useState(false);
  const [hoursSavedSuccess, setHoursSavedSuccess] = useState(false);

  // Load all admin data
  const loadAdminData = async () => {
    try {
      const [servs, barbs, sum, st] = await Promise.all([
        api.getServices(true), // get all services including inactive
        api.getBarbers(),
        api.getSummary(),
        api.getAdminStats(),
      ]);
      setServices(servs);
      setBarbers(barbs);
      setSummary(sum);
      setStats(st);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();

    const handleUpdate = () => {
      loadAdminData();
    };

    socket.on('queue:updated', handleUpdate);
    socket.on('barber:updated', handleUpdate);

    return () => {
      socket.off('queue:updated', handleUpdate);
      socket.off('barber:updated', handleUpdate);
    };
  }, []);

  // Open Service Modal for Add
  const handleOpenAddService = () => {
    setEditingServiceId(null);
    setServiceNameEn('');
    setServiceNameGu('');
    setServiceDuration(30);
    setServicePrice(250);
    setServiceIsActive(true);
    setServiceModalError(null);
    setShowServiceModal(true);
  };

  // Open Service Modal for Edit
  const handleOpenEditService = (service: Service) => {
    setEditingServiceId(service.id);
    setServiceNameEn(service.name_en);
    setServiceNameGu(service.name_gu);
    setServiceDuration(service.duration);
    setServicePrice(service.price);
    setServiceIsActive(service.is_active);
    setServiceModalError(null);
    setShowServiceModal(true);
  };

  // Service Form Submission (Add or Update)
  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServiceModalError(null);

    if (!serviceNameEn.trim() || !serviceNameGu.trim()) {
      setServiceModalError('Both English and Gujarati service names are required.');
      return;
    }
    if (!serviceDuration || Number(serviceDuration) <= 0) {
      setServiceModalError('Duration must be greater than 0 minutes.');
      return;
    }
    if (servicePrice === '' || Number(servicePrice) < 0) {
      setServiceModalError('Price must be a valid non-negative number.');
      return;
    }

    setServiceSubmitting(true);
    try {
      if (editingServiceId) {
        await api.updateService(editingServiceId, {
          name_en: serviceNameEn.trim(),
          name_gu: serviceNameGu.trim(),
          duration: Number(serviceDuration),
          price: Number(servicePrice),
          is_active: serviceIsActive,
        });
      } else {
        await api.addService({
          name_en: serviceNameEn.trim(),
          name_gu: serviceNameGu.trim(),
          duration: Number(serviceDuration),
          price: Number(servicePrice),
          is_active: serviceIsActive,
        });
      }
      setShowServiceModal(false);
      loadAdminData();
    } catch (err: any) {
      setServiceModalError(err.message || 'Failed to save service.');
    } finally {
      setServiceSubmitting(false);
    }
  };

  // Quick Service Toggle Active / Inactive
  const handleToggleServiceActive = async (service: Service) => {
    try {
      await api.updateService(service.id, {
        is_active: !service.is_active,
      });
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to update service status');
    }
  };

  // Barber Duty Toggle
  const handleToggleBarberDuty = async (barber: Barber) => {
    try {
      await api.toggleBarberDuty(barber.name, !barber.is_on_duty);
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle duty');
    }
  };

  // Barber Break Toggle
  const handleToggleBarberBreak = async (barber: Barber) => {
    try {
      await api.toggleBarberBreak(barber.name, !barber.is_on_break);
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle break');
    }
  };

  // Add New Barber
  const handleAddBarberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddBarberError(null);
    if (!newBarberName.trim()) {
      setAddBarberError('Barber name is required.');
      return;
    }

    setBarberSubmitting(true);
    try {
      const res = await api.addBarber(newBarberName.trim());
      if (!res.success) {
        setAddBarberError(res.error || 'Failed to add barber');
        return;
      }
      setNewBarberName('');
      setShowAddBarberModal(false);
      loadAdminData();
    } catch (err: any) {
      setAddBarberError(err.message || 'Error creating barber');
    } finally {
      setBarberSubmitting(false);
    }
  };

  // Online Queue Master Toggle
  const handleToggleOnlineQueue = async () => {
    if (!summary) return;
    try {
      await api.toggleOnlineQueue(!summary.is_online_queue_open);
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle online queue');
    }
  };

  // Save Operating Hours
  const handleSaveHours = async (e: React.FormEvent) => {
    e.preventDefault();
    setHoursSaving(true);
    try {
      await api.updateOperatingHours(openTime, closeTime);
      setHoursSavedSuccess(true);
      setTimeout(() => setHoursSavedSuccess(false), 3000);
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to save hours');
    } finally {
      setHoursSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading salon administration settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-8">
      
      {/* Admin Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-charcoal-100 text-charcoal-800 text-xs font-bold uppercase tracking-wider mb-2">
            <Settings className="w-3.5 h-3.5 text-gold" />
            <span>MANAGER PORTAL</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 tracking-tight">
            {t.adminTitle}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            {t.adminSubtitle}
          </p>
        </div>

        {/* Online Queue Quick Status Pill */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleOnlineQueue}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 shadow-sm ${
              summary?.is_online_queue_open
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${summary?.is_online_queue_open ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span>{summary?.is_online_queue_open ? t.onlineQueueOpen : t.onlineQueueClosed}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-1 text-sm font-bold">
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'stats'
              ? 'bg-charcoal-900 text-white shadow-sm'
              : 'text-gray-500 hover:text-charcoal-900 hover:bg-gray-100'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-gold" />
          <span>{t.tabAnalytics}</span>
        </button>

        <button
          onClick={() => setActiveTab('services')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'services'
              ? 'bg-charcoal-900 text-white shadow-sm'
              : 'text-gray-500 hover:text-charcoal-900 hover:bg-gray-100'
          }`}
        >
          <Scissors className="w-4 h-4 text-gold" />
          <span>{t.tabServices} ({services.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('barbers')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'barbers'
              ? 'bg-charcoal-900 text-white shadow-sm'
              : 'text-gray-500 hover:text-charcoal-900 hover:bg-gray-100'
          }`}
        >
          <Users className="w-4 h-4 text-gold" />
          <span>{t.tabBarbers} ({barbers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('operations')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'operations'
              ? 'bg-charcoal-900 text-white shadow-sm'
              : 'text-gray-500 hover:text-charcoal-900 hover:bg-gray-100'
          }`}
        >
          <Clock className="w-4 h-4 text-gold" />
          <span>{t.tabSettings}</span>
        </button>
      </div>

      {/* TAB 1: DAILY ANALYTICS & STATS */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-charcoal-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gold" />
              <span>{t.todayStats} ({stats?.today || 'Today'})</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Stat 1: Total Served Today */}
            <div className="p-6 rounded-3xl bg-white border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {t.totalServedToday}
                </p>
                <p className="text-3xl font-black text-charcoal-900 mt-1">
                  {stats?.total_served ?? 0}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {language === 'en' ? 'Completed services' : 'પૂર્ણ થયેલ સેવાઓ'}
                </p>
              </div>
            </div>

            {/* Stat 2: Average Wait Time */}
            <div className="p-6 rounded-3xl bg-white border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Clock className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {t.avgWaitTimeToday}
                </p>
                <p className="text-3xl font-black text-charcoal-900 mt-1">
                  {stats?.average_wait_minutes ?? 0}m
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {language === 'en' ? 'Average customer wait' : 'સરેરાશ પ્રતીક્ષા સમય'}
                </p>
              </div>
            </div>

            {/* Stat 3: Estimated Revenue */}
            <div className="p-6 rounded-3xl bg-white border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-gold flex items-center justify-center shrink-0">
                <DollarSign className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {t.totalRevenueEstimated}
                </p>
                <p className="text-3xl font-black text-charcoal-900 mt-1">
                  ₹{stats?.estimated_revenue ?? 0}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {language === 'en' ? 'Gross service revenue' : 'કુલ સેવાની આવક'}
                </p>
              </div>
            </div>
          </div>

          {/* Current Live Queue Status Overview */}
          <div className="p-6 rounded-3xl bg-white border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-charcoal-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gold" />
              <span>{language === 'en' ? 'Current Queue Snapshot' : 'હાલની કતાર સ્થિતિ'}</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-4 rounded-2xl bg-gray-50">
                <p className="text-xs text-gray-400 font-medium">Waiting in Line</p>
                <p className="text-2xl font-black text-charcoal-900 mt-1">{summary?.waiting_count ?? 0}</p>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50">
                <p className="text-xs text-gray-400 font-medium">Est. Wait Now</p>
                <p className="text-2xl font-black text-charcoal-900 mt-1">~{summary?.estimated_wait_minutes ?? 0}m</p>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50">
                <p className="text-xs text-gray-400 font-medium">Barbers on Duty</p>
                <p className="text-2xl font-black text-charcoal-900 mt-1">{summary?.working_barbers_count ?? 0}</p>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50">
                <p className="text-xs text-gray-400 font-medium">Online Queue</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">{summary?.is_online_queue_open ? 'OPEN' : 'PAUSED'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SERVICES & PRICING (CRUD) */}
      {activeTab === 'services' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-charcoal-900 flex items-center gap-2">
                <Scissors className="w-5 h-5 text-gold" />
                <span>{t.tabServices}</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {language === 'en' 
                  ? 'Manage catalog, prices, and bilingual names. Changes apply to new bookings immediately.' 
                  : 'સેવાઓ અને કિંમતોનું સંચાલન.'}
              </p>
            </div>

            <button
              onClick={handleOpenAddService}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold text-charcoal-900 font-bold text-xs hover:bg-gold-light transition-all shadow-md self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addServiceBtn}</span>
            </button>
          </div>

          {/* Services Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">{t.serviceNameEn}</th>
                  <th className="py-3 px-3">{t.serviceNameGu}</th>
                  <th className="py-3 px-3">{t.durationMin}</th>
                  <th className="py-3 px-3">{t.priceInr}</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {services.map((service, idx) => (
                  <tr key={service.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-3 font-bold text-gray-400">{idx + 1}</td>
                    <td className="py-3.5 px-3 font-bold text-charcoal-900">{service.name_en}</td>
                    <td className="py-3.5 px-3 text-charcoal-700">{service.name_gu}</td>
                    <td className="py-3.5 px-3 font-mono font-semibold text-charcoal-800">{service.duration}m</td>
                    <td className="py-3.5 px-3 font-bold text-charcoal-900">₹{service.price}</td>
                    
                    {/* Status Toggle Badge */}
                    <td className="py-3.5 px-3">
                      <button
                        onClick={() => handleToggleServiceActive(service)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${
                          service.is_active
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title="Click to toggle status"
                      >
                        {service.is_active ? t.statusActive : t.statusInactive}
                      </button>
                    </td>

                    {/* Edit Action */}
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => handleOpenEditService(service)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gold hover:text-gold text-charcoal-700 text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>{t.editBtn}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BARBERS ROSTER & DUTY */}
      {activeTab === 'barbers' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-charcoal-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-gold" />
                <span>{t.tabBarbers}</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {language === 'en' 
                  ? 'Manage staff roster, duty schedules, and break availability.' 
                  : 'વાળંદ યાદી અને હાજરી સંચાલન.'}
              </p>
            </div>

            <button
              onClick={() => {
                setNewBarberName('');
                setAddBarberError(null);
                setShowAddBarberModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-charcoal-900 text-white font-bold text-xs hover:bg-charcoal-800 border border-charcoal-700 transition-all shadow-md self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 text-gold" />
              <span>Add New Barber</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {barbers.map((barber) => (
              <div
                key={barber.id}
                className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-base text-charcoal-900">{barber.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    !barber.is_on_duty
                      ? 'bg-gray-200 text-gray-700'
                      : barber.is_on_break
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {!barber.is_on_duty ? t.offDuty : barber.is_on_break ? t.onBreak : t.available}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Duty Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">On Duty Today:</span>
                    <button
                      onClick={() => handleToggleBarberDuty(barber)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                        barber.is_on_duty
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {barber.is_on_duty ? 'On Duty' : 'Off Duty'}
                    </button>
                  </div>

                  {/* Break Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Break Status:</span>
                    <button
                      onClick={() => handleToggleBarberBreak(barber)}
                      disabled={!barber.is_on_duty}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                        barber.is_on_break
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      } ${!barber.is_on_duty ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {barber.is_on_break ? 'On Break' : 'Available'}
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200 text-center">
                  <span className="text-[11px] text-gray-400 font-medium">
                    {barber.current_token ? `Serving ${barber.current_token}` : 'No active session'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SALON OPERATIONS & OPENING HOURS */}
      {activeTab === 'operations' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-charcoal-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gold" />
              <span>{t.queueOpeningHours}</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {t.cutoffTimeNotice}
            </p>
          </div>

          <form onSubmit={handleSaveHours} className="space-y-5 max-w-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                  {t.openTime}
                </label>
                <input
                  type="time"
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gold font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                  {t.closeTime}
                </label>
                <input
                  type="time"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gold font-mono"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Operating Cutoff Rule</span>
              </p>
              <p className="text-amber-800 leading-relaxed">
                Online queue automatically closes 30 minutes before salon closing time. Reception walk-ins remain accepted until closing.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={hoursSaving}
                className="px-6 py-3 rounded-xl bg-charcoal-900 text-white font-bold text-xs hover:bg-charcoal-800 transition-colors shadow-md flex items-center gap-2"
              >
                {hoursSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-gold" />}
                <span>Save Operating Hours</span>
              </button>

              {hoursSavedSuccess && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  <span>Hours updated successfully!</span>
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ADD / EDIT SERVICE */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-lg font-bold text-charcoal-900 flex items-center gap-2">
                <Scissors className="w-5 h-5 text-gold" />
                <span>{editingServiceId ? 'Edit Service' : t.addServiceBtn}</span>
              </h3>
              <button
                onClick={() => setShowServiceModal(false)}
                className="text-gray-400 hover:text-charcoal-900 p-1 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {serviceModalError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{serviceModalError}</span>
              </div>
            )}

            <form onSubmit={handleServiceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                  {t.serviceNameEn} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={serviceNameEn}
                  onChange={(e) => setServiceNameEn(e.target.value)}
                  placeholder="e.g. Royal Beard Grooming"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                  {t.serviceNameGu} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={serviceNameGu}
                  onChange={(e) => setServiceNameGu(e.target.value)}
                  placeholder="e.g. રોયલ દાઢી ગ્રૂમિંગ"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                    {t.durationMin} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={serviceDuration}
                    onChange={(e) => setServiceDuration(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gold font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                    {t.priceInr} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gold font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="serviceActiveCheck"
                  checked={serviceIsActive}
                  onChange={(e) => setServiceIsActive(e.target.checked)}
                  className="w-4 h-4 text-gold rounded border-gray-300 focus:ring-gold"
                />
                <label htmlFor="serviceActiveCheck" className="text-xs font-semibold text-charcoal-800 cursor-pointer">
                  Service is active and available in catalog
                </label>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="submit"
                  disabled={serviceSubmitting}
                  className="flex-1 py-3 rounded-xl bg-gold text-charcoal-900 font-bold text-sm hover:bg-gold-light transition-colors shadow-md flex items-center justify-center gap-2"
                >
                  {serviceSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{t.saveBtn}</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors"
                >
                  {t.closeBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW BARBER */}
      {showAddBarberModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-lg font-bold text-charcoal-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-gold" />
                <span>Add New Barber</span>
              </h3>
              <button
                onClick={() => setShowAddBarberModal(false)}
                className="text-gray-400 hover:text-charcoal-900 p-1 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {addBarberError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{addBarberError}</span>
              </div>
            )}

            <form onSubmit={handleAddBarberSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                  Barber Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newBarberName}
                  onChange={(e) => setNewBarberName(e.target.value)}
                  placeholder="e.g. Sanjay"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gold"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={barberSubmitting}
                  className="flex-1 py-3 rounded-xl bg-gold text-charcoal-900 font-bold text-sm hover:bg-gold-light transition-colors shadow-md flex items-center justify-center gap-2"
                >
                  {barberSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Add Barber</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddBarberModal(false)}
                  className="px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors"
                >
                  {t.closeBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
