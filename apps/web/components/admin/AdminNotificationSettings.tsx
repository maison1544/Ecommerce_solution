import { Volume2 } from "lucide-react";
import {
  ADMIN_NOTIFICATION_SOUNDS,
  type AdminNotificationSettings as AdminNotificationSettingsType,
  type AdminNotificationSoundId,
} from "@/hooks/useAdminNotifications";
import { AdminNotificationToggle } from "./AdminNotificationToggle";

type AdminNotificationSettingsProps = {
  settings: AdminNotificationSettingsType;
  onUpdate: (updates: Partial<AdminNotificationSettingsType>) => void;
  onPreviewSound: (soundId?: AdminNotificationSoundId) => void;
};

export function AdminNotificationSettings({
  settings,
  onUpdate,
  onPreviewSound,
}: AdminNotificationSettingsProps) {
  return (
    <div className="space-y-3 rounded-lg bg-gray-50 p-3">
      <AdminNotificationToggle
        label="알림"
        description="신규 주문과 문의 알림을 표시합니다."
        checked={settings.enabled}
        onCheckedChange={(enabled) => onUpdate({ enabled })}
      />
      <AdminNotificationToggle
        label="알림음"
        description="선택한 알림음을 재생합니다."
        checked={settings.soundEnabled}
        onCheckedChange={(soundEnabled) => onUpdate({ soundEnabled })}
        disabled={!settings.enabled}
      />
      <AdminNotificationToggle
        label="신규 주문 알림"
        checked={settings.orderNotifications}
        onCheckedChange={(orderNotifications) => onUpdate({ orderNotifications })}
        disabled={!settings.enabled}
      />
      <AdminNotificationToggle
        label="신규 문의 알림"
        checked={settings.inquiryNotifications}
        onCheckedChange={(inquiryNotifications) => onUpdate({ inquiryNotifications })}
        disabled={!settings.enabled}
      />

      <div className="rounded-lg border bg-white p-3">
        <label className="mb-2 block text-sm font-bold">알림음 선택</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={settings.selectedSoundId}
            onChange={(event) =>
              onUpdate({ selectedSoundId: Number(event.target.value) as AdminNotificationSoundId })
            }
            disabled={!settings.soundEnabled || !settings.enabled}
            className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black disabled:cursor-not-allowed disabled:bg-gray-100"
          >
            {ADMIN_NOTIFICATION_SOUNDS.map((sound) => (
              <option key={sound.id} value={sound.id}>
                {sound.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onPreviewSound(settings.selectedSoundId)}
            disabled={!settings.soundEnabled || !settings.enabled}
            className="inline-flex items-center justify-center gap-2 rounded border border-black px-3 py-2 text-sm font-bold hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-white"
          >
            <Volume2 size={16} />
            재생 테스트
          </button>
        </div>

      </div>
    </div>
  );
}
