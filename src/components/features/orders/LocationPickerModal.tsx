import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, CheckCircle2, Loader2 } from 'lucide-react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';

interface LocationPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialLocation: { lat: number; lng: number } | null;
  onConfirm: (location: { lat: number; lng: number }) => void;
}

function MyLocationControl({ onLocationUpdate }: { onLocationUpdate: (coords: {lat: number, lng: number}) => void }) {
  const map = useMap();
  const [loading, setLoading] = useState(false);

  function handleLocate() {
    if (!navigator.geolocation || !map) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        map.panTo(coords);
        map.setZoom(17);
        onLocationUpdate(coords);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="absolute top-4 right-4 z-[400]">
      <Button 
        type="button" 
        onClick={handleLocate}
        variant="secondary"
        size="icon"
        className="rounded-full shadow-md bg-background text-foreground hover:bg-muted"
        disabled={loading}
      >
        {loading ? <Loader2 className="size-5 animate-spin" /> : <MapPin className="size-5" />}
      </Button>
    </div>
  );
}

export function LocationPickerModal({ open, onOpenChange, initialLocation, onConfirm }: LocationPickerModalProps) {
  const { t } = useTranslation();
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (open && initialLocation) {
      setCenter(initialLocation);
    }
  }, [open, initialLocation]);

  const [confirming, setConfirming] = useState(false);

  if (!initialLocation || !center) return null;

  function handleConfirm() {
    if (!center) return;
    setConfirming(true);
    
    if (!window.google?.maps?.Geocoder) {
      onConfirm(center);
      setConfirming(false);
      return;
    }

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: center }, (results, status) => {
      setConfirming(false);
      let address = undefined;
      
      if (status === 'OK' && results && results.length > 0) {
        // Try to find the neighborhood or route
        const addressComponents = results[0].address_components;
        const neighborhood = addressComponents.find(c => c.types.includes('neighborhood') || c.types.includes('sublocality'));
        if (neighborhood) {
          address = neighborhood.long_name;
        } else {
          // Fallback to route or something else if no neighborhood
          const route = addressComponents.find(c => c.types.includes('route'));
          if (route) address = route.long_name;
        }
      }
      onConfirm({ ...center, address });
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden bg-background border-border/40 rounded-[2rem]">
        <div className="p-4 sm:p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-display">{t('locationPicker.confirmTitle')}</DialogTitle>
            <DialogDescription className="text-muted-foreground mt-1.5">
              {t('locationPicker.instruction')}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="relative w-full h-[60vh] sm:h-[400px] mt-4 bg-muted/30">
          <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.RASENGAN_GOOGLE_MAPS_API_KEY || ""}>
            <Map
              defaultZoom={17}
              defaultCenter={initialLocation || { lat: 3.8480, lng: 11.5021 }}
              onCenterChanged={(e) => {
                if (e.detail.center) {
                    setCenter(e.detail.center);
                }
              }}
              mapId="DEMO_MAP_ID"
              disableDefaultUI={true}
              style={{ width: '100%', height: '100%' }}
            >
              <MyLocationControl onLocationUpdate={setCenter} />
            </Map>
          </APIProvider>
          
          {/* Centre Pin Overlay */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-10 pointer-events-none drop-shadow-xl">
            <div className="relative flex flex-col items-center">
              <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-bold mb-1 shadow-lg whitespace-nowrap animate-in fade-in slide-in-from-bottom-2">
                {t('locationPicker.deliverHere')}
              </div>
              <MapPin className="size-8 text-primary drop-shadow-md" fill="currentColor" />
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 bg-background/80 backdrop-blur-md border-t border-border/40">
          <Button 
            className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/20"
            onClick={handleConfirm}
            disabled={!center || confirming}
          >
            {confirming ? <Loader2 className="size-5 animate-spin mr-2" /> : <CheckCircle2 className="size-5 mr-2" />}
            {t('locationPicker.confirmButton')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
