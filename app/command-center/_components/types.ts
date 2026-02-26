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

export interface HeatmapPoint {
  latitude: number;
  longitude: number;
  intensity: number;
}

export interface Hospital {
  name: string;
  address: string;
  geo_coordinates: GeoCoordinates;
  distance_km: number;
  open_now: boolean;
  at_risk: boolean;
}

export interface WeatherInfo {
  temp_c: number;
  rainfall_mm: number;
  humidity_pct: number;
  wind_speed_kmh: number;
  description: string;
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

  heatmap_points?: HeatmapPoint[];
  hospitals?: Hospital[];
  weather_current?: WeatherInfo;
  route_polyline?: [number, number][];
  risk_level?: string;
  perplexity_context?: string;

  /** Phase 2: Risk Timeline — qualitative risk level at future intervals */
  risk_timeline?: {
    hours_from_now: number;
    risk_level: 'low' | 'moderate' | 'high' | 'extreme';
    description: string;
  }[];

  /** Phase 2: Micro-Playbook — personalized survival steps based on household */
  micro_playbook?: {
    step_number: number;
    action: string;
    timeframe: string;
    reason: string;
    completed?: boolean;
  }[];

  /** Phase 3: Source Citations — claim + source pairs */
  source_citations?: {
    claim: string;
    source: string;
  }[];

  /** Phase 7: Obstacle Warnings — road closures, blocked bridges, hazards */
  obstacles?: {
    type: 'road_closed' | 'bridge_out' | 'debris' | 'power_line' | 'landslide' | 'submerged_road';
    description: string;
    geo_coordinates: GeoCoordinates;
    severity: 'critical' | 'high' | 'moderate';
    affects_route?: string;  // which evacuation route it blocks
  }[];
}
