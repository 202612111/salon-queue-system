import { db } from './db.js';
import { QueueEntry, Barber, Service, SalonSettings, QueueSummary, QueueStatus } from '../../shared/types.js';

export class QueueService {
  // Generate next token e.g. S-01, S-02
  static generateNextToken(): string {
    const today = new Date().toISOString().split('T')[0];
    const row = db.prepare(`
      SELECT COUNT(*) as count FROM queue_entries 
      WHERE created_at LIKE ?
    `).get(`${today}%`) as { count: number };
    
    const nextNum = (row?.count || 0) + 1;
    return `S-${nextNum < 10 ? '0' + nextNum : nextNum}`;
  }

  // Find active entry by phone
  static getActiveEntryByPhone(phone: string): QueueEntry | null {
    const cleanPhone = phone.trim();
    const row = db.prepare(`
      SELECT * FROM queue_entries 
      WHERE phone = ? AND status IN ('Waiting', 'Called', 'In chair')
      ORDER BY id DESC LIMIT 1
    `).get(cleanPhone) as any;

    if (!row) return null;
    return this.hydrateQueueEntry(row);
  }

  // Get active barbers
  static getBarbers(): Barber[] {
    const rows = db.prepare('SELECT * FROM barbers ORDER BY id ASC').all() as any[];
    return rows.map(r => {
      let currentCustomerName: string | null = null;
      let currentServiceNames: string[] | null = null;
      let estimatedDuration: number | undefined = undefined;
      let currentStatus: QueueStatus | null = null;
      let currentCalledAt: string | null = null;
      let currentPhone: string | null = null;

      if (r.current_token) {
        const currentEntry = db.prepare(`
          SELECT customer_name, phone, service_names_en, total_duration, status, called_at, started_at
          FROM queue_entries WHERE token = ?
        `).get(r.current_token) as any;
        if (currentEntry) {
          currentCustomerName = currentEntry.customer_name;
          currentPhone = currentEntry.phone;
          currentServiceNames = JSON.parse(currentEntry.service_names_en);
          estimatedDuration = currentEntry.total_duration;
          currentStatus = currentEntry.status;
          currentCalledAt = currentEntry.called_at;
        }
      }

      return {
        id: r.id,
        name: r.name,
        is_on_duty: Boolean(r.is_on_duty),
        is_on_break: Boolean(r.is_on_break),
        current_token: r.current_token || null,
        current_customer_name: currentCustomerName,
        current_phone: currentPhone,
        current_service_names: currentServiceNames,
        current_status: currentStatus,
        current_called_at: currentCalledAt,
        current_started_at: r.current_started_at || null,
        estimated_service_duration: estimatedDuration
      };
    });
  }

  // Get salon settings
  static getSettings(): SalonSettings {
    const row = db.prepare('SELECT * FROM salon_settings WHERE id = 1').get() as any;
    return {
      salon_name_en: row.salon_name_en,
      salon_name_gu: row.salon_name_gu,
      is_online_queue_open: Boolean(row.is_online_queue_open),
      open_time: row.open_time,
      close_time: row.close_time,
      cutoff_minutes_before_close: row.cutoff_minutes_before_close
    };
  }

  // Check if online queue is within opening hours
  static isQueueOpen(): { isOpen: boolean; reason?: 'salon_closed' | 'online_closed' } {
    const settings = this.getSettings();
    if (!settings.is_online_queue_open) {
      return { isOpen: false, reason: 'online_closed' };
    }

    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;

    const [openH, openM] = settings.open_time.split(':').map(Number);
    const [closeH, closeM] = settings.close_time.split(':').map(Number);
    const openTotal = openH * 60 + openM;
    const closeTotal = closeH * 60 + closeM;
    const cutoffTotal = closeTotal - settings.cutoff_minutes_before_close;

    if (currentTotalMinutes < openTotal || currentTotalMinutes >= closeTotal) {
      return { isOpen: false, reason: 'salon_closed' };
    }

    if (currentTotalMinutes >= cutoffTotal) {
      return { isOpen: false, reason: 'online_closed' };
    }

    return { isOpen: true };
  }

