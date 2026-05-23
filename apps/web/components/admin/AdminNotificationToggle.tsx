import { Switch } from "@/components/ui/switch";

type AdminNotificationToggleProps = {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function AdminNotificationToggle({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: AdminNotificationToggleProps) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border bg-white px-3 py-2">
      <span className="min-w-0">
        <span className="block text-sm font-bold text-black">{label}</span>
        {description && <span className="block text-xs text-gray-500">{description}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </label>
  );
}
