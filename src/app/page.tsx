'use client';

import type {Coordinates} from '@/services/rivers';
import type {GenerateOxbowReportOutput} from '@/ai/flows/generate-oxbow-report';
import React, {useState} from 'react';
import {Map, Marker} from '@vis.gl/react-google-maps';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Loader2, LocateFixed, Water} from 'lucide-react';
import {generateOxbowReport} from '@/ai/flows/generate-oxbow-report';
import {useToast} from '@/hooks/use-toast';

const DEFAULT_CENTER = {lat: 39.8283, lng: -98.5795}; // Center of the US
const DEFAULT_ZOOM = 4;

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState<Coordinates | null>(null);
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState<number>(DEFAULT_ZOOM);
  const [report, setReport] = useState<GenerateOxbowReportOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [latitudeInput, setLatitudeInput] = useState('');
  const [longitudeInput, setLongitudeInput] = useState('');
  const {toast} = useToast();

  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      setSelectedLocation({latitude: lat, longitude: lng});
      setLatitudeInput(lat.toFixed(6));
      setLongitudeInput(lng.toFixed(6));
      setReport(null); // Clear previous report
    }
  };

  const handleManualInput = () => {
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

    const newLocation = {latitude: lat, longitude: lng};
    setSelectedLocation(newLocation);
    setMapCenter({lat: lat, lng: lng});
    setMapZoom(12); // Zoom in on manual input
    setReport(null); // Clear previous report
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
      const result = await generateOxbowReport({coordinates: selectedLocation});
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
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const newLocation = { latitude: lat, longitude: lng };
        setSelectedLocation(newLocation);
        setLatitudeInput(lat.toFixed(6));
        setLongitudeInput(lng.toFixed(6));
        setMapCenter({ lat, lng });
        setMapZoom(12);
        setReport(null); // Clear previous report
        setIsLoading(false);
        toast({
          title: 'Location Updated',
          description: 'Using your current location.',
        });
      },
      (error) => {
        console.error('Error getting current location:', error);
        setIsLoading(false);
        toast({
          title: 'Geolocation Error',
          description: 'Could not retrieve your current location.',
          variant: 'destructive',
        });
      }
    );
  };


  return (
    <div className="flex h-screen flex-col md:flex-row bg-background">
      {/* Sidebar/Control Panel */}
      <Card className="m-2 md:w-1/3 lg:w-1/4 flex flex-col border-primary shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-primary">
            <Water className="mr-2 h-6 w-6" />
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
              <Water className="mr-2 h-4 w-4" />
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
           Map data &copy; Google
         </CardFooter>
      </Card>

      {/* Map Area */}
      <div className="flex-grow h-1/2 md:h-full m-2 rounded-lg overflow-hidden shadow-lg">
        <Map
          mapId={'oxbow-map'} // Optional: for custom map styling via Google Cloud Console
          style={{width: '100%', height: '100%'}}
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          center={mapCenter}
          zoom={mapZoom}
          gestureHandling={'greedy'}
          disableDefaultUI={true}
          onClick={handleMapClick}
        >
          {selectedLocation && (
            <Marker
              position={{lat: selectedLocation.latitude, lng: selectedLocation.longitude}}
              title={'Selected Location'}
            />
          )}
        </Map>
      </div>
    </div>
  );
}