  // Get active services
  static getServices(activeOnly = true): Service[] {
    const query = activeOnly ? 'SELECT * FROM services WHERE is_active = 1' : 'SELECT * FROM services';
    const rows = db.prepare(query).all() as any[];
    return rows.map(r => ({
      id: r.id,
      name_en: r.name_en,
      name_gu: r.name_gu,
      duration: r.duration,
      price: r.price,
      is_active: Boolean(r.is_active)
    }));
  }

  // Get Queue Summary
  static getQueueSummary(): QueueSummary {
    const barbers = this.getBarbers();
    const workingBarbers = barbers.filter(b => b.is_on_duty && !b.is_on_break);
    const workingCount = workingBarbers.length;

    const waitingRows = db.prepare(`
      SELECT total_duration FROM queue_entries 
      WHERE status = 'Waiting' ORDER BY id ASC
    `).all() as { total_duration: number }[];

    const waitingCount = waitingRows.length;
    const totalMinutesAhead = waitingRows.reduce((sum, r) => sum + r.total_duration, 0);

    let estimatedWaitMinutes: number | null = null;
    if (workingCount === 0) {
      estimatedWaitMinutes = null; // Division by zero guard
    } else if (waitingCount === 0) {
      estimatedWaitMinutes = 0;
    } else {
      estimatedWaitMinutes = Math.max(5, Math.round(totalMinutesAhead / workingCount));
    }

    const queueStatus = this.isQueueOpen();
    let salonStatus: 'open' | 'closed' | 'online_closed' = 'open';
    if (!queueStatus.isOpen) {
      salonStatus = queueStatus.reason || 'online_closed';
    }

    return {
      waiting_count: waitingCount,
      estimated_wait_minutes: estimatedWaitMinutes,
      working_barbers_count: workingCount,
      is_online_queue_open: queueStatus.isOpen,
      salon_status: salonStatus,
      barbers
    };
  }

