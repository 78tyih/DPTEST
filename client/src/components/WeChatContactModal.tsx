import { useCallback, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Smartphone, ShieldCheck, AlertTriangle, RefreshCw, ArrowRightLeft } from "lucide-react";
import { SiWechat } from "react-icons/si";
import { QRCodeSVG } from "qrcode.react";
import { useIsMobile } from "@/hooks/use-mobile";
import { DEFAULT_WECHAT_CONTACT_URL } from "@shared/wechatContact";

const FALLBACK_URL = DEFAULT_WECHAT_CONTACT_URL;

interface SalesContact {
  name: string;
  url: string;
  verified?: boolean;
}

interface WeChatContactModalProps {
  open: boolean;
  onClose: () => void;
  onBeforeOpen?: () => void;
}

export function useSalesContact() {
  const [contact, setContact] = useState<SalesContact | null>(null);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);

  const fetchContact = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wechat-contact", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setContact(data);
        setLoading(false);
        return data as SalesContact;
      }
    } catch {}
    setLoading(false);
    return null;
  }, []);

  const switchContact = useCallback(async () => {
    setSwitching(true);
    try {
      const res = await fetch("/api/wechat-contact/switch", { method: "POST", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setContact(data);
        setSwitching(false);
        return data as SalesContact;
      }
    } catch {}
    setSwitching(false);
    return null;
  }, []);

  return { contact, loading, switching, fetchContact, switchContact };
}

export function useWeChatContact(onBeforeOpen?: () => void) {
  const isMobile = useIsMobile();
  const { contact, loading, switching, fetchContact, switchContact } = useSalesContact();
  const [checking, setChecking] = useState(false);

  const handleContact = useCallback(async () => {
    onBeforeOpen?.();
    setChecking(true);
    const c = await fetchContact();
    setChecking(false);
    // 企业微信跳转已暂停
    if ((c as any)?.disabled) return false;
    if (isMobile) {
      window.open(c?.url || FALLBACK_URL, "_blank");
      return true;
    }
    return false;
  }, [isMobile, onBeforeOpen, fetchContact]);

  const handleSwitch = useCallback(async () => {
    setChecking(true);
    const c = await switchContact();
    setChecking(false);
    // 企业微信跳转已暂停
    if ((c as any)?.disabled) return false;
    if (isMobile && c) {
      window.open(c.url, "_blank");
      return true;
    }
    return false;
  }, [isMobile, switchContact]);

  return { isMobile, handleContact, handleSwitch, contact, fetchContact, switchContact, checking, loading, switching, WECHAT_CONTACT: contact?.url || FALLBACK_URL };
}

function VerifyingOverlay() {
  const steps = ["正在检测顾问状态", "验证企业微信可用性", "匹配最佳顾问"];
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 800);
    const t2 = setTimeout(() => setStep(2), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: 'rgba(13,15,20,0.92)', backdropFilter: 'blur(8px)' }}
      data-testid="wechat-verifying-overlay"
    >
      <div className="flex flex-col items-center gap-5">
        <div className="relative w-16 h-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full"
            style={{ border: '2px solid rgba(7,193,96,0.15)', borderTopColor: '#07C160' }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" style={{ color: '#07C160' }} />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          {steps.map((s, i) => (
            <motion.div
              key={s}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: i <= step ? 1 : 0.3, x: 0 }}
              transition={{ delay: i * 0.6, duration: 0.3 }}
              className="flex items-center gap-2"
            >
              {i < step ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(7,193,96,0.2)' }}
                >
                  <span style={{ color: '#07C160', fontSize: '10px' }}>&#10003;</span>
                </motion.div>
              ) : i === step ? (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="w-4 h-4 rounded-full"
                  style={{ background: 'rgba(7,193,96,0.3)', border: '1px solid #07C160' }}
                />
              ) : (
                <div className="w-4 h-4 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
              )}
              <span className="text-xs" style={{ color: i <= step ? '#E8E6E1' : 'rgba(255,255,255,0.25)' }}>
                {s}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export { VerifyingOverlay };

