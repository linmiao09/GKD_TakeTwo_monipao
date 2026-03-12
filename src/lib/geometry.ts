import { getDistance, getGreatCircleBearing, computeDestinationPoint } from 'geolib';

export interface Point {
  latitude: number;
  longitude: number;
}

export function calculateInitialBearing(pointA: Point, pointB: Point): number {
  return getGreatCircleBearing(
    { latitude: pointA.latitude, longitude: pointA.longitude },
    { latitude: pointB.latitude, longitude: pointB.longitude }
  );
}

export function calculateMidpoint(pointA: Point, pointB: Point): Point {
  const distance = getDistance(pointA, pointB);
  const bearing = calculateInitialBearing(pointA, pointB);
  const midPoint = computeDestinationPoint(pointA, distance / 2, bearing);
  return { latitude: midPoint.latitude, longitude: midPoint.longitude };
}

export function interpolateStraight(p1: Point, p2: Point, stepMeters: number): { points: { point: Point, bearing: number }[], length: number } {
  const points: { point: Point, bearing: number }[] = [];
  const totalDistance = getDistance(p1, p2);
  
  if (totalDistance === 0) {
    return { points: [], length: 0 };
  }
  
  const bearing = calculateInitialBearing(p1, p2);
  const numSteps = Math.floor(totalDistance / stepMeters);
  
  for (let i = 0; i < numSteps; i++) {
    const dist = i * stepMeters;
    const newPoint = computeDestinationPoint(p1, dist, bearing);
    points.push({ point: { latitude: newPoint.latitude, longitude: newPoint.longitude }, bearing });
  }
  
  points.push({ point: p2, bearing });
  return { points, length: totalDistance };
}

export function interpolateArc(pStart: Point, pEnd: Point, stepMeters: number, arcDegreesTotal: number): { points: { point: Point, bearing: number }[], length: number } {
  const points: { point: Point, bearing: number }[] = [];
  
  // 1. Calculate chord length
  const chordLen = getDistance(pStart, pEnd);
  if (chordLen === 0) {
    return { points: [], length: 0 };
  }
  
  const halfChord = chordLen / 2.0;
  
  // 2. Calculate radius using trigonometry
  const halfAngleRad = (arcDegreesTotal / 2.0) * (Math.PI / 180.0);
  
  if (Math.abs(Math.sin(halfAngleRad)) < 1e-6) {
    return { points: [], length: 0 };
  }
  
  const radius = halfChord / Math.sin(halfAngleRad);
  
  // 3. Calculate total arc length
  const arcLength = radius * (arcDegreesTotal * (Math.PI / 180.0));
  const numSteps = Math.floor(arcLength / stepMeters);
  
  if (numSteps === 0) {
    return { points: [], length: 0 };
  }
  
  // 4. Calculate center
  const chordMidpoint = calculateMidpoint(pStart, pEnd);
  const distToCenterSq = Math.pow(radius, 2) - Math.pow(halfChord, 2);
  const distToCenter = Math.sqrt(Math.abs(distToCenterSq));
  
  // 5. Find center (using the updated +90 logic for vertical outwards curving)
  const bearingChord = calculateInitialBearing(pStart, pEnd);
  const bearingToCenter = (bearingChord + 90 + 360) % 360;
  const trueCenterRaw = computeDestinationPoint(chordMidpoint, distToCenter, bearingToCenter);
  const trueCenter: Point = { latitude: trueCenterRaw.latitude, longitude: trueCenterRaw.longitude };
  
  // 6. Calculate start bearing (from true center to pStart)
  const startBearing = calculateInitialBearing(trueCenter, pStart);
  
  // 7. Loop interpolation
  const angleStep = arcDegreesTotal / numSteps;
  
  let lastTravelBearing = 0;
  for (let i = 0; i < numSteps; i++) {
    const currentBearing = (startBearing + i * angleStep + 360) % 360;
    const newPointRaw = computeDestinationPoint(trueCenter, radius, currentBearing);
    const newPoint: Point = { latitude: newPointRaw.latitude, longitude: newPointRaw.longitude };
    
    const travelBearing = (currentBearing + 90 + 360) % 360;
    points.push({ point: newPoint, bearing: travelBearing });
    lastTravelBearing = travelBearing;
  }
  
  points.push({ point: pEnd, bearing: lastTravelBearing });
  return { points, length: arcLength };
}
