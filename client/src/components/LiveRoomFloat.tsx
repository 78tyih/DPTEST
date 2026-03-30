import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, PanInfo } from "framer-motion";
import { Radio, ExternalLink, X, Video, Calendar } from "lucide-react";
import { SiBilibili } from "react-icons/si";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTracking } from "@/hooks/use-tracking";

const BILIBILI_LIVE = "https://live.bilibili.com/1874453448";
const TENCENT_MEETING = "https://meeting.tencent.com/p/3621520297";

const SCHEDULE = [
  { day: "周一至周五", time: "10:00 - 12:00" },
  { day: "周一至周五", time: "14:00 - 16:00" },
  { day: "周一至周五", time: "20:00 - 22:00" },
];

function shouldShow(path: string): boolean {
  if (path === "/home" || path === "/result") return true;
  if (path.startsWith("/report/")) return true;
  return false;
}

function useLiveStatus() {
  const [isLive, setIsLive] = useState(false);
  const [title, setTitle] = useState("");

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const res = await fetch("/api/live-status");
        if (res.ok && mounted) {
          const data = await res.json();
          setIsLive(data.isLive);
          setTitle(data.title || "");
        }
      } catch {}
    };
    check();
    const interval = setInterval(check, 60000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  return { isLive, title };
}

