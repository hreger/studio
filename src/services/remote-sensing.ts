import type { Coordinates } from './coordinates';

/**
 * Represents the spectral reflectance values for different bands.
 * Values typically range from 0 to 1 (or sometimes higher with processing).
 */
export interface SpectralData {
  /**
   * The reflectance value for the blue band.
   */
  blue: number;
  /**
   * The reflectance value for the green band.
   */
  green: number;
  /**
   * The reflectance value for the red band.
   */
  red: number;
  /**
   * The reflectance value for the near-infrared band.
   */
  nearInfrared: number;
}

/**
 * Represents remote sensing data for a specific location.
 */
export interface RemoteSensingData {
  /**
   * The coordinates of the location.
   */
  coordinates: Coordinates;
  /**
   * The spectral data for the location.
   */
  spectralData: SpectralData;
  /**
   * The elevation of the location in meters.
   */
  elevation: number;
}

/**
 * Asynchronously retrieves remote sensing data for a given location.
 * This is a mock implementation.
 *
 * @param coordinates The coordinates of the location for which to retrieve remote sensing data.
 * @returns A promise that resolves to a RemoteSensingData object containing spectral data and elevation.
 */
export async function getRemoteSensingData(coordinates: Coordinates): Promise<RemoteSensingData> {
  console.log(`Fetching mock remote sensing data for: Lat ${coordinates.latitude}, Lng ${coordinates.longitude}`);

  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 400));

  // Generate pseudo-random data based on coordinates for variety
  const latFactor = Math.abs(coordinates.latitude) / 90; // 0 to 1
  const lngFactor = (coordinates.longitude + 180) / 360; // 0 to 1

  // Simulate different land covers based on factors
  // Example: higher NIR and lower red might indicate vegetation
  const baseBlue = 0.1 + Math.random() * 0.1;
  const baseGreen = 0.15 + Math.random() * 0.15;
  const baseRed = 0.1 + Math.random() * 0.1;
  const baseNIR = 0.3 + Math.random() * 0.3;

  const spectralData: SpectralData = {
    blue: parseFloat((baseBlue + latFactor * 0.05).toFixed(3)),
    green: parseFloat((baseGreen + lngFactor * 0.1).toFixed(3)),
    red: parseFloat((baseRed - latFactor * 0.05 + Math.random() * 0.02).toFixed(3)),
    nearInfrared: parseFloat((baseNIR + (1-latFactor) * 0.2 + lngFactor * 0.1).toFixed(3)),
  };

  // Simulate elevation changes
  const elevation = 50 + lngFactor * 500 + Math.sin(coordinates.latitude * Math.PI / 90) * 100 + Math.random() * 50;

  return {
    coordinates: coordinates,
    spectralData: spectralData,
    elevation: parseFloat(elevation.toFixed(0)),
  };
}
