export type QueueStatus = 'Waiting' | 'Called' | 'In chair' | 'Done' | 'Cancelled' | 'No-show';

export interface Service {
  id: number;
  name_en: string;
  name_gu: string;
  duration: number; // in minutes
  price: number; // in INR / currency
  is_active: boolean;
}

export interface Barber {
  id: number;
  name: string;
  is_on_duty: boolean;
  is_on_break: boolean;
  current_token?: string | null;
  current_customer_name?: string | null;
  current_service_names?: string[] | null;
  current_status?: QueueStatus | null;
  current_called_at?: string | null;
  current_started_at?: string | null;
  current_phone?: string | null;
  estimated_service_duration?: number;
}

export interface QueueEntry {
  id: number;
  token: string;
  customer_name: string;
  phone: string;
  service_ids: number[];
  service_names_en: string[];
  service_names_gu: string[];
  total_duration: number;
  total_price: number;
  barber_preference: string; // 'Any' or specific barber name
  assigned_barber: string | null;
  status: QueueStatus;
  is_walk_in: boolean;
  created_at: string;
  called_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  no_show_at: string | null;
  position?: number;
  estimated_wait_minutes?: number | null;
}

export interface SalonSettings {
  salon_name_en: string;
  salon_name_gu: string;
  is_online_queue_open: boolean;
  open_time: string; // e.g. "09:00"
  close_time: string; // e.g. "21:00"
  cutoff_minutes_before_close: number; // e.g. 30
}

export interface QueueSummary {
  waiting_count: number;
  estimated_wait_minutes: number | null;
  working_barbers_count: number;
  is_online_queue_open: boolean;
  salon_status: 'open' | 'closed' | 'online_closed';
  barbers: Barber[];
}
