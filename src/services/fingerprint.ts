import axios from 'axios';
import { storageService } from './storage';

export interface FingerprintConfig {
  ip: string;
  port: number;
  protocol?: 'http' | 'https';
  apiPath?: string; // Default: '/api'
  timeout?: number; // Default: 5000ms
}

export interface AttendanceRecord {
  id?: string;
  date: string;
  staffId: string;
  staffName?: string;
  nip?: string;
  checkIn?: string;
  checkOut?: string;
  status?: 'present' | 'absent' | 'late' | 'early';
  notes?: string;
  deviceId?: string;
  deviceName?: string;
}

export interface FingerprintUser {
  id: string;
  name: string;
  nip?: string;
  pin?: string;
  department?: string;
}

class FingerprintService {
  private config: FingerprintConfig | null = null;
  private baseUrl = '';

  // Load config from storage
  async loadConfig(): Promise<FingerprintConfig | null> {
    const saved = await storageService.get<FingerprintConfig>('fingerprintConfig');
    if (saved) {
      this.config = saved;
      this.updateBaseUrl();
      return saved;
    }
    return null;
  }

  // Save config to storage
  async saveConfig(config: FingerprintConfig): Promise<void> {
    this.config = config;
    this.updateBaseUrl();
    await storageService.set('fingerprintConfig', config);
  }

  // Update base URL from config
  private updateBaseUrl() {
    if (!this.config) {
      this.baseUrl = '';
      return;
    }
    const protocol = this.config.protocol || 'http';
    const apiPath = this.config.apiPath || '/api';
    this.baseUrl = `${protocol}://${this.config.ip}:${this.config.port}${apiPath}`;
  }

  // Get current config
  getConfig(): FingerprintConfig | null {
    return this.config;
  }

  // Check connection to fingerprint device
  async checkConnection(config?: FingerprintConfig): Promise<boolean> {
    const testConfig = config || this.config;
    if (!testConfig) {
      return false;
    }

    try {
      const protocol = testConfig.protocol || 'http';
      const apiPath = testConfig.apiPath || '/api';
      const url = `${protocol}://${testConfig.ip}:${testConfig.port}${apiPath}/health`;
      const timeout = testConfig.timeout || 5000;

      const response = await axios.get(url, { timeout });
      return response.status === 200;
    } catch (error: any) {
      console.error('Fingerprint connection error:', error.message);
      return false;
    }
  }