  // Join Queue
  static joinQueue(data: {
    customer_name: string;
    phone: string;
    service_ids: number[];
    barber_preference: string;
    is_walk_in?: boolean;
  }): { success: boolean; entry?: QueueEntry; error?: string; existingEntry?: QueueEntry } {
    const name = data.customer_name?.trim();
    const phone = data.phone?.trim();

    if (!name) {
      return { success: false, error: 'Customer name is required' };
    }

    // Exactly 10 digits
    if (!/^\d{10}$/.test(phone)) {
      return { success: false, error: 'Phone number must be exactly 10 digits' };
    }

    // 1 to 3 services
    if (!data.service_ids || data.service_ids.length === 0 || data.service_ids.length > 3) {
      return { success: false, error: 'Please select between 1 and 3 services' };
    }

    // Check online queue open unless walk-in
    if (!data.is_walk_in) {
      const openCheck = this.isQueueOpen();
      if (!openCheck.isOpen) {
        return { success: false, error: 'Online joining is closed. Please visit reception for walk-in.' };
      }
    }

    // Enforce 1 active queue entry per phone
    const existing = this.getActiveEntryByPhone(phone);
    if (existing) {
      return { 
        success: false, 
        error: 'An active queue entry already exists for this phone number.', 
        existingEntry: existing 
      };
    }

    // Verify chosen barber availability
    let preference = data.barber_preference || 'Any';
    if (preference !== 'Any') {
      const barber = db.prepare('SELECT * FROM barbers WHERE name = ?').get(preference) as any;
      if (!barber || !barber.is_on_duty) {
        return { success: false, error: `${preference} is currently not on duty.` };
      }
    }

    // Fetch services details
    const placeholders = data.service_ids.map(() => '?').join(',');
    const services = db.prepare(`SELECT * FROM services WHERE id IN (${placeholders})`).all(...data.service_ids) as any[];

    if (services.length !== data.service_ids.length) {
      return { success: false, error: 'One or more selected services are invalid' };
    }

    const totalDuration = services.reduce((acc, s) => acc + s.duration, 0);
    const totalPrice = services.reduce((acc, s) => acc + s.price, 0);
    const serviceNamesEn = services.map(s => s.name_en);
    const serviceNamesGu = services.map(s => s.name_gu);

    const token = this.generateNextToken();
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO queue_entries (
        token, customer_name, phone, service_ids, 
        service_names_en, service_names_gu, total_duration, total_price, 
        barber_preference, status, is_walk_in, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Waiting', ?, ?)
    `);

    const result = insertStmt.run(
      token,
      name,
      phone,
      JSON.stringify(data.service_ids),
      JSON.stringify(serviceNamesEn),
      JSON.stringify(serviceNamesGu),
      totalDuration,
      totalPrice,
      preference,
      data.is_walk_in ? 1 : 0,
      now
    );

    const created = this.getEntryById(Number(result.lastInsertRowid));
    return { success: true, entry: created || undefined };
  }

  // Get full queue entry with position and wait time
  static getEntryById(id: number): QueueEntry | null {
    const row = db.prepare('SELECT * FROM queue_entries WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.hydrateQueueEntry(row);
  }

  static getEntryByToken(token: string): QueueEntry | null {
    const row = db.prepare('SELECT * FROM queue_entries WHERE token = ?').get(token.trim().toUpperCase()) as any;
    if (!row) return null;
    return this.hydrateQueueEntry(row);
  }

  // List all waiting entries (FCFS order)
  static getWaitingQueue(): QueueEntry[] {
    const rows = db.prepare(`
      SELECT * FROM queue_entries 
      WHERE status = 'Waiting' 
      ORDER BY id ASC
    `).all() as any[];
    return rows.map((r, idx) => this.hydrateQueueEntry(r, idx + 1));
  }

  // List recent active or called entries for TV display & reception
  static getAllActiveQueue(): QueueEntry[] {
    const rows = db.prepare(`
      SELECT * FROM queue_entries 
      WHERE status IN ('Waiting', 'Called', 'In chair')
      ORDER BY id ASC
    `).all() as any[];
    return rows.map(r => this.hydrateQueueEntry(r));
  }

  // Call Next customer for a barber
  static callNext(barberName: string): { success: boolean; entry?: QueueEntry; error?: string } {
    const barber = db.prepare('SELECT * FROM barbers WHERE name = ?').get(barberName) as any;
    if (!barber) {
      return { success: false, error: `Barber ${barberName} not found` };
    }
    if (!barber.is_on_duty) {
      return { success: false, error: `${barberName} is not on duty` };
    }
    if (barber.is_on_break) {
      return { success: false, error: `${barberName} is currently on break` };
    }
    if (barber.current_token) {
      return { success: false, error: `${barberName} already has an active customer (${barber.current_token})` };
    }

    // FCFS: Select earliest waiting customer where barber_preference = barberName OR barber_preference = 'Any'
    const candidate = db.prepare(`
      SELECT * FROM queue_entries 
      WHERE status = 'Waiting' AND (barber_preference = ? OR barber_preference = 'Any')
      ORDER BY id ASC LIMIT 1
    `).get(barberName) as any;

    if (!candidate) {
      return { success: false, error: `No waiting customers eligible for ${barberName}` };
    }

    const now = new Date().toISOString();
    db.transaction(() => {
      // Update entry status to Called
      db.prepare(`
        UPDATE queue_entries 
        SET status = 'Called', assigned_barber = ?, called_at = ?
        WHERE id = ?
      `).run(barberName, now, candidate.id);

      // Assign token to barber
      db.prepare(`
        UPDATE barbers 
        SET current_token = ?, current_started_at = NULL 
        WHERE id = ?
      `).run(candidate.token, barber.id);
    })();

    const updated = this.getEntryById(candidate.id);
    return { success: true, entry: updated || undefined };
  }

  // Barber marks In chair (Service Started)
  static startService(barberName: string): { success: boolean; entry?: QueueEntry; error?: string } {
    const barber = db.prepare('SELECT * FROM barbers WHERE name = ?').get(barberName) as any;
    if (!barber || !barber.current_token) {
      return { success: false, error: `No customer currently called for ${barberName}` };
    }

    const entry = db.prepare(`
      SELECT * FROM queue_entries 
      WHERE token = ? AND status = 'Called'
    `).get(barber.current_token) as any;

    if (!entry) {
      return { success: false, error: 'Customer is not in Called status' };
    }

    const now = new Date().toISOString();
    db.transaction(() => {
      db.prepare(`
        UPDATE queue_entries 
        SET status = 'In chair', started_at = ?
        WHERE id = ?
      `).run(now, entry.id);

      db.prepare(`
        UPDATE barbers 
        SET current_started_at = ? 
        WHERE id = ?
      `).run(now, barber.id);
    })();

    return { success: true, entry: this.getEntryById(entry.id) || undefined };
  }

  // Barber marks Done (Service Completed)
  static completeService(barberName: string): { success: boolean; entry?: QueueEntry; error?: string } {
    const barber = db.prepare('SELECT * FROM barbers WHERE name = ?').get(barberName) as any;
    if (!barber || !barber.current_token) {
      return { success: false, error: `No active customer for ${barberName}` };
    }

    const entry = db.prepare(`
      SELECT * FROM queue_entries 
      WHERE token = ? AND status = 'In chair'
    `).get(barber.current_token) as any;

    if (!entry) {
      return { success: false, error: 'Customer is not In chair status' };
    }

    const now = new Date().toISOString();
    db.transaction(() => {
      db.prepare(`
        UPDATE queue_entries 
        SET status = 'Done', completed_at = ?
        WHERE id = ?
      `).run(now, entry.id);

      db.prepare(`
        UPDATE barbers 
        SET current_token = NULL, current_started_at = NULL 
        WHERE id = ?
      `).run(barber.id);
    })();

    return { success: true, entry: this.getEntryById(entry.id) || undefined };
  }

  // Cancel Queue Entry (Waiting only)
  static cancelEntry(tokenOrId: string | number): { success: boolean; entry?: QueueEntry; error?: string } {
    const entry = (typeof tokenOrId === 'number' || /^\d+$/.test(String(tokenOrId)))
      ? db.prepare('SELECT * FROM queue_entries WHERE id = ?').get(Number(tokenOrId)) as any
      : db.prepare('SELECT * FROM queue_entries WHERE token = ?').get(String(tokenOrId)) as any;

    if (!entry) {
      return { success: false, error: 'Entry not found' };
    }

    if (entry.status !== 'Waiting') {
      return { success: false, error: `Cannot cancel entry in '${entry.status}' status` };
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE queue_entries 
      SET status = 'Cancelled', cancelled_at = ?
      WHERE id = ?
    `).run(now, entry.id);

    return { success: true, entry: this.getEntryById(entry.id) || undefined };
  }

