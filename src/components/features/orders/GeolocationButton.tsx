import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Loader2, CheckCircle2 } from 'lucide-react';
import { LocationPickerModal } from '@/components/features/orders/LocationPickerModal';

interface GeolocationButtonProps {
  onLocation: (coords: { lat: number; lng: number, address?: string }) => void;
  className?: string;
}

export function GeolocationButton({ onLocation, className = '' }: GeolocationButtonProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [initialCoords, setInitialCoords] = useState<{ lat: number; lng: number } | null>(null);

  function handleGeolocate() {
    if (!navigator.geolocation) {
      setError(t('geolocation.notSupported'));
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    const successCallback = (position: GeolocationPosition) => {
      setInitialCoords({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      setModalOpen(true);
      setLoading(false);
    };

    const errorCallback = (err: GeolocationPositionError, retryLowAccuracy: boolean) => {
      console.warn('Geolocation Error:', err);
      if (err.code === err.TIMEOUT && retryLowAccuracy) {
        navigator.geolocation.getCurrentPosition(
          successCallback,
          (fallbackErr) => errorCallback(fallbackErr, false),
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 }
        );
      } else {
        setError(t('geolocation.unavailable'));
        setLoading(false);
      }
    };

    navigator.geolocation.getCurrentPosition(
      successCallback,
      (err) => errorCallback(err, true),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      <button
        type="button"
        onClick={handleGeolocate}
        disabled={loading || success}
        className={`w-full h-10 px-3 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors border ${
          success 
            ? 'bg-primary/10 text-primary border-primary/40' 
            : 'bg-muted/60 hover:bg-muted text-foreground border-border/40'
        }`}
      >
        {loading ? (
          <><Loader2 className="size-4 animate-spin" /> {t('geolocation.locating')}</>
        ) : success ? (
          <><CheckCircle2 className="size-4" /> {t('geolocation.success')}</>
        ) : (
          <><MapPin className="size-4" /> {t('geolocation.useGPS')}</>
        )}
      </button>
      {error && <p className="text-[11px] text-destructive text-center">{error}</p>}
      {!success && !error && (
        <p className="text-[11px] text-muted-foreground text-center">
          {t('geolocation.infoText')}
        </p>
      )}

      <LocationPickerModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initialLocation={initialCoords}
        onConfirm={(data) => {
          onLocation(data);
          setSuccess(true);
          setModalOpen(false);
        }}
      />
    </div>
  );
}