  // Fetch attendance data from device
  async fetchAttendance(params?: {
    startDate?: string;
    endDate?: string;
    staffId?: string;
  }): Promise<AttendanceRecord[]> {
    if (!this.config || !this.baseUrl) {
      throw new Error('Fingerprint device not configured. Please set IP address in Settings.');
    }

    try {
      const timeout = this.config.timeout || 10000; // Longer timeout for data fetch
      const queryParams = new URLSearchParams();
      
      if (params?.startDate) {
        queryParams.append('startDate', params.startDate);
      }
      if (params?.endDate) {
        queryParams.append('endDate', params.endDate);
      }
      if (params?.staffId) {
        queryParams.append('staffId', params.staffId);
      }

      const url = `${this.baseUrl}/attendance${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await axios.get(url, { timeout });

      // Handle different response formats
      let attendanceData: AttendanceRecord[] = [];
      
      if (Array.isArray(response.data)) {
        attendanceData = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        attendanceData = response.data.data;
      } else if (response.data.attendance && Array.isArray(response.data.attendance)) {
        attendanceData = response.data.attendance;
      } else if (response.data.records && Array.isArray(response.data.records)) {
        attendanceData = response.data.records;
      }

      // Normalize data format
      return attendanceData.map((record: any) => this.normalizeAttendanceRecord(record));
    } catch (error: any) {
      console.error('Error fetching attendance:', error.message);
      throw new Error(`Failed to fetch attendance: ${error.message}`);
    }
  }

  // Normalize attendance record to standard format
  private normalizeAttendanceRecord(record: any): AttendanceRecord {
    return {
      id: record.id || record.ID || record.uid || `${record.date || Date.now()}-${record.staffId || record.user_id || record.userId || ''}`,
      date: record.date || record.Date || record.tanggal || new Date().toISOString().split('T')[0],
      staffId: record.staffId || record.staff_id || record.userId || record.user_id || record.pin || '',
      staffName: record.staffName || record.staff_name || record.name || record.userName || record.user_name || '',
      nip: record.nip || record.NIP || record.employee_id || '',
      checkIn: record.checkIn || record.check_in || record.inTime || record.in_time || record.timeIn || record.time_in || '',
      checkOut: record.checkOut || record.check_out || record.outTime || record.out_time || record.timeOut || record.time_out || '',
      status: this.determineStatus(record),
      notes: record.notes || record.Notes || record.remark || '',
      deviceId: record.deviceId || record.device_id || record.machineId || '',
      deviceName: record.deviceName || record.device_name || record.machineName || '',
    };
  }

  // Determine attendance status from record
  private determineStatus(record: any): 'present' | 'absent' | 'late' | 'early' {
    if (record.status) {
      const status = String(record.status).toLowerCase();
      if (status.includes('present') || status.includes('hadir')) return 'present';
      if (status.includes('absent') || status.includes('tidak hadir')) return 'absent';
      if (status.includes('late') || status.includes('terlambat')) return 'late';
      if (status.includes('early') || status.includes('pulang cepat')) return 'early';
    }

    // Auto-detect from checkIn/checkOut
    if (record.checkIn || record.check_in || record.inTime) {
      return 'present';
    }
    if (!record.checkIn && !record.checkOut) {
      return 'absent';
    }

    return 'present';
  }

  // Fetch users from fingerprint device
  async fetchUsers(): Promise<FingerprintUser[]> {
    if (!this.config || !this.baseUrl) {
      throw new Error('Fingerprint device not configured. Please set IP address in Settings.');
    }

    try {
      const timeout = this.config.timeout || 10000;
      const response = await axios.get(`${this.baseUrl}/users`, { timeout });

      let users: FingerprintUser[] = [];
      
      if (Array.isArray(response.data)) {
        users = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        users = response.data.data;
      } else if (response.data.users && Array.isArray(response.data.users)) {
        users = response.data.users;
      }

      return users.map((user: any) => ({
        id: user.id || user.ID || user.uid || user.userId || '',
        name: user.name || user.Name || user.userName || user.user_name || '',
        nip: user.nip || user.NIP || user.employee_id || user.employeeId || '',
        pin: user.pin || user.PIN || user.pinCode || '',
        department: user.department || user.Department || user.dept || '',
      }));
    } catch (error: any) {
      console.error('Error fetching users:', error.message);
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
  }

  // Sync attendance data to local storage
  async syncAttendanceToLocal(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      // Fetch from device
      const attendanceData = await this.fetchAttendance();
      
      // Get existing attendance data
      const existing = await storageService.get<AttendanceRecord[]>('attendance') || [];
      
      // Merge with existing (avoid duplicates)
      const existingMap = new Map<string, AttendanceRecord>();
      existing.forEach(record => {
        const key = `${record.date}-${record.staffId}`;
        existingMap.set(key, record);
      });

      // Add new records
      attendanceData.forEach(record => {
        const key = `${record.date}-${record.staffId}`;
        if (!existingMap.has(key)) {
          existingMap.set(key, record);
          synced++;
        } else {
          // Update existing if device data is newer
          const existingRecord = existingMap.get(key)!;
          if (record.checkIn && !existingRecord.checkIn) {
            existingMap.set(key, { ...existingRecord, ...record });
            synced++;
          }
        }
      });

      // Save merged data
      const mergedData = Array.from(existingMap.values());
      await storageService.set('attendance', mergedData);

      return { synced, errors };
    } catch (error: any) {
      errors.push(error.message);
      return { synced, errors };
    }
  }
}

export const fingerprintService = new FingerprintService();