function ScheduleSection() {
  return (
    <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Calendar className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
        <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>直播时间</span>
      </div>
      <div className="space-y-0.5">
        {SCHEDULE.map((s, i) => (
          <div key={i} className="flex items-center justify-between text-[10px]">
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>{s.day}</span>
            <span style={{ color: 'rgba(56,189,248,0.7)' }}>{s.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LiveRoomFloat() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const { trackEvent } = useTracking();
  const { isLive, title } = useLiveStatus();
  const containerRef = useRef<HTMLDivElement>(null);

  const y = useMotionValue(0);
  const springY = useSpring(y, { stiffness: 300, damping: 25, mass: 0.8 });

  useEffect(() => {
    if (!panelOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [panelOpen]);

  useEffect(() => {
    setPanelOpen(false);
  }, [location]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (info.offset.x < -30) {
      setCollapsed(true);
      setPanelOpen(false);
      return;
    }
    if (collapsed && info.offset.x > 20) {
      setCollapsed(false);
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const viewH = window.innerHeight;
    const margin = isMobile ? 80 : 60;
    if (rect.top < margin) {
      y.set(y.get() - (rect.top - margin));
    } else if (rect.bottom > viewH - margin) {
      y.set(y.get() - (rect.bottom - (viewH - margin)));
    }
  }, [y, isMobile, collapsed]);

  const handleButtonTap = useCallback(() => {
    if (collapsed) {
      setCollapsed(false);
    } else {
      setPanelOpen(o => !o);
    }
  }, [collapsed]);

  if (!shouldShow(location)) return null;

  const accentColor = isLive ? 'rgba(239,68,68,' : 'rgba(56,189,248,';
  const liveColor = isLive ? '#EF4444' : 'var(--info)';

  const panelContent = (
    <>
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: isLive
          ? 'linear-gradient(105deg, transparent 40%, rgba(239,68,68,0.06) 50%, transparent 60%)'
          : 'linear-gradient(105deg, transparent 40%, rgba(56,189,248,0.05) 50%, transparent 60%)'
        }}
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: isLive ? 3 : 5, repeat: Infinity, ease: "easeInOut", repeatDelay: isLive ? 2 : 5 }}
      />
      <div className="relative">
        <button
          onClick={() => setPanelOpen(false)}
          className="absolute -top-1 -right-1 w-6 h-6 flex items-center justify-center rounded-full transition-colors hover:bg-white/10"
          style={{ background: 'rgba(255,255,255,0.06)' }}
          data-testid="button-close-float"
        >
          <X className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
        </button>
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 relative" style={{ background: `${accentColor}0.1)` }}>
            {isLive ? (
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Radio className="w-4.5 h-4.5" style={{ color: liveColor }} />
              </motion.div>
            ) : (
              <Radio className="w-4.5 h-4.5" style={{ color: liveColor }} />
            )}
            {isLive && (
              <motion.div
                className="absolute inset-0 rounded-lg"
                style={{ border: `1px solid ${accentColor}0.4)` }}
                animate={{ scale: [1, 1.3], opacity: [0.6, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-strong)' }}>
                职业交易
              </p>
              {isLive && (
                <motion.div
                  className="flex items-center gap-1 rounded-full"
                  style={{ padding: '1px 6px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)' }}
                  data-testid="badge-live-panel"
                >
                  <motion.div
                    className="rounded-full"
                    style={{ width: 5, height: 5, background: '#EF4444' }}
                    animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <span className="font-bold uppercase tracking-wider" style={{ fontSize: '8px', color: '#EF4444' }}>LIVE</span>
                </motion.div>
              )}
            </div>
            <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-strong)' }}>
              直播间
            </p>
          </div>
        </div>

        {isLive && title && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-2 px-2 py-1.5 rounded-lg"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
          >
            <p className="text-[10px] font-medium" style={{ color: '#EF4444' }}>
              正在直播：{title}
            </p>
          </motion.div>
        )}

        {isLive ? (
          <p className="text-[11px] leading-relaxed mb-1.5" style={{ color: '#EF4444' }}>
            正在直播中，点击立即观看
          </p>
        ) : (
          <p className="text-[11px] leading-relaxed mb-1.5" style={{ color: 'var(--text-muted)' }}>
            每日实盘直播 · 订单流实战 · Ali交易日志
          </p>
        )}
        <p className="text-[10px] mb-3" style={{ color: 'rgba(34,197,94,0.7)' }}>
          免费观摩 · 看不懂可跟助理免费学习
        </p>
        <div className="space-y-1.5">
          <a
            href={BILIBILI_LIVE}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("live_room_click", { page: location, source: "bilibili" })}
            className="w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90 relative overflow-hidden"
            style={{
              background: isLive ? 'rgba(239,68,68,0.15)' : 'rgba(56,189,248,0.12)',
              color: isLive ? '#EF4444' : 'var(--info)',
              border: `1px solid ${isLive ? 'rgba(239,68,68,0.3)' : 'rgba(56,189,248,0.2)'}`,
            }}
            data-testid="link-float-bilibili"
          >
            {isLive && (
              <motion.div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.1), transparent)' }}
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            )}
            <SiBilibili className="w-3.5 h-3.5 relative" />
            <span className="relative">{isLive ? "正在直播 - 立即观看" : "B站直播间"}</span>
            <ExternalLink className="w-3 h-3 opacity-60 relative" />
          </a>
          <a
            href={TENCENT_MEETING}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("live_room_click", { page: location, source: "tencent_meeting" })}
            className="w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
            style={{ background: 'rgba(34,197,94,0.08)', color: 'var(--success)', border: '1px solid rgba(34,197,94,0.2)' }}
            data-testid="link-float-tencent-meeting"
          >
            <Video className="w-3.5 h-3.5" />
            腾讯会议
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        </div>
        {!isLive && <ScheduleSection />}
      </div>
    </>
  );

  const panelStyle = {
    background: isLive
      ? 'linear-gradient(160deg, #1a0f0f 0%, #0D0F14 50%, rgba(239,68,68,0.06) 100%)'
      : 'linear-gradient(160deg, #0F1620 0%, #0D0F14 50%, rgba(56,189,248,0.04) 100%)',
    border: `1px solid ${isLive ? 'rgba(239,68,68,0.2)' : 'rgba(56,189,248,0.15)'}`,
    boxShadow: isLive
      ? '0 8px 32px rgba(0,0,0,0.5), 0 0 24px rgba(239,68,68,0.1)'
      : '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(56,189,248,0.06)',
  };

  const iconColor = isLive ? '#EF4444' : 'var(--info)';
  const btnAccent = isLive ? 'rgba(239,68,68,' : 'rgba(56,189,248,';

  const collapsedTab = (
    <motion.div
      key="collapsed"
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -20, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      onClick={handleButtonTap}
      className="cursor-pointer"
      data-testid="button-float-collapsed"
    >
      <motion.div
        className="flex items-center justify-center relative"
        style={{
          width: 20,
          height: 56,
          borderRadius: '0 10px 10px 0',
          background: isLive
            ? 'linear-gradient(180deg, rgba(239,68,68,0.2), rgba(239,68,68,0.08))'
            : 'linear-gradient(180deg, rgba(56,189,248,0.15), rgba(56,189,248,0.05))',
          borderRight: `1px solid ${btnAccent}0.3)`,
          borderTop: `1px solid ${btnAccent}0.2)`,
          borderBottom: `1px solid ${btnAccent}0.2)`,
          boxShadow: `2px 0 12px rgba(0,0,0,0.3), 2px 0 8px ${btnAccent}0.1)`,
        }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Radio className="w-3 h-3" style={{ color: iconColor }} />
        </motion.div>
        {isLive && (
          <motion.div
            className="absolute -top-1 -right-1 rounded-full"
            style={{ width: 6, height: 6, background: '#EF4444' }}
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </motion.div>
    </motion.div>
  );

  const expandedButton = (
    <motion.div
      key="expanded"
      initial={{ x: -30, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -30, opacity: 0 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
    >
      <motion.div
        animate={{ y: panelOpen ? 0 : [0, -5, 0, 4, 0] }}
        transition={panelOpen ? {} : { duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.div
          onClick={handleButtonTap}
          whileTap={{ scale: 0.92 }}
          className="flex flex-col items-center justify-center rounded-xl relative cursor-pointer select-none"
          style={{
            width: 46,
            height: 54,
            padding: '6px 4px',
            background: isLive
              ? (panelOpen ? 'rgba(239,68,68,0.2)' : 'linear-gradient(180deg, rgba(239,68,68,0.18), rgba(239,68,68,0.06))')
              : (panelOpen ? 'rgba(56,189,248,0.15)' : 'linear-gradient(180deg, rgba(56,189,248,0.12), rgba(56,189,248,0.04))'),
            border: `1px solid ${btnAccent}${isLive ? '0.35)' : '0.2)'}`,
          }}
          data-testid="button-float-trigger"
        >
          <motion.div
            className="absolute -inset-1 rounded-xl pointer-events-none"
            style={{ filter: 'blur(8px)' }}
            animate={{
              boxShadow: isLive
                ? [
                    '0 4px 16px rgba(0,0,0,0.3), 0 0 8px rgba(239,68,68,0.1)',
                    '0 6px 24px rgba(0,0,0,0.35), 0 0 18px rgba(239,68,68,0.25)',
                    '0 4px 16px rgba(0,0,0,0.3), 0 0 8px rgba(239,68,68,0.1)',
                  ]
                : [
                    '0 4px 16px rgba(0,0,0,0.3), 0 0 6px rgba(56,189,248,0.06)',
                    '0 6px 24px rgba(0,0,0,0.35), 0 0 14px rgba(56,189,248,0.15)',
                    '0 4px 16px rgba(0,0,0,0.3), 0 0 6px rgba(56,189,248,0.06)',
                  ],
              opacity: panelOpen ? 0 : [0.6, 1, 0.6],
            }}
            transition={{ duration: isLive ? 2 : 3.5, repeat: Infinity, ease: "easeInOut" }}
          />

          {isLive ? (
            <>
              <motion.div
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{ border: `1.5px solid ${btnAccent}0.4)` }}
                animate={{ scale: [1, 1.12, 1], opacity: [0.7, 0.15, 0.7] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{ background: `radial-gradient(circle at center, ${btnAccent}0.1) 0%, transparent 70%)` }}
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              />
            </>
          ) : (
            <motion.div
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{ background: `radial-gradient(circle at 50% 40%, ${btnAccent}0.1) 0%, transparent 70%)` }}
              animate={{ opacity: panelOpen ? 0 : [0.2, 0.55, 0.2] }}
              transition={{ duration: 3.5, repeat: panelOpen ? 0 : Infinity, ease: "easeInOut" }}
            />
          )}

          <div className="relative flex flex-col items-center gap-0.5">
            {isLive ? (
              <motion.div
                animate={{ scale: [1, 1.25, 1], rotate: [0, 8, -8, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Radio className="w-4.5 h-4.5" style={{ color: iconColor }} />
              </motion.div>
            ) : (
              <motion.div
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Radio className="w-4 h-4" style={{ color: iconColor }} />
              </motion.div>
            )}

            {isLive ? (
              <motion.span
                className="font-bold tracking-wider leading-none"
                style={{ fontSize: '8px', color: '#EF4444' }}
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                LIVE
              </motion.span>
            ) : (
              <span
                className="font-semibold leading-none text-center"
                style={{ fontSize: '8px', color: 'var(--text-strong)', lineHeight: '1.3' }}
              >
                交易直播间
              </span>
            )}
          </div>

          {isLive && (
            <motion.div
              className="absolute -top-1.5 -right-1.5 rounded-full"
              style={{ width: 8, height: 8, background: '#EF4444' }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [1, 0.5, 1],
                boxShadow: [
                  '0 0 4px rgba(239,68,68,0.4)',
                  '0 0 12px rgba(239,68,68,0.8)',
                  '0 0 4px rgba(239,68,68,0.4)',
                ],
              }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
            />
          )}

          {!isLive && !panelOpen && (
            <motion.div
              className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--success)' }}
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );

  const panelOffset = isMobile ? 54 : 54;

  return (
    <motion.div
      ref={containerRef}
      className="fixed left-0 z-30"
      style={{ top: isMobile ? '45%' : '40%', y: springY }}
      drag="y"
      dragConstraints={{ top: isMobile ? -200 : -250, bottom: isMobile ? 200 : 250 }}
      dragElastic={0.12}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      data-testid="float-live-room"
    >
      <AnimatePresence>
        {panelOpen && !collapsed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.85, x: -10 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className={`absolute ${isMobile ? 'bottom-0' : 'top-1/2 -translate-y-1/2'} rounded-2xl ${isMobile ? 'p-4' : 'p-5'} overflow-hidden`}
            style={{
              left: `${panelOffset + 8}px`,
              width: isMobile ? 220 : 240,
              ...panelStyle,
            }}
          >
            {panelContent}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        style={{ paddingLeft: collapsed ? 0 : (isMobile ? 8 : 16) }}
        onPointerDown={(e) => {
          const startX = e.clientX;
          const onMove = (ev: PointerEvent) => {
            if (ev.clientX - startX < -30 && !collapsed) {
              setCollapsed(true);
              setPanelOpen(false);
              document.removeEventListener("pointermove", onMove);
              document.removeEventListener("pointerup", onUp);
            }
          };
          const onUp = () => {
            document.removeEventListener("pointermove", onMove);
            document.removeEventListener("pointerup", onUp);
          };
          document.addEventListener("pointermove", onMove);
          document.addEventListener("pointerup", onUp);
        }}
      >
        <AnimatePresence mode="wait">
          {collapsed ? collapsedTab : expandedButton}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
