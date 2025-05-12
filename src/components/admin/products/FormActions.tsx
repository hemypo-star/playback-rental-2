
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type FormActionsProps = {
  isSubmitting: boolean;
  onCancel: () => void;
};

export default function FormActions({
  isSubmitting,
  onCancel,
}: FormActionsProps) {
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={onCancel}>
        Отмена
      </Button>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Сохранение...
          </>
        ) : (
          'Сохранить'
        )}
      </Button>
    </div>
  );
}
