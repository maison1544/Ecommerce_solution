import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, BellOff, X, ShoppingBag, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabase/client";
import { useAuth } from "../context/AuthContext";

// 알림음 URL (무료 사운드)
const NOTIFICATION_SOUND_URL =
  "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

// 알림 설정 로컬 스토리지 키
const NOTIFICATION_SETTINGS_KEY = "admin-notification-settings";

// Rate limiting 설정
const NOTIFICATION_COOLDOWN = 5000; // 5초 쿨다운
const MAX_NOTIFICATIONS_PER_MINUTE = 10;

interface NotificationItem {
  id: string;
  type: "order" | "inquiry";
  title: string;
  message: string;
  createdAt: Date;
  link: string;
}

interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  orderNotifications: boolean;
  inquiryNotifications: boolean;
}

const defaultSettings: NotificationSettings = {
  enabled: true,
  soundEnabled: true,
  orderNotifications: true,
  inquiryNotifications: true,
};

export function AdminNotification() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [settings, setSettings] =
    useState<NotificationSettings>(defaultSettings);
  const [unreadCount, setUnreadCount] = useState(0);

  // Rate limiting refs
  const lastNotificationTime = useRef<number>(0);
  const notificationCountRef = useRef<number>(0);
  const notificationResetTimer = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const subscriptionsRef = useRef<any[]>([]);

  // 관리자 여부 확인 (hooks 전에 조건부 return 금지)
  const isAdmin = currentUser?.role === "admin";

  // 로컬 스토리지에서 설정 로드
  useEffect(() => {
    const saved = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch {
        setSettings(defaultSettings);
      }
    }
  }, []);

  // 설정 저장
  const saveSettings = useCallback((newSettings: NotificationSettings) => {
    setSettings(newSettings);
    localStorage.setItem(
      NOTIFICATION_SETTINGS_KEY,
      JSON.stringify(newSettings)
    );
  }, []);

  // 알림음 재생
  const playNotificationSound = useCallback(() => {
    if (!settings.soundEnabled) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
      audioRef.current.volume = 0.5;
    }

    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {
      // 사용자 인터랙션 없이 재생 실패 시 무시
    });
  }, [settings.soundEnabled]);

  // Rate limiting 체크
  const canShowNotification = useCallback(() => {
    const now = Date.now();

    // 쿨다운 체크
    if (now - lastNotificationTime.current < NOTIFICATION_COOLDOWN) {
      return false;
    }

    // 분당 알림 수 체크
    if (notificationCountRef.current >= MAX_NOTIFICATIONS_PER_MINUTE) {
      return false;
    }

    return true;
  }, []);

  // 알림 추가 (rate limiting 적용)
  const addNotification = useCallback(
    (item: Omit<NotificationItem, "id" | "createdAt">) => {
      console.log("[AdminNotification] addNotification 호출:", item, {
        enabled: settings.enabled,
      });

      if (!settings.enabled) {
        console.log("[AdminNotification] 알림 비활성화됨");
        return;
      }
      if (!canShowNotification()) {
        console.log("[AdminNotification] Rate limit 초과");
        return;
      }

      const now = Date.now();
      lastNotificationTime.current = now;
      notificationCountRef.current += 1;

      // 1분 후 카운트 리셋
      if (!notificationResetTimer.current) {
        notificationResetTimer.current = setTimeout(() => {
          notificationCountRef.current = 0;
          notificationResetTimer.current = null;
        }, 60000);
      }

      const newNotification: NotificationItem = {
        ...item,
        id: `${now}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
      };

      setNotifications((prev) => [newNotification, ...prev].slice(0, 50)); // 최대 50개 유지
      setUnreadCount((prev) => prev + 1);

      // 알림음 재생
      playNotificationSound();

      // 토스트 알림 표시
      toast(item.title, {
        description: item.message,
        action: {
          label: "보기",
          onClick: () => navigate(item.link),
        },
        duration: 5000,
      });
    },
    [settings.enabled, canShowNotification, playNotificationSound, navigate]
  );

  // Supabase Realtime 구독
  useEffect(() => {
    if (!isAdmin || !settings.enabled) {
      console.log("[AdminNotification] 구독 스킵:", {
        isAdmin,
        enabled: settings.enabled,
      });
      return;
    }

    console.log("[AdminNotification] Realtime 구독 시작");

    // 주문 알림 구독
    if (settings.orderNotifications) {
      const orderChannel = supabase
        .channel("admin-orders-notification")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "orders",
          },
          (payload: any) => {
            console.log("[AdminNotification] 새 주문 감지:", payload);
            addNotification({
              type: "order",
              title: "🛒 새로운 주문",
              message: `새로운 주문이 접수되었습니다. (주문번호: ${
                payload.new?.id || "N/A"
              })`,
              link: "/admin?tab=orders",
            });
          }
        )
        .subscribe((status) => {
          console.log("[AdminNotification] 주문 채널 상태:", status);
        });

      subscriptionsRef.current.push(orderChannel);
    }

    // 문의 알림 구독
    if (settings.inquiryNotifications) {
      const inquiryChannel = supabase
        .channel("admin-inquiries-notification")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "inquiries",
          },
          (payload: any) => {
            console.log("[AdminNotification] 새 문의 감지:", payload);
            addNotification({
              type: "inquiry",
              title: "💬 새로운 문의",
              message: `새로운 문의가 접수되었습니다. (${
                payload.new?.title || "제목 없음"
              })`,
              link: "/admin?tab=inquiries",
            });
          }
        )
        .subscribe((status) => {
          console.log("[AdminNotification] 문의 채널 상태:", status);
        });

      subscriptionsRef.current.push(inquiryChannel);
    }

    return () => {
      console.log("[AdminNotification] 구독 해제");
      subscriptionsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      subscriptionsRef.current = [];
    };
  }, [
    isAdmin,
    settings.enabled,
    settings.orderNotifications,
    settings.inquiryNotifications,
    addNotification,
  ]);

  // 관리자가 아니면 렌더링하지 않음
  if (!isAdmin) {
    return null;
  }

  // 알림 패널 토글
  const togglePanel = () => {
    setShowPanel(!showPanel);
    if (!showPanel) {
      setUnreadCount(0); // 패널 열면 읽음 처리
    }
  };

  // 알림 삭제
  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // 전체 알림 삭제
  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <div className="fixed top-20 right-4 z-[100]">
      {/* 알림 버튼 */}
      <button
        onClick={togglePanel}
        className="relative p-3 bg-white border-2 border-gray-200 hover:border-gray-400 rounded-full transition-colors shadow-lg"
        title="관리자 알림 설정"
      >
        {settings.enabled ? (
          <Bell
            size={24}
            className={unreadCount > 0 ? "text-yellow-500" : "text-gray-700"}
          />
        ) : (
          <BellOff size={24} className="text-gray-400" />
        )}

        {/* 읽지 않은 알림 배지 */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* 알림 패널 */}
      {showPanel && (
        <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white border rounded-lg shadow-xl z-50 max-h-[500px] overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <h3 className="font-bold text-lg">알림</h3>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  모두 지우기
                </button>
              )}
              <button
                onClick={() => setShowPanel(false)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* 알림 설정 */}
          <div className="p-3 border-b bg-gray-50 space-y-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) =>
                  saveSettings({ ...settings, enabled: e.target.checked })
                }
                className="rounded"
              />
              <span>알림 활성화</span>
            </label>

            {settings.enabled && (
              <>
                <label className="flex items-center gap-2 text-sm cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={(e) =>
                      saveSettings({
                        ...settings,
                        soundEnabled: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  <span>알림음</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={settings.orderNotifications}
                    onChange={(e) =>
                      saveSettings({
                        ...settings,
                        orderNotifications: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  <span>주문 알림</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={settings.inquiryNotifications}
                    onChange={(e) =>
                      saveSettings({
                        ...settings,
                        inquiryNotifications: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  <span>문의 알림</span>
                </label>
              </>
            )}
          </div>

          {/* 알림 목록 */}
          <div className="overflow-y-auto max-h-[300px]">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">새로운 알림이 없습니다</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start gap-3 p-4 border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setShowPanel(false);
                    // 패널 닫힌 후 navigate 실행
                    setTimeout(() => {
                      navigate(notification.link);
                    }, 100);
                  }}
                >
                  <div
                    className={`p-2 rounded-full ${
                      notification.type === "order"
                        ? "bg-blue-100"
                        : "bg-green-100"
                    }`}
                  >
                    {notification.type === "order" ? (
                      <ShoppingBag size={16} className="text-blue-600" />
                    ) : (
                      <MessageCircle size={16} className="text-green-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">
                      {notification.title}
                    </p>
                    <p className="text-xs text-gray-600 truncate">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {notification.createdAt.toLocaleTimeString("ko-KR")}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(notification.id);
                    }}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
