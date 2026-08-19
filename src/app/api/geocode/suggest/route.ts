import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.trim().length < 2) {
    return NextResponse.json([]);
  }

  const cleanQuery = query.trim();
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Option 1: If Google Maps API Key is configured, use Google Places Autocomplete & Geocoding
  if (apiKey) {
    try {
      // 1. Google Places Autocomplete API
      const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(cleanQuery)}&components=country:in&key=${apiKey}`;
      const autoRes = await fetch(autocompleteUrl);
      const autoData = await autoRes.json();

      if (autoData.status === 'OK' && autoData.predictions && autoData.predictions.length > 0) {
        // Fetch details / coordinates for predictions (up to 5)
        const suggestions = await Promise.all(
          autoData.predictions.slice(0, 5).map(async (pred: any) => {
            try {
              const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${pred.place_id}&fields=geometry,formatted_address,name&key=${apiKey}`;
              const detailsRes = await fetch(detailsUrl);
              const detailsData = await detailsRes.json();
              
              const loc = detailsData.result?.geometry?.location;
              return {
                display_name: pred.description || detailsData.result?.formatted_address || pred.structured_formatting?.main_text,
                lat: loc ? String(loc.lat) : '26.8500',
                lon: loc ? String(loc.lng) : '80.9499',
                source: 'google'
              };
            } catch {
              return {
                display_name: pred.description,
                lat: '26.8500',
                lon: '80.9499',
                source: 'google'
              };
            }
          })
        );
        return NextResponse.json(suggestions);
      }
    } catch (err) {
      console.error('Google Places API error, falling back to OSM:', err);
    }
  }

  // Option 2: High-Performance Fallback Geocoding (Nominatim + Photon API on Node Server)
  try {
    // 1. Try Photon (OSM-based geocoder with fuzzy search & high speed)
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=6&lang=en`;
    const photonRes = await fetch(photonUrl, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (photonRes.ok) {
      const photonData = await photonRes.json();
      if (photonData.features && photonData.features.length > 0) {
        const photonSuggestions = photonData.features.map((feat: any) => {
          const props = feat.properties;
          const coords = feat.geometry.coordinates; // [lon, lat]
          
          const parts = [
            props.name,
            props.street || props.district || props.suburb,
            props.city || props.county || props.state,
            props.country
          ].filter(Boolean);

          return {
            display_name: parts.join(', '),
            lat: String(coords[1]),
            lon: String(coords[0]),
            source: 'photon'
          };
        });

        if (photonSuggestions.length > 0) {
          return NextResponse.json(photonSuggestions);
        }
      }
    }
  } catch (err) {
    console.error('Photon API fetch error:', err);
  }

  // 2. Secondary fallback: Server-Side Nominatim (No CORS restriction on Node.js)
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&countrycodes=in&limit=6&addressdetails=1`;
    const nomRes = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'SchoolTransportConsoleServer/1.0 (contact@movepilott.com)'
      }
    });

    if (nomRes.ok) {
      const nomData = await nomRes.json();
      if (Array.isArray(nomData) && nomData.length > 0) {
        const nomSuggestions = nomData.map((item: any) => ({
          display_name: item.display_name,
          lat: item.lat,
          lon: item.lon,
          source: 'nominatim'
        }));
        return NextResponse.json(nomSuggestions);
      }
    }
  } catch (err) {
    console.error('Nominatim API fetch error:', err);
  }

  return NextResponse.json([]);
}
