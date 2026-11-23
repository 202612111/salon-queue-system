import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Users, Check, AlertCircle, Clock, Sparkles, 
  ArrowRight, ShieldAlert, Scissors, Info, ArrowLeft, Loader2
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { api } from '../services/api';
import { socket } from '../services/socket';
import { Service, Barber, QueueSummary, QueueEntry } from '../../../shared/types';

export const JoinPage: React.FC = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  // State
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [barberPreference, setBarberPreference] = useState<string>('Any');
  
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [summary, setSummary] = useState<QueueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Validation & Error states
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [existingActiveEntry, setExistingActiveEntry] = useState<QueueEntry | null>(null);

  // Fetch initial data
  const loadData = async () => {
    try {
      const [servicesData, summaryData] = await Promise.all([
        api.getServices(),
        api.getSummary(),
      ]);
      setServices(servicesData);
      setSummary(summaryData);
      setBarbers(summaryData.barbers || []);
    } catch (err) {
      console.error('Failed to load join form data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    socket.on('queue:updated', handleUpdate);
    socket.on('barber:updated', handleUpdate);

    return () => {
      socket.off('queue:updated', handleUpdate);
      socket.off('barber:updated', handleUpdate);
    };
  }, []);

  // Handle service toggle (Max 3 rule)
  const toggleService = (service: Service) => {
    setFormErrors((prev) => ({ ...prev, service: '' }));
    const isSelected = selectedServices.some((s) => s.id === service.id);

    if (isSelected) {
      setSelectedServices(selectedServices.filter((s) => s.id !== service.id));
    } else {
      if (selectedServices.length >= 3) {
        setFormErrors((prev) => ({
          ...prev,
          service: t.maxServicesNotice,
        }));
        return;
      }
      setSelectedServices([...selectedServices, service]);
    }
  };

  // Live Calculations
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);

  // Estimated wait computation for this new customer
  const workingBarbersCount = summary?.working_barbers_count ?? 1;
  const currentWaitingCount = summary?.waiting_count ?? 0;
  
  let estimatedWait = 0;
  if (workingBarbersCount === 0) {
    estimatedWait = 0; // Barbers unavailable
  } else if (currentWaitingCount === 0) {
    estimatedWait = 5; // Ready right away
  } else {
    estimatedWait = Math.max(5, (summary?.estimated_wait_minutes ?? 15) + Math.round(totalDuration / workingBarbersCount));
  }

  // Selected barber break / duty check
  const selectedBarberObj = barbers.find((b) => b.name === barberPreference);
  const isSelectedBarberOnBreak = selectedBarberObj?.is_on_break;
  const isSelectedBarberOffDuty = selectedBarberObj && !selectedBarberObj.is_on_duty;

  // Phone input sanitizer
  const handlePhoneChange = (val: string) => {
    const numeric = val.replace(/\D/g, '').slice(0, 10);
    setPhone(numeric);
    setExistingActiveEntry(null);
    if (formErrors.phone) {
      setFormErrors((prev) => ({ ...prev, phone: '' }));
    }
  };

  // Submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};

    if (!customerName.trim()) {
      errors.name = t.nameRequiredError;
    }

    if (phone.length !== 10) {
      errors.phone = t.invalidPhoneError;
    }

    if (selectedServices.length === 0) {
      errors.service = t.serviceRequiredError;
    } else if (selectedServices.length > 3) {
      errors.service = t.maxServicesNotice;
    }

    if (isSelectedBarberOnBreak) {
      errors.barber = `${barberPreference} ${language === 'en' ? 'is on break. Please choose another barber or "Any".' : 'વિરામ પર છે. કૃપા કરીને અન્ય પસંદ કરો.'}`;
    }

    if (isSelectedBarberOffDuty) {
      errors.barber = `${barberPreference} ${language === 'en' ? 'is off duty today.' : 'આજે રજા પર છે.'}`;
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    setFormErrors({});

    try {
      const response = await api.joinQueue({
        customer_name: customerName.trim(),
        phone: phone.trim(),
        service_ids: selectedServices.map((s) => s.id),
        barber_preference: barberPreference,
      });

      if (!response.success) {
        if (response.existingEntry) {
          setExistingActiveEntry(response.existingEntry);
          setFormErrors({
            general: t.alreadyInQueueError,
          });
        } else {
          setFormErrors({
            general: response.error || 'Failed to join queue',
          });
        }
        return;
      }

      if (response.entry) {
        // Navigate to Screen 3: My Status
        navigate(`/status/${response.entry.token}`);
      }
    } catch (err: any) {
      setFormErrors({
        general: err.message || 'An unexpected error occurred while joining the queue.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading salon services & barbers...</p>
      </div>
    );
  }

  // If online queue is closed, show notice
  if (summary && !summary.is_online_queue_open) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="p-8 rounded-3xl bg-white border border-gray-200 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-charcoal-900">
            {language === 'en' ? 'Online Queue Unavailable' : 'ઓનલાઇન કતાર બંધ છે'}
          </h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            {summary.salon_status === 'salon_closed' ? t.salonClosedBanner : t.queueClosedBanner}
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/reception"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gold text-charcoal-900 font-bold hover:bg-gold-light transition-colors"
            >
              <span>{language === 'en' ? 'Go to Reception for Walk-in' : 'વૉક-ઇન માટે રિસેપ્શન પર જાઓ'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
            >
              <span>{language === 'en' ? 'Back to Home' : 'મુખ્ય પૃષ્ઠ પર પાછા'}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gold transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Back to Home' : 'મુખ્ય પૃષ્ઠ'}</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 tracking-tight">
            {t.joinTitle}
          </h1>
          <p className="text-sm text-gray-500">{t.joinSubtitle}</p>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-charcoal-800 text-white text-xs font-medium border border-charcoal-700">
          <Clock className="w-3.5 h-3.5 text-gold" />
          <span>{summary?.waiting_count ?? 0} {t.peopleWaiting}</span>
        </div>
      </div>

      {/* Existing Active Token Warning Banner */}
      {existingActiveEntry && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">{t.alreadyInQueueError}</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {language === 'en' 
                  ? `Active Token ${existingActiveEntry.token} is already waiting in queue.` 
                  : `સક્રિય ટોકન ${existingActiveEntry.token} પહેલેથી જ કતારમાં છે.`}
              </p>
            </div>
          </div>
          <Link
            to={`/status/${existingActiveEntry.token}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-colors shrink-0 shadow-sm"
          >
            <span>{t.viewExistingTokenBtn}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* General Submission Error */}
      {formErrors.general && !existingActiveEntry && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{formErrors.general}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Main Form Inputs (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-6">

            {/* 1. Customer Name & Phone Details Card */}
            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-5">
              <h2 className="text-base font-bold text-charcoal-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-gold/20 text-gold-dark text-xs flex items-center justify-center font-bold">1</span>
                <span>{language === 'en' ? 'Customer Details' : 'ગ્રાહકની વિગત'}</span>
              </h2>

              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1.5">
                    {t.fullNameLabel} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                    }}
                    placeholder={t.fullNamePlaceholder}
                    className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${
                      formErrors.name 
                        ? 'border-red-400 focus:ring-red-300 bg-red-50/20' 
                        : 'border-gray-200 focus:border-gold focus:ring-gold/20 bg-gray-50/50'
                    }`}
                  />
                  {formErrors.name && (
                    <p className="text-xs text-red-600 mt-1 font-medium">{formErrors.name}</p>
                  )}
                </div>

                {/* Phone Number (10 digits) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700">
                      {t.phoneLabel} <span className="text-red-500">*</span>
                    </label>
                    <span className={`text-[11px] font-mono font-semibold ${
                      phone.length === 10 ? 'text-emerald-600' : 'text-gray-400'
                    }`}>
                      {phone.length}/10 digits
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-sm font-semibold text-gray-400 select-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder={t.phonePlaceholder}
                      className={`w-full pl-14 pr-4 py-3 rounded-xl border text-sm transition-all font-mono tracking-wider focus:outline-none focus:ring-2 ${
                        formErrors.phone 
                          ? 'border-red-400 focus:ring-red-300 bg-red-50/20' 
                          : phone.length === 10
                          ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-100 bg-emerald-50/10'
                          : 'border-gray-200 focus:border-gold focus:ring-gold/20 bg-gray-50/50'
                      }`}
                    />
                  </div>
                  {formErrors.phone && (
                    <p className="text-xs text-red-600 mt-1 font-medium">{formErrors.phone}</p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1">
                    {language === 'en' 
                      ? 'One active token permitted per 10-digit mobile number.' 
                      : 'પ્રત્યેક ૧૦-અંકના મોબાઇલ નંબર દીઠ ફક્ત ૧ સક્રિય ટોકન માન્ય છે.'}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Select Services (Max 3) Card */}
            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-charcoal-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gold/20 text-gold-dark text-xs flex items-center justify-center font-bold">2</span>
                  <span>{t.selectServicesLabel}</span>
                  <span className="text-red-500">*</span>
                </h2>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  selectedServices.length === 3 
                    ? 'bg-amber-100 text-amber-800' 
                    : selectedServices.length > 0
                    ? 'bg-gold-50 text-gold-dark'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {selectedServices.length}/3 {t.selectedServicesCount}
                </span>
              </div>

              {formErrors.service && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{formErrors.service}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {services.map((service) => {
                  const isSelected = selectedServices.some((s) => s.id === service.id);
                  const isMaxReached = selectedServices.length >= 3 && !isSelected;

                  return (
                    <div
                      key={service.id}
                      onClick={() => !isMaxReached && toggleService(service)}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-gold bg-gold-50/40 shadow-sm ring-1 ring-gold'
                          : isMaxReached
                          ? 'border-gray-200 bg-gray-50/50 opacity-50 cursor-not-allowed'
                          : 'border-gray-200 hover:border-gold/50 bg-white hover:bg-gray-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <p className="font-bold text-sm text-charcoal-900">
                            {language === 'gu' ? service.name_gu : service.name_en}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-gray-400" />
                              <span>{service.duration} {t.minutes}</span>
                            </span>
                            <span className="font-semibold text-charcoal-700">
                              ₹{service.price}
                            </span>
                          </div>
                        </div>

                        {/* Checkmark circle */}
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'bg-gold text-charcoal-900' : 'border border-gray-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Barber Preference Selection */}
            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-charcoal-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-gold/20 text-gold-dark text-xs flex items-center justify-center font-bold">3</span>
                <span>{t.preferredBarberLabel}</span>
              </h2>

              {formErrors.barber && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{formErrors.barber}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option: Any Barber */}
                <div
                  onClick={() => {
                    setBarberPreference('Any');
                    setFormErrors((prev) => ({ ...prev, barber: '' }));
                  }}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative ${
                    barberPreference === 'Any'
                      ? 'border-gold bg-gold-50/40 shadow-sm ring-1 ring-gold'
                      : 'border-gray-200 hover:border-gold/50 bg-white hover:bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-sm text-charcoal-900">{t.anyBarber}</p>
                      <p className="text-xs text-emerald-600 font-medium mt-1">
                        {language === 'en' ? 'First available barber calls you' : 'સૌથી પહેલા ઉપલબ્ધ વાળંદ તમને બોલાવશે'}
                      </p>
                    </div>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      barberPreference === 'Any' ? 'bg-gold text-charcoal-900' : 'border border-gray-300'
                    }`}>
                      {barberPreference === 'Any' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                </div>

                {/* Specific Barbers */}
                {barbers.map((barber) => {
                  const isSelected = barberPreference === barber.name;
                  const isBreak = barber.is_on_break;
                  const isOff = !barber.is_on_duty;

                  return (
                    <div
                      key={barber.id}
                      onClick={() => {
                        setBarberPreference(barber.name);
                        setFormErrors((prev) => ({ ...prev, barber: '' }));
                      }}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-gold bg-gold-50/40 shadow-sm ring-1 ring-gold'
                          : 'border-gray-200 hover:border-gold/50 bg-white hover:bg-gray-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-sm text-charcoal-900">{barber.name}</p>
                          <div className="mt-1">
                            {isOff ? (
                              <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                {t.offDuty}
                              </span>
                            ) : isBreak ? (
                              <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                                {t.onBreak} ({language === 'en' ? 'Unavailable' : 'વિરામ'})
                              </span>
                            ) : barber.current_token ? (
                              <span className="text-[11px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                                {t.busy} ({language === 'en' ? 'Serving' : 'સેવા ચાલુ'})
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                {t.available}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-gold text-charcoal-900' : 'border border-gray-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {isSelectedBarberOnBreak && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    {language === 'en' 
                      ? `${barberPreference} is currently on break. You cannot be assigned to them until they resume duty.` 
                      : `${barberPreference} હાલમાં વિરામ પર છે. વિરામ પૂર્ણ ન થાય ત્યાં સુધી સોંપી શકાશે નહીં.`}
                  </span>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Live Booking Summary Card (Sticky) */}
          <div className="lg:col-span-1 lg:sticky lg:top-24 space-y-4">
            <div className="p-6 rounded-3xl bg-charcoal-900 text-white border border-charcoal-700 shadow-xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-gold" />
                  <span>{t.summaryCardTitle}</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {language === 'en' ? 'Updates dynamically with your choices' : 'તમારી પસંદગી મુજબ તાત્કાલિક ગણતરી'}
                </p>
              </div>

              {/* Selected Services Listing */}
              <div className="space-y-2 border-t border-charcoal-800 pt-4">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                  {t.selectedServices} ({selectedServices.length}/3)
                </span>
                {selectedServices.length === 0 ? (
                  <p className="text-xs text-gray-500 italic py-2">
                    {language === 'en' ? 'No services selected yet.' : 'હજી કોઈ સેવા પસંદ કરી નથી.'}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedServices.map((service) => (
                      <div key={service.id} className="flex items-center justify-between text-xs py-1 border-b border-charcoal-800/60">
                        <span className="text-gray-200">
                          {language === 'gu' ? service.name_gu : service.name_en}
                        </span>
                        <span className="font-semibold text-gold">₹{service.price}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals & Estimated Wait Metrics */}
              <div className="space-y-3 border-t border-charcoal-800 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{t.totalDuration}</span>
                  <span className="font-bold text-white flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gold" />
                    <span>{totalDuration} {t.minutes}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{t.barberPreference}</span>
                  <span className="font-bold text-white">{barberPreference}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{t.approxWait}</span>
                  <span className="font-bold text-emerald-400">
                    {workingBarbersCount === 0 ? 'N/A' : `~${estimatedWait} min`}
                  </span>
                </div>

                <div className="flex items-center justify-between text-base pt-2 border-t border-charcoal-700">
                  <span className="font-bold text-gray-300">{t.totalPrice}</span>
                  <span className="text-2xl font-extrabold text-gold">₹{totalPrice}</span>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={submitting || isSelectedBarberOnBreak || isSelectedBarberOffDuty}
                className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg ${
                  submitting || isSelectedBarberOnBreak || isSelectedBarberOffDuty
                    ? 'bg-charcoal-700 text-gray-500 cursor-not-allowed border border-charcoal-600'
                    : 'bg-gradient-to-r from-gold via-gold-light to-gold text-charcoal-900 hover:shadow-gold/25 hover:scale-[1.02] active:scale-[0.99]'
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{language === 'en' ? 'Generating Token...' : 'ટોકન જનરેટ થાય છે...'}</span>
                  </>
                ) : (
                  <>
                    <span>{t.confirmJoinBtn}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-[11px] text-gray-400 text-center leading-normal">
                {t.approximateNotice}
              </p>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
};
