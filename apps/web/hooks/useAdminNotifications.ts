import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { API_BASE_URL } from "@/utils/api";

export type AdminNotificationType = "orders" | "inquiries";

export type AdminNotificationSoundId = 1 | 2 | 3 | 4 | 5;

export type AdminNotificationSettings = {
  enabled: boolean;
  soundEnabled: boolean;
  orderNotifications: boolean;
  inquiryNotifications: boolean;
  selectedSoundId: AdminNotificationSoundId;
};

export type AdminNotificationItem = {
  id: string;
  type: AdminNotificationType;
  eventId: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
};

export const ADMIN_NOTIFICATION_SOUNDS: Array<{
  id: AdminNotificationSoundId;
  name: string;
  file: string;
}> = [
  { id: 1, name: "알림음 1", file: "/sounds/notification1.mp3" },
  { id: 2, name: "알림음 2", file: "/sounds/notification2.mp3" },
  { id: 3, name: "알림음 3", file: "/sounds/notification3.mp3" },
  { id: 4, name: "알림음 4", file: "/sounds/notification4.mp3" },
  { id: 5, name: "알림음 5", file: "/sounds/notification5.mp3" },
];

const SETTINGS_KEY = "ecommerce-admin-notification-settings";
const SOUND_KEY = "ecommerce-admin-notification-sound";
const NOTIFICATIONS_KEY = "ecommerce-admin-notification-items";
const NOTIFIED_IDS_KEY = "ecommerce-admin-notification-notified-ids";
const MAX_NOTIFIED_IDS = 200;
export const MAX_ADMIN_NOTIFICATIONS = 100;
export const ADMIN_NOTIFICATION_RETENTION_DAYS = 7;
export const ADMIN_NOTIFICATION_PAGE_SIZE = 10;

const DEFAULT_SETTINGS: AdminNotificationSettings = {
  enabled: true,
  soundEnabled: true,
  orderNotifications: true,
  inquiryNotifications: true,
  selectedSoundId: 1,
};

function getNotificationUrl(type: AdminNotificationType) {
  return type === "orders" ? "/admin?tab=orders" : "/admin?tab=inquiries";
}

function getNotificationActionLabel(type: AdminNotificationType) {
  return type === "orders" ? "주문 보기" : "문의 보기";
}

function isSoundId(value: number): value is AdminNotificationSoundId {
  return value >= 1 && value <= 5;
}

