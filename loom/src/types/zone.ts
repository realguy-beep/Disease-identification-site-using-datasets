export interface ZoneDefinition {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon identifier
  timeStart: string; // HH:MM 24hr format
  timeEnd: string; // HH:MM 24hr format
  defaultAppIds: string[]; // default apps opened in this zone
  accentColor: string;
  ambientGradient: string;
  isDefault?: boolean;
}

