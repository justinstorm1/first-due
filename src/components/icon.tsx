import {
  Activity,
  Anchor,
  ArrowLeft,
  Award,
  Building2,
  Car,
  Check,
  ChevronsUp,
  ClipboardList,
  Droplets,
  Eye,
  FileText,
  Flame,
  Gauge,
  Hammer,
  Headset,
  HeartPulse,
  House,
  Map,
  Megaphone,
  Play,
  Radio,
  Search,
  ShieldAlert,
  Siren,
  Star,
  Thermometer,
  Timer,
  Trees,
  TriangleAlert,
  Truck,
  User,
  Users,
  Wind,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react-native";

import type { IconName } from "@/game/types";
import { colors } from "@/theme/colors";

const ICONS: Record<IconName, LucideIcon> = {
  siren: Siren,
  flame: Flame,
  radio: Radio,
  truck: Truck,
  shield: ShieldAlert,
  heart: HeartPulse,
  gauge: Gauge,
  wind: Wind,
  award: Award,
  map: Map,
  timer: Timer,
  droplets: Droplets,
  ladder: ChevronsUp,
  search: Search,
  hammer: Hammer,
  users: Users,
  clipboard: ClipboardList,
  thermometer: Thermometer,
  alert: TriangleAlert,
  anchor: Anchor,
  trees: Trees,
  car: Car,
  building: Building2,
  wrench: Wrench,
  activity: Activity,
  megaphone: Megaphone,
  eye: Eye,
  check: Check,
  x: X,
  headset: Headset,
  home: House,
  user: User,
  "arrow-left": ArrowLeft,
  zap: Zap,
  play: Play,
  file: FileText,
  star: Star,
};

export type ColorToken = keyof typeof colors;

export function Icon({
  name,
  size = 18,
  color = "ink",
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  color?: ColorToken;
  strokeWidth?: number;
}) {
  const Cmp = ICONS[name];
  return <Cmp size={size} color={colors[color]} strokeWidth={strokeWidth} />;
}
