import { QueueEntry, Barber, Service, QueueSummary, SalonSettings } from '../../../shared/types';

const API_BASE = '/api';

export const api = {
  async getSummary(): Promise<QueueSummary> {
    const res = await fetch(`${API_BASE}/queue/summary`);
    if (!res.ok) throw new Error('Failed to fetch queue summary');
    return res.json();
  },

  async getServices(all = false): Promise<Service[]> {
    const res = await fetch(`${API_BASE}/services${all ? '?all=true' : ''}`);
    if (!res.ok) throw new Error('Failed to fetch services');
    return res.json();
  },

  async getBarbers(): Promise<Barber[]> {
    const res = await fetch(`${API_BASE}/barbers`);
    if (!res.ok) throw new Error('Failed to fetch barbers');
    return res.json();
  },

  async getWaitingQueue(): Promise<QueueEntry[]> {
    const res = await fetch(`${API_BASE}/queue/waiting`);
    if (!res.ok) throw new Error('Failed to fetch waiting queue');
    return res.json();
  },

  async getActiveQueue(): Promise<QueueEntry[]> {
    const res = await fetch(`${API_BASE}/queue/active`);
    if (!res.ok) throw new Error('Failed to fetch active queue');
    return res.json();
  },

  async getEntry(tokenOrId: string): Promise<QueueEntry> {
    const res = await fetch(`${API_BASE}/queue/entry/${encodeURIComponent(tokenOrId)}`);
    if (!res.ok) throw new Error('Queue entry not found');
    return res.json();
  },

  async joinQueue(data: {
    customer_name: string;
    phone: string;
    service_ids: number[];
    barber_preference: string;
  }): Promise<{ success: boolean; entry?: QueueEntry; error?: string; existingEntry?: QueueEntry }> {
    const res = await fetch(`${API_BASE}/queue/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async addWalkIn(data: {
    customer_name: string;
    phone: string;
    service_ids: number[];
    barber_preference: string;
  }): Promise<{ success: boolean; entry?: QueueEntry; error?: string; existingEntry?: QueueEntry }> {
    const res = await fetch(`${API_BASE}/queue/walkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async callNext(barberName: string): Promise<{ success: boolean; entry?: QueueEntry; error?: string }> {
    const res = await fetch(`${API_BASE}/queue/call-next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barberName }),
    });
    return res.json();
  },

  async startService(barberName: string): Promise<{ success: boolean; entry?: QueueEntry; error?: string }> {
    const res = await fetch(`${API_BASE}/queue/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barberName }),
    });
    return res.json();
  },

  async completeService(barberName: string): Promise<{ success: boolean; entry?: QueueEntry; error?: string }> {
    const res = await fetch(`${API_BASE}/queue/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barberName }),
    });
    return res.json();
  },

  async cancelEntry(tokenOrId: string | number): Promise<{ success: boolean; entry?: QueueEntry; error?: string }> {
    const res = await fetch(`${API_BASE}/queue/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenOrId }),
    });
    return res.json();
  },

  async markNoShow(tokenOrId: string | number): Promise<{ success: boolean; entry?: QueueEntry; error?: string }> {
    const res = await fetch(`${API_BASE}/queue/no-show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenOrId }),
    });
    return res.json();
  },

  async toggleBarberBreak(barberName: string, onBreak: boolean): Promise<{ success: boolean; barber?: Barber; error?: string }> {
    const res = await fetch(`${API_BASE}/barbers/break`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barberName, onBreak }),
    });
    return res.json();
  },

  async toggleBarberDuty(barberName: string, onDuty: boolean): Promise<{ success: boolean; barber?: Barber; error?: string }> {
    const res = await fetch(`${API_BASE}/barbers/duty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barberName, onDuty }),
    });
    return res.json();
  },

  async toggleOnlineQueue(isOpen: boolean): Promise<{ success: boolean; settings?: SalonSettings }> {
    const res = await fetch(`${API_BASE}/settings/online-queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOpen }),
    });
    return res.json();
  },

  async addBarber(name: string): Promise<{ success: boolean; barber?: Barber; error?: string }> {
    const res = await fetch(`${API_BASE}/barbers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return res.json();
  },

  async updateOperatingHours(open_time: string, close_time: string): Promise<{ success: boolean; settings?: SalonSettings }> {
    const res = await fetch(`${API_BASE}/settings/hours`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ open_time, close_time }),
    });
    return res.json();
  },

  async getAdminStats(): Promise<{ today: string; total_served: number; estimated_revenue: number; average_wait_minutes: number }> {
    const res = await fetch(`${API_BASE}/admin/stats`);
    if (!res.ok) throw new Error('Failed to fetch admin statistics');
    return res.json();
  },

  async addService(service: { name_en: string; name_gu: string; duration: number; price: number; is_active?: boolean }): Promise<Service> {
    const res = await fetch(`${API_BASE}/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(service),
    });
    if (!res.ok) throw new Error('Failed to add service');
    return res.json();
  },

  async updateService(id: number, service: Partial<Service>): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/services/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(service),
    });
    if (!res.ok) throw new Error('Failed to update service');
    return res.json();
  },
};