export default function WeChatContactModal({ open, onClose }: WeChatContactModalProps) {
  const [contact, setContact] = useState<SalesContact | null>(null);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);

  const [disabled, setDisabled] = useState(false);

  const doFetch = useCallback(() => {
    setLoading(true);
    setContact(null);
    setDisabled(false);
    fetch("/api/wechat-contact", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.disabled) { setDisabled(true); setLoading(false); return; }
        if (data) setContact(data);
        setLoading(false);
      })
      .catch(() => { setLoading(false); });
  }, []);

  const doSwitch = useCallback(() => {
    setSwitching(true);
    fetch("/api/wechat-contact/switch", { method: "POST", credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setContact(data); setSwitching(false); })
      .catch(() => { setSwitching(false); });
  }, []);

  useEffect(() => {
    if (open && !contact) {
      doFetch();
    }
  }, [open]);

  const url = contact?.url || FALLBACK_URL;
  const verified = contact?.verified !== false;

  const handleQRClick = useCallback(() => {
    if (disabled) return;
    window.location.href = url;
  }, [url, disabled]);

  const handleRetry = useCallback(() => {
    doFetch();
  }, [doFetch]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm rounded-2xl p-6 relative"
            style={{ background: '#0F1620', border: '1px solid rgba(255,255,255,0.08)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.06)' }}
              data-testid="button-close-wechat-modal"
            >
              <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </button>

            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(7, 193, 96, 0.12)' }}>
                <SiWechat className="w-6 h-6" style={{ color: '#07C160' }} />
              </div>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-strong)' }}>
                添加专属顾问
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                点击二维码可直接用电脑微信打开
              </p>
              {contact?.name && (
                <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--gold)' }}>
                  您的专属顾问：{contact.name}
                </p>
              )}
            </div>

            {disabled ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <AlertTriangle className="w-10 h-10" style={{ color: '#F59E0B' }} />
                <p className="text-sm font-medium" style={{ color: '#F59E0B' }}>顾问服务暂停中</p>
                <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                  企业微信顾问功能正在维护，请稍后再试
                </p>
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="relative w-12 h-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full"
                    style={{ border: '2px solid rgba(7,193,96,0.15)', borderTopColor: '#07C160' }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" style={{ color: '#07C160' }} />
                  </div>
                </div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>正在验证顾问可用性...</span>
              </div>
            ) : (
              <>
                <div className="flex justify-center mb-2">
                  <motion.button
                    onClick={handleQRClick}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="p-4 rounded-xl cursor-pointer relative group"
                    style={{ background: '#ffffff' }}
                    data-testid="button-qr-click-wechat"
                  >
                    <QRCodeSVG
                      value={url}
                      size={180}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />
                    <div
                      className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
                      style={{ background: 'rgba(7,193,96,0.12)' }}
                    >
                      <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: '#07C160', color: '#fff' }}>
                        点击打开微信
                      </span>
                    </div>
                  </motion.button>
                </div>

                {verified ? (
                  <div className="flex items-center gap-1.5 justify-center mb-3">
                    <ShieldCheck className="w-3 h-3" style={{ color: '#07C160' }} />
                    <span className="text-[10px]" style={{ color: '#07C160' }}>
                      已验证可用
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3" style={{ color: '#F59E0B' }} />
                      <span className="text-[10px]" style={{ color: '#F59E0B' }}>
                        顾问状态未确认，可能无法添加
                      </span>
                    </div>
                    <button
                      onClick={handleRetry}
                      className="flex items-center gap-1 px-3 py-1 rounded-full text-[10px]"
                      style={{ background: 'rgba(7,193,96,0.1)', color: '#07C160', border: '1px solid rgba(7,193,96,0.2)' }}
                      data-testid="button-retry-wechat"
                    >
                      <RefreshCw className="w-3 h-3" />
                      重新检测
                    </button>
                  </div>
                )}

                <p className="text-[10px] text-center mb-3" style={{ color: 'var(--text-muted)' }}>
                  点击二维码可直接用电脑微信打开
                </p>

                <div className="flex items-center gap-1.5 justify-center">
                  <Smartphone className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    无法跳转？请用手机微信扫描上方二维码
                  </span>
                </div>

                <div className="mt-4 pt-3 flex justify-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <button
                    onClick={doSwitch}
                    disabled={switching}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.08)' }}
                    data-testid="button-switch-contact"
                  >
                    <ArrowRightLeft className={`w-3 h-3 ${switching ? 'animate-spin' : ''}`} />
                    {switching ? '正在切换...' : '无法添加？换一个顾问'}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