function loadSettings() {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  try {
    const savedSettings = window.localStorage.getItem(SETTINGS_KEY);
    const savedSound = Number(window.localStorage.getItem(SOUND_KEY));
    const parsed = savedSettings ? JSON.parse(savedSettings) : {};
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      selectedSoundId: isSoundId(savedSound)
        ? savedSound
        : isSoundId(Number(parsed.selectedSoundId))
        ? Number(parsed.selectedSoundId)
        : DEFAULT_SETTINGS.selectedSoundId,
    } as AdminNotificationSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function loadNotifications() {
  if (typeof window === "undefined") return [] as AdminNotificationItem[];

  try {
    const saved = window.localStorage.getItem(NOTIFICATIONS_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? pruneNotifications(parsed) : [];
  } catch {
    return [];
  }
}

export function pruneNotifications(notifications: AdminNotificationItem[]) {
  const retentionStart = Date.now() - ADMIN_NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return notifications
    .filter((notification) => {
      const createdAt = new Date(notification.createdAt).getTime();
      return Number.isFinite(createdAt) && createdAt >= retentionStart;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_ADMIN_NOTIFICATIONS);
}

function loadNotifiedIds() {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const saved = window.localStorage.getItem(NOTIFIED_IDS_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set<string>();
  }
}

function persistSettings(settings: AdminNotificationSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  window.localStorage.setItem(SOUND_KEY, String(settings.selectedSoundId));
}

function persistNotifications(notifications: AdminNotificationItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(pruneNotifications(notifications)));
}

function persistNotifiedIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  const trimmed = Array.from(ids).slice(-MAX_NOTIFIED_IDS);
  window.localStorage.setItem(NOTIFIED_IDS_KEY, JSON.stringify(trimmed));
}

async function playSoundById(soundId: AdminNotificationSoundId) {
  const sound = ADMIN_NOTIFICATION_SOUNDS.find((item) => item.id === soundId);
  if (!sound || typeof window === "undefined") return false;

  try {
    const audio = new Audio(sound.file);
    audio.volume = 0.5;
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

export function useAdminNotifications(options?: { onOrderNotification?: () => void }) {
  const router = useRouter();
  const { currentUser, isLoggedIn, getAccessToken } = useAuth();
  const [settings, setSettingsState] = useState<AdminNotificationSettings>(DEFAULT_SETTINGS);
  const [notifications, setNotificationsState] = useState<AdminNotificationItem[]>([]);
  const [notificationPage, setNotificationPageState] = useState(1);
  const notifiedIdsRef = useRef<Set<string>>(new Set());
  const pollingInitializedRef = useRef<Record<AdminNotificationType, boolean>>({
    orders: false,
    inquiries: false,
  });
  const settingsRef = useRef(settings);
  const onOrderNotificationRef = useRef(options?.onOrderNotification);
  const isAdmin = isLoggedIn && currentUser?.role === "admin";

  useEffect(() => {
    setSettingsState(loadSettings());
    setNotificationsState(loadNotifications());
    notifiedIdsRef.current = loadNotifiedIds();
  }, []);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    onOrderNotificationRef.current = options?.onOrderNotification;
  }, [options?.onOrderNotification]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  const totalNotificationPages = Math.max(1, Math.ceil(notifications.length / ADMIN_NOTIFICATION_PAGE_SIZE));

  const visibleNotifications = useMemo(() => {
    const safePage = Math.min(notificationPage, totalNotificationPages);
    const startIndex = (safePage - 1) * ADMIN_NOTIFICATION_PAGE_SIZE;
    return notifications.slice(startIndex, startIndex + ADMIN_NOTIFICATION_PAGE_SIZE);
  }, [notificationPage, notifications, totalNotificationPages]);

  const setNotificationPage = useCallback(
    (page: number) => {
      setNotificationPageState(Math.min(Math.max(page, 1), totalNotificationPages));
    },
    [totalNotificationPages]
  );

  const setSettings = useCallback((nextSettings: AdminNotificationSettings) => {
    setSettingsState(nextSettings);
    persistSettings(nextSettings);
  }, []);

  const updateSettings = useCallback(
    (updates: Partial<AdminNotificationSettings>) => {
      setSettings({ ...settingsRef.current, ...updates });
    },
    [setSettings]
  );

  const setNotifications = useCallback((updater: (prev: AdminNotificationItem[]) => AdminNotificationItem[]) => {
    setNotificationsState((prev) => {
      const next = pruneNotifications(updater(prev));
      persistNotifications(next);
      return next;
    });
  }, []);

  const playSelectedSound = useCallback(() => {
    if (!settingsRef.current.soundEnabled) return;
    void playSoundById(settingsRef.current.selectedSoundId);
  }, []);

  const previewSound = useCallback((soundId = settingsRef.current.selectedSoundId) => {
    void playSoundById(soundId);
  }, []);

  const markAsRead = useCallback(
    (notificationId: string) => {
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId ? { ...notification, read: true } : notification
        )
      );
    },
    [setNotifications]
  );

  const markTypeAsRead = useCallback(
    (type: AdminNotificationType) => {
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.type === type ? { ...notification, read: true } : notification
        )
      );
    },
    [setNotifications]
  );

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
  }, [setNotifications]);

  const openNotification = useCallback(
    (notification: AdminNotificationItem) => {
      markAsRead(notification.id);
      router.replace(getNotificationUrl(notification.type));
    },
    [markAsRead, router]
  );

  const addNotification = useCallback(
    (type: AdminNotificationType, eventId: string | number, message: string, force = false) => {
      const key = `${type}:${eventId}`;
      if (!force && notifiedIdsRef.current.has(key)) return;
      notifiedIdsRef.current.add(key);
      persistNotifiedIds(notifiedIdsRef.current);

      const currentSettings = settingsRef.current;
      if (!currentSettings.enabled) return;
      if (type === "orders" && !currentSettings.orderNotifications) return;
      if (type === "inquiries" && !currentSettings.inquiryNotifications) return;

      const item: AdminNotificationItem = {
        id: key,
        eventId: String(eventId),
        type,
        title: type === "orders" ? "새 주문이 접수되었습니다" : "새 문의가 접수되었습니다",
        message,
        createdAt: new Date().toISOString(),
        read: false,
      };

      setNotifications((prev) => [item, ...prev.filter((notification) => notification.id !== item.id)]);
      playSelectedSound();

      if (type === "orders") {
        onOrderNotificationRef.current?.();
      }

      toast.success(item.title, {
        description: item.message,
        action: {
          label: getNotificationActionLabel(type),
          onClick: () => openNotification(item),
        },
        duration: 6000,
      });
    },
    [openNotification, playSelectedSound, setNotifications]
  );

  useEffect(() => {
    if (!isAdmin || !settings.enabled) return;

    const supabase = createClient("admin");
    const ordersChannel = supabase
      .channel(`ecommerce-admin-orders-notifications-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload: { new?: { id?: string | number } }) => {
          const orderId = payload.new?.id;
          if (!orderId) return;
          addNotification("orders", orderId, `주문번호 ${orderId}`);
        }
      )
      .subscribe();

    const inquiriesChannel = supabase
      .channel(`ecommerce-admin-inquiries-notifications-${crypto.randomUUID()}`)
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

    const pollLatest = async () => {
      const token = await getAccessToken();
      if (!token) return;

      await Promise.all(
        (["orders", "inquiries"] as AdminNotificationType[]).map(async (type) => {
          const response = await fetch(`${API_BASE_URL}/api/admin/${type}?page=1&perPage=5`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) return;

          const data = await response.json();
          const items = type === "orders" ? data.orders || [] : data.inquiries || [];
          const ids = items
            .map((item: { id?: string | number }) => item.id)
            .filter(Boolean) as Array<string | number>;

          if (!pollingInitializedRef.current[type]) {
            ids.forEach((id) => notifiedIdsRef.current.add(`${type}:${id}`));
            persistNotifiedIds(notifiedIdsRef.current);
            pollingInitializedRef.current[type] = true;
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

    void pollLatest();
    const intervalId = window.setInterval(pollLatest, 30000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(inquiriesChannel);
    };
  }, [addNotification, getAccessToken, isAdmin, settings.enabled]);

  return {
    settings,
    notifications,
    visibleNotifications,
    unreadCount,
    notificationPage,
    totalNotificationPages,
    isAdmin,
    updateSettings,
    setNotificationPage,
    markAsRead,
    markTypeAsRead,
    markAllAsRead,
    openNotification,
    previewSound,
  };
}
