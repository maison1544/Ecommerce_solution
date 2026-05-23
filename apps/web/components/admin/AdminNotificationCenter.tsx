import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, MessageCircle, RotateCw, ShoppingCart, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { API_BASE_URL } from "@/utils/api";
import { formatKoreanDateTime } from "@/utils/date";

type AdminEventType = "orders" | "inquiries";

type NotificationSettings = {
  enabled: boolean;
  soundEnabled: boolean;
  orderNotifications: boolean;
  inquiryNotifications: boolean;
};

type NotificationItem = {
  id: string;
  type: AdminEventType;
  title: string;
  message: string;
  createdAt: string;
};

type AdminNotificationCenterProps = {
  onOrderNotification?: () => void;
};

const STORAGE_KEY = "ecommerce-admin-notifications-enabled";
const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  soundEnabled: true,
  orderNotifications: true,
  inquiryNotifications: true,
};

function getEventUrl(type: AdminEventType) {
  return type === "orders" ? "/admin?tab=orders" : "/admin?tab=inquiries";
}

function getEventLabel(type: AdminEventType) {
  return type === "orders" ? "주문 보기" : "문의 보기";
}

function playNotificationSound() {
  if (typeof window === "undefined") return;

  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextCtor) return;

    const audioContext = new AudioContextCtor();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.12);
    gain.gain.setValueAtTime(0.001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.28);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
    window.setTimeout(() => audioContext.close().catch(() => undefined), 500);
  } catch {
  }
}

