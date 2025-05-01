'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { Coordinates } from '@/services/coordinates';
import type { GenerateOxbowReportOutput } from '@/ai/flows/generate-oxbow-report';
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LocateFixed, CloudIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 }; // Center of the US
const DEFAULT_ZOOM = 4;

interface AnalyzeDataAndPredictParams {
  latitude: number;
  longitude: number;
  elevation: number | null;
  riverData: string | null;
}

const analyzeDataAndPredict = async (data: AnalyzeDataAndPredictParams): Promise<string> => {
  const { latitude, longitude, elevation, riverData } = data;
  console.log('analyzeDataAndPredict data:', data);
  // Dummy response. This will be replaced by a trained AI model
  if (!elevation || !riverData) {
    return "Not enough data to make a prediction.";
  }
  const riverFlow = parseFloat(riverData);

  let prediction = "Low likelihood of oxbow lake formation.";

  // Example rules (very simplified - you'd need to research real factors)
  if (elevation < 100) { // Low elevation
    prediction = "Moderate likelihood of oxbow lake formation due to low elevation.";
    if (riverFlow > 500) { // High river flow
      prediction = "High likelihood of oxbow lake formation due to low elevation and high river flow.";
    }
  }

  // Additional rules can go here...

  const report = `
      Analysis for Latitude: ${latitude.toFixed(4)}, Longitude: ${longitude.toFixed(4)}
      Elevation: ${elevation} meters
      River Flow: ${riverFlow}
      Prediction: ${prediction}
    `;
  return report;
};

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState<Coordinates | null>(null);
  const [report, setReport] = useState<GenerateOxbowReportOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [latitudeInput, setLatitudeInput] = useState('');
  const [longitudeInput, setLongitudeInput] = useState('');
  const { toast } = useToast();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markers = useRef<L.Marker[]>([]);

  const getElevation = async (latitude: number, longitude: number) => {
    const url = `https://epqs.nationalmap.gov/v1/json?x=${longitude}&y=${latitude}&wkid=4326&units=Meters`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      console.log('Elevation Response:', data);
      return data.value ? Number(data.value) : null;
    } catch (error) {
      console.error('Error fetching elevation:', error);
      return null;
    }
  };
  const getRiverData = async (latitude: number, longitude: number) => {
    const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=01646500&parameterCd=00060`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      console.log('River Data Response:', data);
      const value = data.value?.timeSeries[0]?.values[0]?.value[0]?.value;
      return value ? String(value) : null;
    } catch (error) {
      console.error('Error fetching river data:', error);
      return null;
    }
  };

  const getAddressFromCoordinates = async (latitude: number, longitude: number) => {
    const apiKey = process.env.NEXT_PUBLIC_POSITIONSTACK_API_KEY;
    if (!apiKey) {
      console.error('Positionstack API key is missing');
      return '';
    }
    const url = `https://api.positionstack.com/v1/reverse?access_key=${apiKey}&query=${latitude},${longitude}&limit=1`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      console.log('Positionstack Response:', data);
      if (data.data && data.data.length > 0) {
        return data.data[0].label;
      } else {
        return 'Address not found';
      }
    } catch (error) {
      console.error('Error fetching address:', error);
      return 'Error fetching address';
    }
  };

  const handleMapClick = async (event: L.LeafletMouseEvent) => {
    const { lat, lng } = event.latlng;
    setSelectedLocation({ latitude: lat, longitude: lng });
    setLatitudeInput(lat.toFixed(6));
    setLongitudeInput(lng.toFixed(6));
    setReport(null);
    const address = await getAddressFromCoordinates(lat, lng);
    console.log("Address:", address);
  };

  const handleManualInput = async () => {
    const lat = parseFloat(latitudeInput);
    const lng = parseFloat(longitudeInput);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast({
        title: 'Invalid Coordinates',
        description: 'Please enter valid latitude (-90 to 90) and longitude (-180 to 180).',
        variant: 'destructive',
      });
      return;
    }

    const newLocation = { latitude: lat, longitude: lng };
    setSelectedLocation(newLocation);
    setReport(null); // Clear previous report
    const address = await getAddressFromCoordinates(lat, lng);
    console.log("Address:", address);
  };

  const generateOxbowReport = async ({ coordinates }: { coordinates: Coordinates }): Promise<GenerateOxbowReportOutput> => {
    const { latitude, longitude } = coordinates;
    const elevation = await getElevation(latitude, longitude);
    console.log('Elevation:', elevation);

    const riverData = await getRiverData(latitude, longitude);
    console.log('River Data:', riverData);

    const report = await analyzeDataAndPredict({
      latitude,
      longitude,
      elevation,
      riverData,
    });

    return { report }; // Return the report
  };

  const handlePrediction = async () => {
    if (!selectedLocation) {
      toast({
        title: 'No Location Selected',
        description: 'Please select a location on the map or enter coordinates.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setReport(null); // Clear previous report while loading

    try {
      const result = await generateOxbowReport({ coordinates: selectedLocation });
      setReport(result);
      toast({
        title: 'Report Generated',
        description: 'Oxbow lake prediction report is ready.',
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate the prediction report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Geolocation Not Supported',
        description: 'Your browser does not support geolocation.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const newLocation = { latitude: lat, longitude: lng };
        setSelectedLocation(newLocation);
        setLatitudeInput(lat.toFixed(6));
        setLongitudeInput(lng.toFixed(6));
        setReport(null); // Clear previous report
        setIsLoading(false);
        const address = await getAddressFromCoordinates(lat, lng);
        console.log("Address:", address);
        toast({
          title: 'Location Updated',
          description: 'Using your current location.',
        });
      },
      (error) => {
        console.error('Error getting current location:', error.message, error.code);
        setIsLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast({
              title: 'Geolocation Error',
              description: 'Permission to access location was denied. Please allow location access to use this feature.',
              variant: 'destructive',
            });
            break;
          case error.POSITION_UNAVAILABLE:
            toast({
              title: 'Geolocation Error',
              description: 'Location information is unavailable.',
              variant: 'destructive',
            });
            break;
          case error.TIMEOUT:
            toast({
              title: 'Geolocation Error',
              description: 'The request to get user location timed out.',
              variant: 'destructive',
            });
            break;
          default:
            toast({
              title: 'Geolocation Error',
              description: 'An unknown error occurred while trying to get your location.',
              variant: 'destructive',
            });
        }
      },
      {
        enableHighAccuracy: true, // you can use it but its optional
        timeout: 5000, // you can use it but its optional
        maximumAge: 0, // you can use it but its optional
      }
    );
  };

  useEffect(() => {
    if (!leafletMap.current && mapRef.current) {
      leafletMap.current = L.map(mapRef.current).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(leafletMap.current);
      leafletMap.current.on('click', handleMapClick);
    }

    // Clear existing markers
    if (leafletMap.current) {
      markers.current.forEach(marker => {
        leafletMap.current?.removeLayer(marker);
      });
      markers.current = [];
    }

    // Add a new marker if selectedLocation exists
    if (selectedLocation && leafletMap.current) {
      const marker = L.marker([selectedLocation.latitude, selectedLocation.longitude]).addTo(leafletMap.current);
      markers.current.push(marker);
    }

    // Update the view if selectedLocation changes
    if (selectedLocation && leafletMap.current) {
      leafletMap.current.setView([selectedLocation.latitude, selectedLocation.longitude], 12);
    }
  }, [selectedLocation]);

  return (
    <>
      <div className="flex h-screen flex-col md:flex-row bg-background">
        {/* Sidebar/Control Panel */}
        <Card className="m-2 md:w-1/3 lg:w-1/4 flex flex-col border-primary shadow-lg rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-primary">
              <CloudIcon className="mr-2 h-6 w-6" />
              Oxbow Forecaster
            </CardTitle>
            <CardDescription>Predict river course changes and oxbow lake formation.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-4 overflow-y-auto">
            {/* Location Input */}
            <div className="space-y-2">
              <Label>Select Location</Label>
              <p className="text-sm text-muted-foreground">Click on the map or enter coordinates below.</p>
              <div className="flex space-x-2">
                <Input
                  type="number"
                  placeholder="Latitude"
                  value={latitudeInput}
                  onChange={(e) => setLatitudeInput(e.target.value)}
                  aria-label="Latitude"
                />
                <Input
                  type="number"
                  placeholder="Longitude"
                  value={longitudeInput}
                  onChange={(e) => setLongitudeInput(e.target.value)}
                  aria-label="Longitude"
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleManualInput} variant="secondary" className="flex-1">Set Location</Button>
                <Button onClick={handleUseCurrentLocation} variant="outline" size="icon" aria-label="Use Current Location" disabled={isLoading}>
                  <LocateFixed className="h-4 w-4" />
                </Button>
              </div>

            </div>

            {/* Prediction Button */}
            <Button onClick={handlePrediction} disabled={isLoading || !selectedLocation} className="w-full bg-accent hover:bg-accent/90">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CloudIcon className="mr-2 h-4 w-4" />
              )}
              Predict Oxbow Formation
            </Button>

            {/* Report Display */}
            {report && (
              <Card className="mt-4 bg-secondary/30">
                <CardHeader>
                  <CardTitle className="text-lg text-primary">Prediction Report</CardTitle>
                  <CardDescription>
                    Analysis for Latitude: {selectedLocation?.latitude.toFixed(4)}, Longitude: {selectedLocation?.longitude.toFixed(4)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-secondary-foreground">{report.report}</p>
                </CardContent>
              </Card>
            )}
            {isLoading && !report && (
              <div className="mt-4 flex justify-center items-center space-x-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Generating report...</span>
              </div>
            )}
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            Map data &copy; OpenStreetMap
          </CardFooter>
        </Card>

        {/* Map Area */}
        <div className="flex-grow h-1/2 md:h-full m-2 rounded-lg overflow-hidden shadow-lg" id="map" ref={mapRef}>
        </div>
      </div>
      <Toaster />
    </>
  );
}
