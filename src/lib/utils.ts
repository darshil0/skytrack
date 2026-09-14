import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculates the Great-Circle distance between two coordinates in Nautical Miles (NM).
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const earthRadiusNm = 3440.065;
  const degToRad = Math.PI / 180;

  const deltaLat = (lat2 - lat1) * degToRad;
  const deltaLon = (lon2 - lon1) * degToRad;

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1 * degToRad) *
      Math.cos(lat2 * degToRad) *
      Math.sin(deltaLon / 2) ** 2;

  return earthRadiusNm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
