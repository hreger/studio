'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { Coordinates } from '@/services/coordinates';
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
  riverHistoricData: string | null;
  riverData: string | null;
  soilType?: string;
  rockFormation?: string;
  waterTable?: string;
  soilMoisture?: string;
  floodingRisk?: string;
}

interface GenerateOxbowReportOutput {
  prediction: string;
  elevation: string;
  riverFlowDifference?: string
  riverHistoricData: string;
  riverFlow: string;
  reasoning: string;
  latitude: number;
  longitude: number;
  soilType: string;
  rockFormation: string;
  waterTable: string;
  soilMoisture: string;
  floodingRisk: string;
}

// Real Data Fetching Functions

const getSoilType = async (latitude: number, longitude: number) => {
  try {
    const url = `https://sdmdataaccess.nrcs.usda.gov/Tabular/post.rest?format=json&Request=GetSoilReport&latitude=${latitude}&longitude=${longitude}&Report=SoilType`;
    const response = await fetch(url);
    const data = await response.json();

    if (data && data.Table && data.Table.length > 0) {
        const soilData = data.Table;
        const soilType = soilData[0].soilTypeName
        console.log("Soil Type:", soilType);
        return soilType;
      } else {
        console.log("Soil data not found");
        return "Unknown";
      }

  } catch (error) {
    console.error('Error fetching soil type:', error);
    return "Unknown";
  }
};

const getRockFormation = async (latitude: number, longitude: number) => {
  try {
    const url = `https://mrdata.usgs.gov/services/mrds?lat=${latitude}&lon=${longitude}&output=json`;
    const response = await fetch(url);
    const data = await response.json();
    console.log('Rock formation response:', data)

    if (data.features && data.features.length > 0) {
      const rockFormation = data.features[0].properties.commodity;
      console.log("Rock formation:", rockFormation);
      return rockFormation;
    } else {
        console.log("Rock data not found");
      return "Unknown";
    }
  } catch (error) {
    console.error('Error fetching rock formation:', error);
    return "Unknown";
  }
};

const getWaterTable = async (latitude: number, longitude: number) => {
    try {
        const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=01646500&parameterCd=72019`;
        const response = await fetch(url);
        const data = await response.json();
        console.log('Water Table Response:', data);
        if (data && data.value?.timeSeries && data.value.timeSeries.length > 0) {
            const value = data.value.timeSeries[0]?.values[0]?.value[0]?.value;
          return String(value);
        } else {
          return "Unknown";
        }
      } catch (error) {
        console.error('Error fetching water table data:', error);
        return "Unknown";
      }
};

const getSoilMoisture = async (latitude: number, longitude: number) => {
  try {
    const url = `https://www.sciencebase.gov/catalog/items?q=soil%20moisture%20&format=json`;
    const response = await fetch(url);
    const data = await response.json();
    console.log('Soil Moisture Response:', data);
    if (data.items && data.items.length > 0) {
        // extract moisture data (example)
        const soilMoisture = data.items[0].properties?.text || 'Unknown';
        return soilMoisture
    } else {
        return 'Unknown';
    }

  } catch (error) {
    console.error('Error fetching soil moisture:', error);
    return "Unknown";
  }
};

const getFloodingRisk = async (latitude: number, longitude: number) => {
  try {
    const url = `https://msc.fema.gov/arcgis/rest/services/public/NFHL/MapServer/1/query?where=IN_COMMUNITY%3D'Yes'&outFields=FLD_ZONE&f=json&geometry=${longitude}%2C${latitude}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects`;
    const response = await fetch(url);
    const data = await response.json();
    console.log('Flooding Risk Response:', data);
    if (data && data.features && data.features.length > 0) {
        const floodingRisk = data.features[0].attributes.FLD_ZONE;
        return floodingRisk;
    }
    return "Unknown";
  } catch (error) {
    console.error('Error fetching flooding risk:', error);
    return "Unknown";
  }
};

