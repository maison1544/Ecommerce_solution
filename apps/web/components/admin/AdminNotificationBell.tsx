import { useEffect, useRef, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { AdminNotificationPanel } from "./AdminNotificationPanel";

type AdminNotificationBellProps = {
  onOrderNotification?: () => void;
};

export function AdminNotificationBell({ onOrderNotification }: AdminNotificationBellProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const notifications = useAdminNotifications({ onOrderNotification });

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  if (!notifications.isAdmin) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-black bg-white text-black transition-colors hover:bg-black hover:text-white"
        aria-label="관리자 알림"
        aria-expanded={open}
      >
        {notifications.settings.enabled ? <Bell size={18} /> : <BellOff size={18} />}
        {notifications.unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {notifications.unreadCount > 9 ? "9+" : notifications.unreadCount}
          </span>
        )}
      </button>

      {open && (
        <AdminNotificationPanel
          settings={notifications.settings}
          notifications={notifications.visibleNotifications}
          unreadCount={notifications.unreadCount}
          notificationPage={notifications.notificationPage}
          totalNotificationPages={notifications.totalNotificationPages}
          onClose={() => setOpen(false)}
          onUpdateSettings={notifications.updateSettings}
          onPreviewSound={notifications.previewSound}
          onSetNotificationPage={notifications.setNotificationPage}
          onOpenNotification={(notification) => {
            notifications.openNotification(notification);
            setOpen(false);
          }}
          onMarkAllAsRead={notifications.markAllAsRead}
          onMarkAsRead={notifications.markAsRead}
        />
      )}
    </div>
  );
}
