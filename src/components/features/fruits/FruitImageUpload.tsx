import { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type Props = {
  currentUrl?: string;
  onChange: (file: File | null) => void;
};

export function FruitImageUpload({ currentUrl, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function handleFile(file: File) {
    const url = URL.createObjectURL(file);
    setPreview(url);
    onChange(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
  }

  function handleRemove() {
    setPreview(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  const displayUrl = preview ?? currentUrl;

  return (
    <div className="space-y-2">
      {displayUrl ? (
        <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-border group">
          <img src={displayUrl} alt="Preview" className="size-full object-cover" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-1 right-1 size-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleRemove}
          >
            <X className="size-3" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            'w-32 h-32 rounded-xl border-2 border-dashed border-border',
            'flex flex-col items-center justify-center gap-2',
            'text-muted-foreground hover:border-primary hover:text-primary',
            'transition-colors cursor-pointer',
          )}
        >
          <ImagePlus className="size-6" />
          <span className="text-xs">Upload image</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />

      {!displayUrl && (
        <p className="text-xs text-muted-foreground">PNG, JPG, WebP — max 5 MB</p>
      )}
    </div>
  );
}
