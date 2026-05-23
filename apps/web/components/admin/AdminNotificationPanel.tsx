import { Bell, CheckCheck, MessageCircle, ShoppingCart, X } from "lucide-react";
import { formatKoreanDateTime } from "@/utils/date";
import {
  type AdminNotificationItem,
  type AdminNotificationSettings as AdminNotificationSettingsType,
  type AdminNotificationSoundId,
} from "@/hooks/useAdminNotifications";
import { AdminNotificationSettings } from "./AdminNotificationSettings";

type AdminNotificationPanelProps = {
  settings: AdminNotificationSettingsType;
  notifications: AdminNotificationItem[];
  unreadCount: number;
  notificationPage: number;
  totalNotificationPages: number;
  onClose: () => void;
  onUpdateSettings: (updates: Partial<AdminNotificationSettingsType>) => void;
  onPreviewSound: (soundId?: AdminNotificationSoundId) => void;
  onSetNotificationPage: (page: number) => void;
  onOpenNotification: (notification: AdminNotificationItem) => void;
  onMarkAllAsRead: () => void;
  onMarkAsRead: (notificationId: string) => void;
};

export function AdminNotificationPanel({
  settings,
  notifications,
  unreadCount,
  notificationPage,
  totalNotificationPages,
  onClose,
  onUpdateSettings,
  onPreviewSound,
  onSetNotificationPage,
  onOpenNotification,
  onMarkAllAsRead,
  onMarkAsRead,
}: AdminNotificationPanelProps) {
  return (
    <div className="absolute right-0 top-12 z-50 w-[min(92vw,420px)] overflow-hidden rounded-xl border bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-3 border-b bg-black px-4 py-3 text-white">
        <div>
          <h2 className="font-bold">관리자 알림</h2>
          <p className="text-xs text-gray-300">
            읽지 않은 알림 {unreadCount}개
          </p>
        </div>
        <button type="button" onClick={onClose} className="rounded p-1 hover:bg-white/10" aria-label="알림 닫기">
          <X size={18} />
        </button>
      </div>

      <div className="max-h-[72vh] overflow-y-auto p-4">
        <AdminNotificationSettings
          settings={settings}
          onUpdate={onUpdateSettings}
          onPreviewSound={onPreviewSound}
        />

        <div className="mt-4">
          <button
            type="button"
            onClick={onMarkAllAsRead}
            className="inline-flex w-full items-center justify-center gap-2 rounded bg-gray-100 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-200"
          >
            <CheckCheck size={16} />
            전체 읽음
          </button>
        </div>

        <div className="mt-4">
          <h3 className="mb-2 text-sm font-bold">최근 알림</h3>
          {notifications.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
              <Bell className="mx-auto mb-2 text-gray-400" size={28} />
              새로운 알림이 없습니다
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => onOpenNotification(notification)}
                  className={`w-full rounded-lg border p-3 text-left transition hover:bg-gray-50 ${
                    notification.read ? "bg-white" : "border-[#b78b1f] bg-[#fff8df]"
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center">
                      {notification.type === "orders" ? (
                        <ShoppingCart className="text-blue-600" size={16} />
                      ) : (
                        <MessageCircle className="text-green-600" size={16} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-sm">{notification.title}</p>
                        <span className="shrink-0 text-[11px] text-gray-500">
                          {formatKoreanDateTime(notification.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 break-all text-xs text-gray-600">{notification.message}</p>
                      {!notification.read && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation();
                            onMarkAsRead(notification.id);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              event.stopPropagation();
                              onMarkAsRead(notification.id);
                            }
                          }}
                          className="mt-2 inline-flex rounded bg-white px-2 py-1 text-[11px] font-bold text-[#b78b1f]"
                        >
                          읽음 처리
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {totalNotificationPages > 1 && (
            <div className="mt-3 flex items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={() => onSetNotificationPage(notificationPage - 1)}
                disabled={notificationPage <= 1}
                className="rounded border px-3 py-1 font-bold disabled:cursor-not-allowed disabled:opacity-40"
              >
                이전
              </button>
              <span className="font-bold text-gray-600">
                {notificationPage} / {totalNotificationPages}
              </span>
              <button
                type="button"
                onClick={() => onSetNotificationPage(notificationPage + 1)}
                disabled={notificationPage >= totalNotificationPages}
                className="rounded border px-3 py-1 font-bold disabled:cursor-not-allowed disabled:opacity-40"
              >
                다음
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