  // Mark No-show (Called only)
  static markNoShow(tokenOrId: string | number): { success: boolean; entry?: QueueEntry; error?: string } {
    const entry = (typeof tokenOrId === 'number' || /^\d+$/.test(String(tokenOrId)))
      ? db.prepare('SELECT * FROM queue_entries WHERE id = ?').get(Number(tokenOrId)) as any
      : db.prepare('SELECT * FROM queue_entries WHERE token = ?').get(String(tokenOrId)) as any;

    if (!entry) {
      return { success: false, error: 'Entry not found' };
    }

    if (entry.status !== 'Called') {
      return { success: false, error: 'Only Called customers can be marked as No-show' };
    }

    const now = new Date().toISOString();
    db.transaction(() => {
      db.prepare(`
        UPDATE queue_entries 
        SET status = 'No-show', no_show_at = ?
        WHERE id = ?
      `).run(now, entry.id);

      // Release barber chair
      if (entry.assigned_barber) {
        db.prepare(`
          UPDATE barbers 
          SET current_token = NULL, current_started_at = NULL 
          WHERE name = ? AND current_token = ?
        `).run(entry.assigned_barber, entry.token);
      }
    })();

    return { success: true, entry: this.getEntryById(entry.id) || undefined };
  }

  // Barber break toggle
  static setBarberBreak(barberName: string, onBreak: boolean): { success: boolean; barber?: Barber; error?: string } {
    const barber = db.prepare('SELECT * FROM barbers WHERE name = ?').get(barberName) as any;
    if (!barber) {
      return { success: false, error: 'Barber not found' };
    }

    db.prepare('UPDATE barbers SET is_on_break = ? WHERE id = ?').run(onBreak ? 1 : 0, barber.id);
    const updated = this.getBarbers().find(b => b.name === barberName);
    return { success: true, barber: updated };
  }

