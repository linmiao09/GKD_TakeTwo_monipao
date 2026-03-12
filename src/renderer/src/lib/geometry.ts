export interface Point {
  latitude: number;
  longitude: number;
}

export interface PathPoint {
  point: Point;
  bearing: number;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function toDeg(radians: number): number {
  return radians * (180 / Math.PI);
}

function getDistance(p1: Point, p2: Point): number {
  const R = 6371e3;
  const phi1 = toRad(p1.latitude);
  const phi2 = toRad(p2.latitude);
  const deltaPhi = toRad(p2.latitude - p1.latitude);
  const deltaLambda = toRad(p2.longitude - p1.longitude);

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
          Math.cos(phi1) * Math.cos(phi2) *
          Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function getBearing(p1: Point, p2: Point): number {
  const y = Math.sin(toRad(p2.longitude - p1.longitude)) * Math.cos(toRad(p2.latitude));
  const x = Math.cos(toRad(p1.latitude)) * Math.sin(toRad(p2.latitude)) -
          Math.sin(toRad(p1.latitude)) * Math.cos(toRad(p2.latitude)) * Math.cos(toRad(p2.longitude - p1.longitude));
  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

function destinationPoint(p: Point, bearing: number, distance: number): Point {
  const R = 6371e3;
  const ad = distance / R;
  const brng = toRad(bearing);
  const lat1 = toRad(p.latitude);
  const lon1 = toRad(p.longitude);

  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(ad) + Math.cos(lat1) * Math.sin(ad) * Math.cos(brng));
  const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(ad) * Math.cos(lat1), Math.cos(ad) - Math.sin(lat1) * Math.sin(lat2));

  return {
    latitude: toDeg(lat2),
    longitude: toDeg(lon2)
  };
}

export function interpolateStraight(p1: Point, p2: Point, stepMeters: number): { points: PathPoint[], totalDist: number } {
  const distance = getDistance(p1, p2);
  const bearing = getBearing(p1, p2);
  const points: PathPoint[] = [];
  
  let currentDist = 0;
  while (currentDist < distance) {
    points.push({
      point: destinationPoint(p1, bearing, currentDist),
      bearing: bearing
    });
    currentDist += stepMeters;
  }
  return { points, totalDist: distance };
}

/**
 * Connects pStart and pEnd with an arc of totalDegrees.
 * Assumes the arc is part of a circle where pStart and pEnd are at the same distance from center.
 */
export function interpolateArc(pStart: Point, pEnd: Point, stepMeters: number, totalDegrees: number): { points: PathPoint[], totalDist: number } {
  const dist = getDistance(pStart, pEnd);
  const chordBearing = getBearing(pStart, pEnd);
  
  // Radius of the arc given the chord and the angle subtended at center
  // totalDegrees is the angle the arc covers.
  const angleRad = toRad(totalDegrees);
  const radius = dist / (2 * Math.sin(angleRad / 2));
  
  // Distance from midpoint of chord to center
  const h = radius * Math.cos(angleRad / 2);
  
  // Midpoint of chord
  const midLat = (pStart.latitude + pEnd.latitude) / 2;
  const midLon = (pStart.longitude + pEnd.longitude) / 2;
  const midPoint = { latitude: midLat, longitude: midLon };
  
  // Center is perpendicular to the chord bearing
  const centerBearing = (chordBearing + 90) % 360; // Assuming clockwise?
  const center = destinationPoint(midPoint, centerBearing, h);
  
  const startBearingFromCenter = getBearing(center, pStart);
  const circumference = 2 * Math.PI * radius;
  const arcLength = (totalDegrees / 360) * circumference;
  
  const points: PathPoint[] = [];
  let currentDist = 0;
  while (currentDist < arcLength) {
    const angle = (startBearingFromCenter + (currentDist / circumference) * 360) % 360;
    const point = destinationPoint(center, angle, radius);
    points.push({
      point: point,
      bearing: (angle + 90) % 360 // Approximate tangent
    });
    currentDist += stepMeters;
  }
  
  return { points, totalDist: arcLength };
}
