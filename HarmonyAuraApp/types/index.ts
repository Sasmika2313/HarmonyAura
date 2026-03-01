// =============================
// WORKER TYPES
// =============================

export interface WorkerVitals {
  heart_rate: number;
  body_temperature: number;
  fatigue: number;
  hydration: number;
  spo2?: number;
  steps?: number;
}

export interface Worker {
  id: string;
  name?: string;
  vitals: WorkerVitals;
  status: "safe" | "warning" | "issue" | "evacuated";
  is_resting?: boolean;
  is_evacuated?: boolean;
}

// =============================
// MACHINE TYPES
// =============================

export interface MachineTelemetry {
  rpm: number;
  temperature: number;
  oil_pressure: number;
  engine_load: number;
  hydraulic_pressure?: number;
  vehicle_speed?: number;
  fuel_level?: number;
}

export interface Machine {
  id: string;
  telemetry: MachineTelemetry;
  status: "healthy" | "warning" | "fault";
  workers: string[];
  operating_mode?: string;
  failure_type?: string;
}
