import {
  Bell,
  CheckCircle2,
  Info,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { notifications as mockNotifications } from "./notification.data";
import type { Notification } from "./notification.types";

function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] =
    useState(mockNotifications);

  const dropdownRef =
    useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent
    ) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    }

    function handleEscape(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  function markAllAsRead() {
    setNotifications((prev) =>
      prev.map((notification) => ({
        ...notification,
        read: true,
      }))
    );
  }

  function getIcon(
    type: Notification["type"]
  ) {
    switch (type) {
      case "success":
        return (
          <CheckCircle2
            size={18}
            className="text-green-400"
          />
        );

      case "warning":
        return (
          <AlertTriangle
            size={18}
            className="text-yellow-400"
          />
        );

      case "error":
        return (
          <XCircle
            size={18}
            className="text-red-400"
          />
        );

      default:
        return (
          <Info
            size={18}
            className="text-cyan-400"
          />
        );
    }
  }

  return (
    <div
      ref={dropdownRef}
      className="relative"
    >
      <button
        onClick={() =>
          setOpen(!open)
        }
        className="relative rounded-xl bg-slate-900 p-3 transition hover:bg-slate-800"
      >
        <Bell size={20} />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-96 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 p-4">
            <h3 className="font-semibold">
              Notifications
            </h3>

            <button
              onClick={markAllAsRead}
              className="text-sm text-cyan-400 transition hover:text-cyan-300"
            >
              Mark all read
            </button>
          </div>

          {notifications.length === 0 ? (
            <div className="flex h-56 flex-col items-center justify-center">
              <Bell
                size={34}
                className="mb-3 text-slate-600"
              />

              <p className="font-medium">
                No notifications
              </p>

              <p className="mt-1 text-sm text-slate-400">
                AI events will appear here.
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {notifications.map(
                (notification) => (
                  <div
                    key={notification.id}
                    className={`flex gap-3 border-b border-slate-800 p-4 transition hover:bg-slate-800 ${
                      notification.read
                        ? "bg-slate-950"
                        : "bg-slate-900"
                    }`}
                  >
                    <div className="mt-1">
                      {getIcon(
                        notification.type
                      )}
                    </div>

                    <div className="flex-1">
                      <p className="font-medium">
                        {notification.title}
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        {
                          notification.message
                        }
                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        {
                          notification.createdAt
                        }
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;