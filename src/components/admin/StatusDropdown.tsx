
import { useState } from "react";
import { Button } from "@/components/ui/button";

type StatusOption = { value: string; label: string };

export default function StatusDropdown({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: StatusOption[];
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="px-2"
        onClick={() => setOpen((v) => !v)}
      >
        {current?.label || value}
      </Button>
      {open && (
        <div className="absolute z-10 min-w-[120px] mt-2 bg-white border rounded shadow">
          {options.map((opt) => (
            <button
              key={opt.value}
              className={`block w-full text-left px-3 py-1 hover:bg-gray-100 ${
                opt.value === value ? "font-semibold" : ""
              }`}
              onClick={() => {
                setOpen(false);
                onChange(opt.value);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