  // Barber duty toggle
  static setBarberDuty(barberName: string, onDuty: boolean): { success: boolean; barber?: Barber; error?: string } {
    const barber = db.prepare('SELECT * FROM barbers WHERE name = ?').get(barberName) as any;
    if (!barber) {
      return { success: false, error: 'Barber not found' };
    }

    db.prepare('UPDATE barbers SET is_on_duty = ? WHERE id = ?').run(onDuty ? 1 : 0, barber.id);
    const updated = this.getBarbers().find(b => b.name === barberName);
    return { success: true, barber: updated };
  }

  // Toggle online queue
  static setOnlineQueueOpen(isOpen: boolean): { success: boolean; settings?: SalonSettings } {
    db.prepare('UPDATE salon_settings SET is_online_queue_open = ? WHERE id = 1').run(isOpen ? 1 : 0);
    return { success: true, settings: this.getSettings() };
  }

  // Service CRUD
  static addService(service: Omit<Service, 'id'>): Service {
    const stmt = db.prepare(`
      INSERT INTO services (name_en, name_gu, duration, price, is_active)
      VALUES (?, ?, ?, ?, ?)
    `);
    const res = stmt.run(service.name_en, service.name_gu, service.duration, service.price, service.is_active ? 1 : 0);
    return { id: Number(res.lastInsertRowid), ...service };
  }

  static updateService(id: number, service: Partial<Service>): boolean {
    const current = db.prepare('SELECT * FROM services WHERE id = ?').get(id) as any;
    if (!current) return false;

    db.prepare(`
      UPDATE services 
      SET name_en = ?, name_gu = ?, duration = ?, price = ?, is_active = ?
      WHERE id = ?
    `).run(
      service.name_en ?? current.name_en,
      service.name_gu ?? current.name_gu,
      service.duration ?? current.duration,
      service.price ?? current.price,
      service.is_active !== undefined ? (service.is_active ? 1 : 0) : current.is_active,
      id
    );
    return true;
  }

  // Get statistics
  static getDailyStats() {
    const today = new Date().toISOString().split('T')[0];
    const completedRows = db.prepare(`
      SELECT total_duration, total_price, created_at, started_at, completed_at
      FROM queue_entries
      WHERE status = 'Done' AND created_at LIKE ?
    `).all(`${today}%`) as any[];

    const totalCustomersServed = completedRows.length;
    const estimatedRevenue = completedRows.reduce((sum, r) => sum + r.total_price, 0);

    let avgWaitTime = 0;
    if (completedRows.length > 0) {
      const waitTimes = completedRows.map(r => {
        if (r.started_at && r.created_at) {
          const waitMs = new Date(r.started_at).getTime() - new Date(r.created_at).getTime();
          return Math.max(0, Math.round(waitMs / (1000 * 60)));
        }
        return 0;
      });
      avgWaitTime = Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length);
    }

