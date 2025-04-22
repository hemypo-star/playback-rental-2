
import { Upload, Image } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  label?: string;
  onChange: (file: File) => void;
  previewUrl?: string | null;
  disabled?: boolean;
};

export default function ImageUploadField({ label, onChange, previewUrl, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="space-y-2">
      {label && <span className="block text-sm">{label}</span>}
      <div className="flex items-center gap-3">
        {previewUrl ? (
          <div className="w-14 h-14 rounded bg-gray-200 bg-cover bg-center border" style={{ backgroundImage: `url(${previewUrl})` }} />
        ) : (
          <div className="w-14 h-14 flex items-center justify-center rounded border border-dashed bg-muted">
            <Image className="h-6 w-6 opacity-60" />
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            if (e.target.files?.[0]) {
              onChange(e.target.files[0]);
              e.target.value = "";
            }
          }}
          disabled={disabled}
        />
        <Button type="button" size="sm"
          className="flex items-center gap-1"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          <Upload className="h-4 w-4" />
          {previewUrl ? "Изменить" : "Загрузить"}
        </Button>
      </div>
    </div>
  );
}
