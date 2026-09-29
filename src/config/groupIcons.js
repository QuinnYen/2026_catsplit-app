import { PawPrint, Plane, House, Utensils, Coffee, Heart, ShoppingBag, Mountain, TreePalm, Gift, Car, Music, Tent, Beer, TramFront } from 'lucide-react'

export const GROUP_ICONS = {
  paw: PawPrint,
  plane: Plane,
  house: House,
  food: Utensils,
  coffee: Coffee,
  beer: Beer,
  heart: Heart,
  shopping: ShoppingBag,
  mountain: Mountain,
  beach: TreePalm,
  camp: Tent,
  car: Car,
  tram: TramFront,
  gift: Gift,
  music: Music,
}

export const GROUP_COLORS = {
  red:    { bg: '#ffebee', fg: '#e53935' },
  orange: { bg: '#fff3ec', fg: '#FF8C42' },
  yellow: { bg: '#fff8e1', fg: '#e0a100' },
  green:  { bg: '#e8f5e9', fg: '#43a047' },
  blue:   { bg: '#e3f2fd', fg: '#1e88e5' },
  indigo: { bg: '#e8eaf6', fg: '#3949ab' },
  purple: { bg: '#f3e5f5', fg: '#8e44ad' },
}

export const DEFAULT_GROUP_ICON = 'paw'
export const DEFAULT_GROUP_COLOR = 'orange'
