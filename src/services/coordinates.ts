/**
 * Represents geographical coordinates with latitude and longitude.
 */
export interface Coordinates {
  /**
   * The latitude of the location. Must be between -90 and 90.
   */
  latitude: number;
  /**
   * The longitude of the location. Must be between -180 and 180.
   */
  longitude: number;
}
