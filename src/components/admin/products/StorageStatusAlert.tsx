
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { AlertVariant, AlertTitle, AlertDescription } from "@/components/ui/alert-variant";

type StorageStatusAlertProps = {
  error: string | null;
  isCheckingStorage: boolean;
  onCheckStorage: () => void;
}

export default function StorageStatusAlert({
  error,
  isCheckingStorage,
  onCheckStorage
}: StorageStatusAlertProps) {
  return (
    <AlertVariant variant="warning" className="mb-4">
      <AlertTitle>Проблема с хранилищем изображений</AlertTitle>
      <AlertDescription>
        {error}
        <div className="mt-2">
          <Button
            type="button"
            size="sm"
            onClick={onCheckStorage}
            disabled={isCheckingStorage}
          >
            {isCheckingStorage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Проверка...
              </>
            ) : (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" /> Проверить соединение
              </>
            )}
          </Button>
        </div>
      </AlertDescription>
    </AlertVariant>
  );
}
