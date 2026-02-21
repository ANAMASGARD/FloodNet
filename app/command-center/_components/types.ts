export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface FloodZone {
  zone_name: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  geo_coordinates: GeoCoordinates;
  water_level_m: number;
  affected_population: number;
  description: string;
}

export interface SafeZone {
  name: string;
  geo_coordinates: GeoCoordinates;
  capacity: number;
  current_occupancy: number;
  specialty: string;
  eta_minutes: number;
}

export interface RescueTeam {
  team_id: string;
  team_name: string;
  status: 'deployed' | 'standby' | 'en_route';
  geo_coordinates: GeoCoordinates;
  equipment: string[];
  eta_minutes: number;
}

export interface EvacuationRoute {
  route_name: string;
  from: GeoCoordinates;
  to: GeoCoordinates;
  waypoints?: GeoCoordinates[];
  distance_km: number;
  estimated_time_minutes: number;
  status: 'clear' | 'partial' | 'blocked';
}

export interface FloodResponsePlan {
  location: string;
  severity: string;
  emergency_type: string;
  summary: string;
  flood_zones: FloodZone[];
  safe_zones: SafeZone[];
  rescue_teams: RescueTeam[];
  evacuation_routes: EvacuationRoute[];
  immediate_actions: {
    step: number;
    title: string;
    description: string;
    priority: 'critical' | 'high' | 'medium';
  }[];
  resource_needs: {
    item: string;
    quantity: string;
    urgency: 'immediate' | 'within_hours' | 'within_day';
  }[];
  center_coordinates: GeoCoordinates;
  disclaimer: string;
}