    return {
      today,
      total_served: totalCustomersServed,
      estimated_revenue: estimatedRevenue,
      average_wait_minutes: avgWaitTime
    };
  }

  // Add Barber
  static addBarber(name: string): { success: boolean; barber?: Barber; error?: string } {
    const cleanName = name.trim();
    if (!cleanName) return { success: false, error: 'Barber name is required' };
    const existing = db.prepare('SELECT * FROM barbers WHERE name = ?').get(cleanName);
    if (existing) return { success: false, error: 'A barber with this name already exists' };

    const res = db.prepare('INSERT INTO barbers (name, is_on_duty, is_on_break) VALUES (?, 1, 0)').run(cleanName);
    const created = this.getBarbers().find(b => b.id === Number(res.lastInsertRowid));
    return { success: true, barber: created };
  }

  // Update Operating Hours
  static updateOperatingHours(open_time: string, close_time: string): { success: boolean; settings?: SalonSettings } {
    db.prepare('UPDATE salon_settings SET open_time = ?, close_time = ? WHERE id = 1').run(open_time, close_time);
    return { success: true, settings: this.getSettings() };
  }

  // Helper to hydrate queue entry with position and estimated wait
  private static hydrateQueueEntry(row: any, knownPosition?: number): QueueEntry {
    const barbers = this.getBarbers().filter(b => b.is_on_duty && !b.is_on_break);
    const workingCount = barbers.length;

    let position = knownPosition;
    let estimatedWaitMinutes: number | null = null;

    if (row.status === 'Waiting') {
      if (position === undefined) {
        // Calculate dynamic position (how many waiting entries ahead of this entry)
        const ahead = db.prepare(`
          SELECT COUNT(*) as count FROM queue_entries 
          WHERE status = 'Waiting' AND id < ?
        `).get(row.id) as { count: number };
        position = (ahead?.count || 0) + 1;
      }

      // Calculate total duration ahead
      const aheadDurationRow = db.prepare(`
        SELECT SUM(total_duration) as sum_duration FROM queue_entries 
        WHERE status = 'Waiting' AND id < ?
      `).get(row.id) as { sum_duration: number | null };

      const minutesAhead = (aheadDurationRow?.sum_duration || 0);

      if (workingCount === 0) {
        estimatedWaitMinutes = null;
      } else if (position === 1) {
        estimatedWaitMinutes = 5; // Next up
      } else {
        estimatedWaitMinutes = Math.max(5, Math.round(minutesAhead / workingCount));
      }
    } else if (row.status === 'Called') {
      position = 0;
      estimatedWaitMinutes = 0;
    } else if (row.status === 'In chair') {
      position = 0;
      estimatedWaitMinutes = 0;
    }

    return {
      id: row.id,
      token: row.token,
      customer_name: row.customer_name,
      phone: row.phone,
      service_ids: JSON.parse(row.service_ids || '[]'),
      service_names_en: JSON.parse(row.service_names_en || '[]'),
      service_names_gu: JSON.parse(row.service_names_gu || '[]'),
      total_duration: row.total_duration,
      total_price: row.total_price,
      barber_preference: row.barber_preference,
      assigned_barber: row.assigned_barber || null,
      status: row.status as QueueStatus,
      is_walk_in: Boolean(row.is_walk_in),
      created_at: row.created_at,
      called_at: row.called_at || null,
      started_at: row.started_at || null,
      completed_at: row.completed_at || null,
      cancelled_at: row.cancelled_at || null,
      no_show_at: row.no_show_at || null,
      position,
      estimated_wait_minutes: estimatedWaitMinutes
    };
  }
}