const getRiverHistoricData = async (latitude: number, longitude: number) => {
    const today = new Date();
    const lastYear = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    const endDate = today.toISOString().split('T')[0];
    const startDate = lastYear.toISOString().split('T')[0];
    try {
      const url = `https://waterservices.usgs.gov/nwis/dv/?format=json&sites=01646500&startDT=${startDate}&endDT=${endDate}&parameterCd=00060`;
      const response = await fetch(url);
      const data = await response.json();
      console.log('River Historic Data Response:', data);
      if (data.value && data.value.timeSeries && data.value.timeSeries.length > 0) {
        const riverData = data.value.timeSeries[0].values[0].value;
        const totalRiverFlow = riverData.reduce((sum:number, current:any) => sum + parseFloat(current.value), 0);
        const averageRiverFlow = totalRiverFlow / riverData.length;
        return String(averageRiverFlow);
      } else {
        return 'Unknown';
      }
    } catch (error) {
      console.error('Error fetching river data:', error);
      return 'Unknown';
    }
  };

const analyzeDataAndPredict = async (data: AnalyzeDataAndPredictParams): Promise<GenerateOxbowReportOutput> => {
  const { latitude, longitude, elevation, riverData, soilType, rockFormation, waterTable, soilMoisture, floodingRisk, riverHistoricData } = data;
  console.log('analyzeDataAndPredict data:', data);

  if (!elevation || !riverData || !riverHistoricData) {
    return {
      prediction: "Not enough data to make a prediction.",
      elevation: "Data unavailable",
      riverFlow: "Data unavailable",
      reasoning: "Elevation or river data is missing.",
      latitude,
      longitude,
      riverHistoricData: 'Unknown',
      soilType: "Unknown",
      rockFormation: "Unknown",
      waterTable: "Unknown",
      soilMoisture: "Unknown",
      floodingRisk: "Unknown",
      
      
    };
  }

  const riverFlow = parseFloat(riverData);
  let prediction = "Low likelihood of oxbow lake formation.";
  let reasoning = "The conditions are not favorable for oxbow lake formation.";

  const riverFlowDifference = parseFloat(riverData) - parseFloat(riverHistoricData)

  // Base case: consider elevation and river flow
  let totalScore = 0
  if (elevation && elevation < 100) {
    totalScore += 2
    reasoning += `The low elevation of ${elevation} meters suggests a higher chance of river meandering and potential oxbow lake formation.`;
    if (riverFlow && riverFlow > 500) {
        totalScore += 3
        reasoning += `With a high river flow of ${riverFlow} cfs, the conditions are very favorable for oxbow lake formation.`;
    }
  } else if (riverFlow && riverFlow > 500) {
    totalScore += 1
    reasoning += `The high river flow of ${riverFlow} cfs increases the chances of river course changes, potentially leading to oxbow lakes.`;
  }
  if (riverFlowDifference && riverFlowDifference > 1000) {
    totalScore += 3
    reasoning += ` The river flow difference is significative.`;
  }

  // Incorporate additional factors
  if (soilType) {
    if (soilType.toLowerCase().includes("clay")) {
        totalScore += 2
      reasoning += ` The presence of clay soils can further contribute to oxbow formation.`;
    } else if (soilType.toLowerCase().includes('sand')) {
        totalScore -= 1
        reasoning += ` The presence of sandy soil can decrease the probability of oxbow lake formation.`;
    } else {
        reasoning += ` The soil type is ${soilType}.`;
    }
  }

  if (rockFormation) {
    if (rockFormation.toLowerCase().includes("soft")) {
        totalScore += 2
      reasoning += ` The soft rock formation makes the river course more susceptible to change.`;
    } else if (rockFormation.toLowerCase().includes('hard')) {
        totalScore -= 1
        reasoning += ` The presence of hard rock formation makes the river course less susceptible to change.`;
    } else {
        reasoning += ` The rock formation is ${rockFormation}.`;
    }
  }

  if (waterTable) {
    if(waterTable.toLowerCase() != 'unknown'){
        const waterTableNum = parseFloat(waterTable)
        if (waterTableNum < 10) {
            totalScore += 2
          reasoning += ` A shallow water table supports the formation of oxbow lakes.`;
        } else if(waterTableNum > 20) {
            totalScore -=1
            reasoning += ` A deep water table makes oxbow lake formation less likely.`;
        } else {
            reasoning += ` The water table is ${waterTable} ft.`;
        }
    } else {
        reasoning += ` The water table is unknown.`;
    }
  }

  if (soilMoisture) {
    if (soilMoisture.toLowerCase().includes("high")) {
        totalScore += 1
      reasoning += ` High soil moisture further promotes the process.`;
    } else if (soilMoisture.toLowerCase().includes("low")){
        totalScore -=1
        reasoning += ` Low soil moisture makes oxbow lake formation less likely.`;
    } else {
        reasoning += ` The soil moisture is ${soilMoisture}.`;
    }
  }

  if (floodingRisk) {
    if (floodingRisk.toLowerCase().includes("a") || floodingRisk.toLowerCase().includes("ae")) {
        totalScore += 3
      reasoning += ` High flooding risk greatly increases the chances of oxbow formation.`;
    } else {
        reasoning += ` The flooding risk is ${floodingRisk}.`;
    }
  }

  if (totalScore <= 1) {
      prediction = `Low likelihood of oxbow lake formation.`
  } else if (totalScore <= 3) {
    prediction = `Moderate likelihood of oxbow lake formation.`
  } else if (totalScore > 3){
      prediction = `High likelihood of oxbow lake formation.`
  }

  return {
    prediction,
    elevation: `${elevation} meters`,
    riverFlow: `${riverFlow} cfs`,
    reasoning,
    riverFlowDifference:`${riverFlowDifference.toFixed(2)} cfs`,
    riverHistoricData,
    latitude,
    longitude,
    soilType: soilType || 'Unknown',
    rockFormation: rockFormation || 'Unknown',
    waterTable: waterTable || 'Unknown',
    soilMoisture: soilMoisture || 'Unknown',
    floodingRisk: floodingRisk || 'Unknown',
  };
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
    //Current river data
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

    const riverHistoricData = await getRiverHistoricData(latitude, longitude);
    console.log('River Historic Data:', riverHistoricData);
    const riverData = await getRiverData(latitude, longitude);
    console.log('River Data:', riverData);

    const soilType = await getSoilType(latitude, longitude);
    const rockFormation = await getRockFormation(latitude, longitude);

    const waterTable = await getWaterTable(latitude, longitude);
    const soilMoisture = await getSoilMoisture(latitude, longitude);
    const floodingRisk = await getFloodingRisk(latitude, longitude);

    const report = await analyzeDataAndPredict({
      latitude,
      longitude,
      elevation,
      riverHistoricData,
      riverData,
      soilType,
      rockFormation,
      waterTable,
      soilMoisture,
      floodingRisk,
    });

    return report;
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
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-secondary-foreground">Latitude: {report.latitude.toFixed(4)}</p>
                  <p className="text-sm text-secondary-foreground">Longitude: {report.longitude.toFixed(4)}</p>
                  <p className="text-sm text-secondary-foreground">Elevation: {report.elevation}</p>
                  <p className="text-sm text-secondary-foreground">River Flow: {report.riverFlow}</p>
                  <p className="text-sm text-secondary-foreground">River Flow Difference: {report.riverFlowDifference}</p>
                  <p className="text-sm text-secondary-foreground">River Historic Data: {report.riverHistoricData}</p>
                  <p className="text-sm text-secondary-foreground">Soil Type: {report.soilType}</p>
                  <p className="text-sm text-secondary-foreground">Rock Formation: {report.rockFormation}</p>
                  <p className="text-sm text-secondary-foreground">Water Table: {report.waterTable}</p>
                  <p className="text-sm text-secondary-foreground">Soil Moisture: {report.soilMoisture}</p>
                  <p className="text-sm text-secondary-foreground">Flooding Risk: {report.floodingRisk}</p>
                  <p className="text-sm text-secondary-foreground">Prediction: {report.prediction}</p>
                  <p className="text-sm text-secondary-foreground">Reasoning: {report.reasoning}</p>
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
