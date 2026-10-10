import {
  Bell,
  CheckCircle2,
  Info,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { Notification } from "./notification.types";
import { getAnalysisRuns } from "@/services/analysis";

function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const dropdownRef =
    useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  useEffect(() => {
    if (!open) return;
    let active = true;
    void (async () => {
      await Promise.resolve();
      if (!active) return;
      setLoading(true);
      setLoadError(false);
      try {
        const runs = await getAnalysisRuns();
        if (!active) return;
      setNotifications(runs.slice(0, 8).map((run) => ({
        id: run.id,
        title: `${run.repository.name} analysis ${run.status.toLowerCase()}`,
        message: run.error || `${run.progress}% complete${run.currentStage ? ` · ${run.currentStage}` : ""}`,
        type: run.status === "FAILED" ? "error" : run.status === "COMPLETED" ? "success" : "info",
        createdAt: new Date(run.createdAt).toLocaleString(),
        read: false,
        })));
      } catch { if (active) setLoadError(true); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [open]);

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

          {loading ? <div className="p-5 text-sm text-slate-300">Loading recent analysis activity…</div> : loadError ? <div role="alert" className="p-5 text-sm text-red-300">Could not load recent activity.</div> : notifications.length === 0 ? (
            <div className="flex h-56 flex-col items-center justify-center">
              <Bell
                size={34}
                className="mb-3 text-slate-600"
              />

              <p className="font-medium">
                No notifications
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Analysis activity will appear here.
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
