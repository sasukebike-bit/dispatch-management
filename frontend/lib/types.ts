export interface Driver {
  id: number;
  name: string;
}

export interface Order {
  id: number;
  delivery_date: string;
  recipient_name?: string;
  address: string;
  time_start: string;
  time_end: string;
  notes?: string;
  lat?: number;
  lng?: number;
  driver_id?: number;
  driver_name?: string;
}

export interface DispatchResultItem {
  driver_id: number;
  driver_name: string;
  orders: Order[];
  total_jobs: number;
  total_distance_km: number;
}

export interface DispatchResult {
  date: string;
  assignments: DispatchResultItem[];
  unassigned_orders: Order[];
}
