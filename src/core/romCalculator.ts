// src/core/romCalculator.ts
// Range-of-Motion calculator using ArUco marker pose estimation.
//
// In a React Native context, full OpenCV FFI is not available.
// This module uses a pragmatic approach:
//   - Tracks ArUco marker corner positions from the camera frame.
//   - Computes the orientation angle of each marker's principal axis.
//   - Calculates the angle between adjacent segment markers to derive joint angles.
//
// For production, replace with a native module (react-native-opencv3 or
// a custom TurboModule) to access the full OpenCV ArUco API.

export interface MarkerCorners {
  id: number;
  // Four corners as [x,y] pixel coordinates: [TL, TR, BR, BL]
  corners: [number, number][];
}

export interface JointAngle {
  jointName: string;
  angleDegrees: number;
  timestamp: number;
}

export interface RomSession {
  samples: JointAngle[][];
  durationMs: number;
}

// ── Marker to Joint Mapping ───────────────────────────────────────────────────

const JOINT_DEFINITIONS: { name: string; proximalId: number; distalId: number }[] = [
  { name: 'Knee Flexion', proximalId: 0, distalId: 1 },        // Thigh → Shank
  { name: 'Ankle Dorsiflexion', proximalId: 1, distalId: 2 },  // Shank → Foot
  { name: 'Hip Flexion', proximalId: 3, distalId: 0 },         // Pelvis → Thigh
];

// ── Math Helpers ──────────────────────────────────────────────────────────────

/**
 * Compute the orientation angle of a marker's local Y-axis
 * relative to the image vertical axis.
 * Uses the vector from the bottom-left corner to the top-left corner.
 */
function markerOrientationDeg(corners: [number, number][]): number {
  const [tl, , , bl] = corners;
  const dx = tl[0] - bl[0];
  const dy = tl[1] - bl[1];
  return (Math.atan2(dx, -dy) * 180) / Math.PI;
}

/** Compute signed angle difference between two orientation angles. */
function angleDifference(a: number, b: number): number {
  let diff = a - b;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return Math.abs(diff);
}

// ── Calculator ────────────────────────────────────────────────────────────────

/**
 * Given a list of detected markers in the current frame,
 * compute all defined joint angles.
 */
export function calculateJointAngles(markers: MarkerCorners[]): JointAngle[] {
  // Build a lookup map by marker ID
  const markerMap = new Map<number, MarkerCorners>(markers.map((m) => [m.id, m]));
  const results: JointAngle[] = [];

  for (const joint of JOINT_DEFINITIONS) {
    const proximal = markerMap.get(joint.proximalId);
    const distal = markerMap.get(joint.distalId);

    if (!proximal || !distal) continue; // Marker not in frame

    const proxAngle = markerOrientationDeg(proximal.corners);
    const distAngle = markerOrientationDeg(distal.corners);
    const jointAngle = angleDifference(proxAngle, distAngle);

    results.push({
      jointName: joint.name,
      angleDegrees: Math.round(jointAngle * 10) / 10, // Round to 1 decimal
      timestamp: Date.now(),
    });
  }

  return results;
}

/**
 * Aggregate multiple samples into a summary.
 * Returns min, max, and mean angle per joint.
 */
export function aggregateSamples(
  samples: JointAngle[][]
): Record<string, { min: number; max: number; mean: number }> {
  const grouped: Record<string, number[]> = {};

  for (const frame of samples) {
    for (const angle of frame) {
      if (!grouped[angle.jointName]) grouped[angle.jointName] = [];
      grouped[angle.jointName].push(angle.angleDegrees);
    }
  }

  const result: Record<string, { min: number; max: number; mean: number }> = {};
  for (const [joint, values] of Object.entries(grouped)) {
    const sorted = [...values].sort((a, b) => a - b);
    result[joint] = {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10,
    };
  }

  return result;
}
