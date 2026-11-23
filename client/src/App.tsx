import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { JoinPage } from './pages/JoinPage';
import { StatusPage } from './pages/StatusPage';
import { ReceptionPage } from './pages/ReceptionPage';
import { BarberPage } from './pages/BarberPage';
import { DisplayPage } from './pages/DisplayPage';
import { AdminPage } from './pages/AdminPage';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-charcoal-800">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/status/:id" element={<StatusPage />} />
          <Route path="/reception" element={<ReceptionPage />} />
          <Route path="/barber/:name" element={<BarberPage />} />
          <Route path="/display" element={<DisplayPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};
