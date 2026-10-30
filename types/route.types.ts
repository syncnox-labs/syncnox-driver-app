export type JobTemplateType = 'pickup_delivery_job' | 'worker_shuttle';
export type RouteLeg = 'GO' | 'RETURN' | 'COMBINED';
export type StopProgress = 'pending' | 'completed' | 'failed' | 'skipped';
export type NoShowScope = 'this_leg' | 'job';

export interface StopJob {
  id: number;
  first_name?: string;
  last_name?: string;
  business_name?: string;
  phone_number?: string;
  address_formatted?: string;
  job_type?: string; // "delivery" | "pickup" | "service" | "one_way" | "return_only"
  job_template_type?: JobTemplateType;
  time_window_start?: string;
  time_window_end?: string;
  service_duration?: number; // minutes
  additional_notes?: string;
  status?: string; // "draft" | "assigned" | "in_transit" | "completed" | "failed"
  completed_at?: string;
  location?: { lat: number; lng: number };
  worker_shuttle?: WorkerShuttleDetail | null;
}

export interface WorkerShuttleDetail {
  candidate_id?: string;
  candidate_name?: string;
  candidate_phone?: string;
  quant_id?: string;
  notes?: string;
  reach_before_minutes?: number;
  pick_up_address?: string;
  drop_off_address?: string;
  client_pick_up_time?: string;
  candidate_pickup_eta?: string;
}

/** One person boarding / alighting at a stop (shared by every stop at the same address). */
export interface PassengerSummary {
  job_id: number;
  stop_id?: number;
  stop_type?: string; // "pickup" | "dropoff"
  stop_status?: StopProgress;
  candidate_id?: string;
  candidate_name?: string;
  candidate_phone?: string;
  quant_id?: string;
  notes?: string;
  first_name?: string;
  last_name?: string;
  business_name?: string;
  phone_number?: string;
  client_pick_up_time?: string;
  actual_departure_time?: string;
  completed_at?: string;
  is_team_leader_self_job?: boolean;
}

export interface RouteStop {
  id: number;
  sequence_order?: number;
  stop_type?: string; // "pickup" | "dropoff" | "job" | "depot_start" | "depot_end" ...
  /** Driver progress for THIS stop (pickup and dropoff of one job progress independently). */
  status?: StopProgress;
  planned_arrival_time?: string;
  planned_departure_time?: string;
  actual_arrival_time?: string;
  actual_departure_time?: string;
  job?: StopJob;
  location?: { lat: number; lng: number };
  address_formatted?: string;
  passengers?: PassengerSummary[];
  passenger_count?: number;
  waiting_time_to_next_stop_seconds?: number | null;
  waiting_position?: 'left' | 'right' | null;
  is_team_leader_self_job?: boolean;
}

export interface VehicleInfo {
  id: number;
  name?: string;
  type?: string;
  license_plate?: string;
  capacity?: number;
  vehicle_summary?: string;
}

export interface DepotInfo {
  id: number;
  name?: string;
  address_formatted?: string;
  location?: { lat: number; lng: number } | null;
}

export interface AssignedRoute {
  route_id: number;
  name?: string;
  scheduled_date?: string;
  total_distance_meters?: number;
  total_duration_seconds?: number;
  assignment_status: string; // "pending" | "acknowledged" | "in_progress" | "completed"
  route_polyline?: string;
  stops: RouteStop[];
  vehicle?: VehicleInfo | null;
  depot?: DepotInfo | null;
  job_template_type?: JobTemplateType;
  leg?: RouteLeg | null;
  is_team_leader?: boolean;
}
