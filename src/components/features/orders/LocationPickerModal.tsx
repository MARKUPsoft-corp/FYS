import { useState, useEffect } from 'react';
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
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (open && initialLocation) {
      setCenter(initialLocation);
    }
  }, [open, initialLocation]);

  if (!initialLocation || !center) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] gap-0 p-0 overflow-hidden bg-background">
        <DialogHeader className="px-5 pt-5 pb-4">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <MapPin className="size-5 text-primary" />
            Confirmez votre position
          </DialogTitle>
          <DialogDescription className="text-sm">
            Déplacez le pointeur ou recherchez votre quartier pour indiquer <b>exactement</b> votre adresse.
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative h-[400px] w-full bg-muted/20">
          <APIProvider apiKey={import.meta.env.RASENGAN_GOOGLE_MAPS_API_KEY || ""}>
            <Map
              mapId="DEMO_MAP_ID"
              defaultZoom={16}
              defaultCenter={initialLocation}
              onCenterChanged={(e) => {
                if (e.detail.center) {
                    setCenter(e.detail.center);
                }
              }}
              gestureHandling={'greedy'}
              disableDefaultUI={true}
              style={{ width: '100%', height: '100%' }}
            >
              <MyLocationControl onLocationUpdate={setCenter} />
            </Map>
          </APIProvider>
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-[400]">
            <div className="relative pb-1 animate-bounce">
              <MapPin className="size-10 text-primary drop-shadow-md" fill="currentColor" />
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-black/20 blur-[2px] rounded-[100%]" />
            </div>
          </div>
        </div>

        <div className="p-5 bg-card border-t flex flex-col gap-3">
          <p className="text-[11px] text-muted-foreground text-center">
            Position sélectionnée : {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
          </p>
          <Button 
            className="w-full h-12 rounded-xl text-[15px] font-bold"
            onClick={() => {
              onConfirm(center);
              onOpenChange(false);
            }}
          >
            <CheckCircle2 className="size-5 mr-2" />
            Valider cette position exacte
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