export function AdminNotificationCenter({ onOrderNotification }: AdminNotificationCenterProps) {
  const router = useRouter();
  const { currentUser, isLoggedIn, getAccessToken } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifiedIdsRef = useRef<Set<string>>(new Set());
  const isAdmin = isLoggedIn && currentUser?.role === "admin";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
    } catch {
      setSettings(DEFAULT_SETTINGS);
    }
  }, []);

  const saveSettings = useCallback((nextSettings: NotificationSettings) => {
    setSettings(nextSettings);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
    }
  }, []);

  const goToEvent = useCallback(
    (type: AdminEventType) => {
      router.replace(getEventUrl(type));
    },
    [router]
  );

  const addNotification = useCallback(
    (type: AdminEventType, eventId: string | number, message: string, force = false) => {
      const notificationKey = `${type}:${eventId}`;
      if (!force && notifiedIdsRef.current.has(notificationKey)) return;
      notifiedIdsRef.current.add(notificationKey);

      if (!settings.enabled && !force) return;
      if (type === "orders" && !settings.orderNotifications && !force) return;
      if (type === "inquiries" && !settings.inquiryNotifications && !force) return;

      const title = type === "orders" ? "새 주문이 접수되었습니다" : "새 문의가 접수되었습니다";
      const item: NotificationItem = {
        id: `${notificationKey}:${Date.now()}`,
        type,
        title,
        message,
        createdAt: new Date().toISOString(),
      };

      setNotifications((prev) => [item, ...prev].slice(0, 30));
      setUnreadCount((prev) => prev + 1);

      if ((settings.soundEnabled && settings.enabled) || force) {
        playNotificationSound();
      }

      if (type === "orders") {
        onOrderNotification?.();
      }

      toast.success(title, {
        description: message,
        action: {
          label: getEventLabel(type),
          onClick: () => goToEvent(type),
        },
        duration: 6000,
      });
    },
    [goToEvent, onOrderNotification, settings]
  );

  useEffect(() => {
    if (!isAdmin || !settings.enabled) return;

    const supabase = createClient("admin");
    const ordersChannel = supabase
      .channel("ecommerce-admin-orders-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload: { new?: { id?: string | number; total_amount?: number } }) => {
          const orderId = payload.new?.id;
          if (!orderId) return;
          addNotification("orders", orderId, `주문번호 ${orderId}`);
        }
      )
      .subscribe();

    const inquiriesChannel = supabase
      .channel("ecommerce-admin-inquiries-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "inquiries" },
        (payload: { new?: { id?: string | number; title?: string } }) => {
          const inquiryId = payload.new?.id;
          if (!inquiryId) return;
          addNotification("inquiries", inquiryId, payload.new?.title || `문의번호 ${inquiryId}`);
        }
      )
      .subscribe();

    const pollingInitialized: Record<AdminEventType, boolean> = {
      orders: false,
      inquiries: false,
    };

    const pollLatest = async () => {
      const token = await getAccessToken();
      if (!token) return;

      await Promise.all(
        (["orders", "inquiries"] as AdminEventType[]).map(async (type) => {
          const response = await fetch(`${API_BASE_URL}/api/admin/${type}?page=1&perPage=5`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!response.ok) return;

          const data = await response.json();
          const items = type === "orders" ? data.orders || [] : data.inquiries || [];
          const ids = items
            .map((item: { id?: string | number }) => item.id)
            .filter(Boolean) as Array<string | number>;

          if (!pollingInitialized[type]) {
            ids.forEach((id) => notifiedIdsRef.current.add(`${type}:${id}`));
            pollingInitialized[type] = true;
            return;
          }

          [...items].reverse().forEach((item: { id?: string | number; title?: string }) => {
            if (!item.id) return;
            addNotification(
              type,
              item.id,
              type === "orders" ? `주문번호 ${item.id}` : item.title || `문의번호 ${item.id}`
            );
          });
        })
      );
    };

    pollLatest();
    const intervalId = window.setInterval(pollLatest, 30000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(inquiriesChannel);
    };
  }, [addNotification, getAccessToken, isAdmin, settings.enabled]);

  if (!isAdmin) return null;

  return (
    <section className="mb-8 rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center">
            {settings.enabled ? <Bell className="text-blue-600" size={22} /> : <BellOff className="text-gray-500" size={22} />}
          </div>
          <div>
            <h2 className="font-bold">관리자 알림</h2>
            <p className="text-sm text-gray-600">
              신규 주문과 문의를 실시간으로 감지하고 toast와 알림음으로 알려드립니다.
            </p>
            <p className="mt-1 text-xs text-gray-500">
              읽지 않은 알림 {unreadCount}개
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => saveSettings({ ...settings, enabled: !settings.enabled })}
            className={`inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-bold ${
              settings.enabled ? "bg-black text-white" : "bg-gray-200 text-gray-700"
            }`}
          >
            {settings.enabled ? <Bell size={16} /> : <BellOff size={16} />}
            {settings.enabled ? "알림 켜짐" : "알림 꺼짐"}
          </button>
          <button
            type="button"
            onClick={() => saveSettings({ ...settings, soundEnabled: !settings.soundEnabled })}
            className={`inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-bold ${
              settings.soundEnabled ? "bg-[#b78b1f] text-white" : "bg-gray-200 text-gray-700"
            }`}
          >
            {settings.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            {settings.soundEnabled ? "알림음 켜짐" : "알림음 꺼짐"}
          </button>
          <button
            type="button"
            onClick={() => setUnreadCount(0)}
            className="inline-flex items-center gap-2 rounded bg-gray-100 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-200"
          >
            <RotateCw size={16} />
            읽음 처리
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="flex cursor-pointer items-center gap-2 rounded bg-gray-50 px-3 py-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={settings.orderNotifications}
            onChange={(event) => saveSettings({ ...settings, orderNotifications: event.target.checked })}
          />
          <ShoppingCart size={16} />
          신규 주문 알림
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded bg-gray-50 px-3 py-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={settings.inquiryNotifications}
            onChange={(event) => saveSettings({ ...settings, inquiryNotifications: event.target.checked })}
          />
          <MessageCircle size={16} />
          신규 문의 알림
        </label>
      </div>

      {notifications.length > 0 && (
        <div className="mt-4 space-y-2">
          {notifications.slice(0, 3).map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => goToEvent(notification.type)}
              className="w-full rounded border bg-gray-50 p-3 text-left hover:bg-gray-100"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold">{notification.title}</span>
                <span className="text-xs text-gray-500">{formatKoreanDateTime(notification.createdAt)}</span>
              </div>
              <p className="mt-1 break-all text-sm text-gray-600">{notification.message}</p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
