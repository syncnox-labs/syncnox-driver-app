export interface StopJob {
  id: number;
  first_name?: string;
  last_name?: string;
  business_name?: string;
  phone_number?: string;
  address_formatted?: string;
  job_type?: string; // "delivery" | "pickup" | "service"
  time_window_start?: string;
  time_window_end?: string;
  service_duration?: number; // minutes
  additional_notes?: string;
  status?: string; // "draft" | "assigned" | "in_transit" | "completed" | "failed"
  location?: { lat: number; lng: number };
}

export interface RouteStop {
  id: number;
  sequence_order?: number;
  stop_type?: string;
  planned_arrival_time?: string;
  actual_arrival_time?: string;
  actual_departure_time?: string;
  job?: StopJob;
  location?: { lat: number; lng: number };
  address_formatted?: string;
}

export interface AssignedRoute {
  route_id: number;
  name?: string;
  scheduled_date?: string;
  total_distance_meters?: number;
  total_duration_seconds?: number;
  assignment_status: string; // "pending" | "acknowledged" | "in_progress"
  route_polyline?: string;
  stops: RouteStop[];
}
