import type { Coordinates } from './coordinates';

/**
 * Represents river data at a specific location.
 */
export interface RiverData {
  /**
   * The coordinates of the river location.
   */
  coordinates: Coordinates;
  /**
   * The width of the river at the specified location, in meters.
   */
  riverWidth: number;
  /**
   * The depth of the river at the specified location, in meters.
   */
  riverDepth: number;
  /**
   * The flow rate of the river at the specified location, in meters per second.
   */
  flowRate: number;
}

/**
 * Asynchronously retrieves river data for a given location.
 * This is a mock implementation.
 *
 * @param coordinates The coordinates of the location for which to retrieve river data.
 * @returns A promise that resolves to a RiverData object containing river width, depth, and flow rate.
 */
export async function getRiverData(coordinates: Coordinates): Promise<RiverData> {
  console.log(`Fetching mock river data for: Lat ${coordinates.latitude}, Lng ${coordinates.longitude}`);

  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 300));

  // Generate pseudo-random data based on coordinates for variety
  const latFactor = Math.abs(coordinates.latitude) / 90; // 0 to 1
  const lngFactor = (coordinates.longitude + 180) / 360; // 0 to 1

  const riverWidth = 20 + latFactor * 150 + Math.random() * 30; // Wider rivers potentially further from equator?
  const riverDepth = 2 + lngFactor * 10 + Math.random() * 3; // Deeper rivers based on longitude?
  const flowRate = 0.5 + (1 - latFactor) * 2.5 + Math.random() * 0.5; // Faster flow potentially closer to equator?

  return {
    coordinates: coordinates,
    riverWidth: parseFloat(riverWidth.toFixed(1)),
    riverDepth: parseFloat(riverDepth.toFixed(1)),
    flowRate: parseFloat(flowRate.toFixed(2)),
  };
}
