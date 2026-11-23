import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Crown, Globe, Menu, X, Clock, Tv, Scissors, Users, Settings } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export const Navbar: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If on TV display screen, hide the navbar for full-screen clean kiosk view
  if (location.pathname === '/display') {
    return (
      <div className="bg-charcoal-900 border-b border-charcoal-700 px-4 py-2 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-gold" />
          <span className="font-semibold text-gray-200">{t.salonName}</span>
          <span className="bg-charcoal-800 text-gold text-[10px] px-2 py-0.5 rounded font-mono">TV DISPLAY</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLanguage(language === 'en' ? 'gu' : 'en')}
            className="flex items-center gap-1 text-gold hover:text-white px-2 py-1 rounded bg-charcoal-800 border border-charcoal-700"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'ગુજરાતી' : 'English'}</span>
          </button>
          <Link to="/" className="text-gray-400 hover:text-white underline">
            Exit TV Mode
          </Link>
        </div>
      </div>
    );
  }

  const navLinks = [
    { to: '/', label: t.home, icon: Clock },
    { to: '/join', label: t.joinQueue, icon: Users },
    { to: '/reception', label: t.reception, icon: Scissors },
    { to: '/barber/Amit', label: t.barberView, icon: Scissors },
    { to: '/display', label: t.tvDisplay, icon: Tv },
    { to: '/admin', label: t.settings, icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 bg-charcoal-900 border-b border-charcoal-700 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Salon Name */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-dark p-0.5 flex items-center justify-center shadow-lg shadow-gold/20">
              <div className="w-full h-full bg-charcoal-900 rounded-[10px] flex items-center justify-center">
                <Crown className="w-5 h-5 text-gold group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                {t.salonName}
              </span>
              <span className="block text-[11px] text-gray-400 tracking-wider uppercase font-medium">
                {t.salonTagline}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to || (link.to.startsWith('/barber') && location.pathname.startsWith('/barber'));
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-charcoal-800 text-gold border border-gold/30 shadow-sm'
                      : 'text-gray-300 hover:text-white hover:bg-charcoal-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Section: Language Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLanguage(language === 'en' ? 'gu' : 'en')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-charcoal-800 border border-charcoal-700 text-gray-200 hover:border-gold hover:text-gold transition-colors shadow-sm"
              title="Toggle English / ગુજરાતી"
            >
              <Globe className="w-4 h-4 text-gold" />
              <span>{language === 'en' ? 'ગુજરાતી' : 'English'}</span>
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-charcoal-800 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-charcoal-900 border-b border-charcoal-700 px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-charcoal-800 text-gold border border-gold/30'
                    : 'text-gray-300 hover:bg-charcoal-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
};
