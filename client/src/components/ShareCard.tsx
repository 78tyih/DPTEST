import { useRef, useCallback, useState } from "react";
import type { QuizResult } from "@/utils/calculateResult";
import { dimensionLabels, type Dimension } from "@/data/questions";
import CharacterSVG from "@/components/character/CharacterSVG";
import { Camera, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";
import { useToast } from "@/hooks/use-toast";
import { buildSurveyEntryUrl } from "@/utils/diagnosticLinks";

interface ShareCardProps {
  result: QuizResult;
  tier?: number;
}

const dimLabels = ["认知", "风控", "心理", "适应", "执行", "系统"];
const dimKeys: Dimension[] = ['EDGE', 'RISK', 'MENTAL', 'ADAPT', 'EXEC', 'SYSTEM'];

export default function ShareCard({ result, tier = 0 }: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { traderType, rank } = result;
  const cc = traderType.cardColors;
  const { toast } = useToast();
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const surveyEntryUrl = buildSurveyEntryUrl();

  const handleSave = useCallback(async () => {
    if (!cardRef.current) return;
    setGenerating(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0D0F14",
        scale: 2,
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL("image/png");

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isMobile) {
        setGeneratedImage(dataUrl);
      } else {
        const link = document.createElement("a");
        link.download = `交易员评测-${traderType.name}.png`;
        link.href = dataUrl;
        link.click();
        toast({ title: "图片已下载" });
      }
    } catch (err) {
      console.error("Failed to generate image:", err);
      toast({ title: "生成图片失败，请重试", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }, [result, toast, traderType.name]);

  const dims: Dimension[] = ['RISK', 'MENTAL', 'SYSTEM', 'ADAPT', 'EXEC', 'EDGE'];
  const sorted = [...dims].sort((a, b) => result.normalizedScores[b] - result.normalizedScores[a]);

  return (
    <div>
      <div
        ref={cardRef}
        style={{
          borderRadius: "20px",
          overflow: "hidden",
          background: `linear-gradient(170deg, ${cc.dark} 0%, #0d0f14 40%, ${cc.dark} 100%)`,
          border: `1px solid ${cc.glow}`,
          boxShadow: `0 0 25px ${cc.glow}`,
          padding: "0",
        }}
        data-testid="share-card"
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px 0" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "5px",
            background: `${cc.primary}22`, padding: "3px 10px", borderRadius: "16px",
            border: `1px solid ${cc.primary}44`,
          }}>
            <span style={{ fontSize: "12px" }}>{traderType.element.icon}</span>
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: cc.secondary, letterSpacing: "1px" }}>
              {traderType.element.name.toUpperCase()}
            </span>
          </div>
          <div style={{ fontSize: "14px", color: rank.color }}>
            {rank.icon} {rank.name}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", padding: "0 10px", position: "relative" }}>
          <div style={{
            position: "absolute", width: "120px", height: "120px", borderRadius: "50%", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            background: `radial-gradient(circle, ${cc.primary}33 0%, transparent 70%)`,
          }} />
          <CharacterSVG type={traderType.code} size={180} tier={tier} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 28px" }}>
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, transparent, #C9A456, transparent)" }} />
          <span style={{ color: "#C9A456", fontSize: "10px" }}>✦</span>
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, transparent, #C9A456, transparent)" }} />
        </div>

        <div style={{ textAlign: "center", padding: "10px 16px 0" }}>
          <h3 style={{ fontFamily: "Georgia, 'Noto Serif SC', serif", fontSize: "22px", fontWeight: 900, color: "#E8E6E1", margin: 0, letterSpacing: "4px" }}>
            {traderType.name}
          </h3>
          <p style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: cc.primary, margin: "3px 0 0", letterSpacing: "2px" }}>
            {traderType.subtitle}
          </p>
        </div>

        <div style={{ textAlign: "center", padding: "10px 24px 0" }}>
          <p style={{ fontFamily: "Georgia, 'Noto Serif SC', serif", fontSize: "13px", color: "#C9A456", fontStyle: "italic", margin: 0, lineHeight: 1.7 }}>
            "{traderType.quote}"
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "4px", padding: "12px 0 4px" }}>
          <span style={{ color: rank.color, fontSize: "28px", fontWeight: 700, fontFamily: "'Barlow Condensed', Oswald, monospace" }}>
            {result.avgScore}
          </span>
          <span style={{ color: "#94A3B8", fontSize: "12px" }}>/100</span>
        </div>

        <div style={{ padding: "0 24px 8px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {sorted.map((dim, i) => {
              const filled = Math.round(result.normalizedScores[dim] / 20);
              return (
                <div key={dim} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px" }}>
                  <span style={{ color: "#94A3B8", width: "56px" }}>{dimensionLabels[dim]}</span>
                  <span style={{ color: i === 0 ? cc.primary : '#38BDF8' }}>
                    {'◆'.repeat(Math.min(5, filled))}{'◇'.repeat(Math.max(0, 5 - filled))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ flex: 1 }}>
            <p style={{ color: "#C9A456", fontSize: "12px", margin: 0, fontWeight: 600 }}>
              扫码测测你是哪类交易员
            </p>
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "10px", margin: "4px 0 0" }}>
              Deltapex Trading Group
            </p>
          </div>
          <div style={{ background: "#fff", borderRadius: "6px", padding: "4px", flexShrink: 0 }}>
            <QRCodeCanvas value={surveyEntryUrl} size={56} level="M" bgColor="#ffffff" fgColor="#0D0F14" />
          </div>
        </div>
      </div>

      <motion.button
        onClick={handleSave}
        disabled={generating}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="w-full mt-3 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200"
        style={{
          background: 'transparent',
          border: '1px solid var(--gold)',
          color: 'var(--gold)',
          opacity: generating ? 0.6 : 1,
        }}
        data-testid="button-download-card"
      >
        {generating ? (
          <>
            <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
            生成中...
          </>
        ) : (
          <>
            <Camera className="w-4 h-4" />
            保存到相册
          </>
        )}
      </motion.button>

      <AnimatePresence>
        {generatedImage && (
          <motion.div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ background: 'rgba(0,0,0,0.92)' }}
            onClick={() => setGeneratedImage(null)}
          >
            <motion.button
              onClick={() => setGeneratedImage(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#94A3B8' }}
              whileTap={{ scale: 0.9 }}
              data-testid="button-close-image-modal"
            >
              <X className="w-5 h-5" />
            </motion.button>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex flex-col items-center gap-4 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm font-medium text-center" style={{ color: 'var(--gold)' }}>
                长按图片保存到相册
              </p>
              <img
                src={generatedImage}
                alt="交易员卡片"
                className="w-full rounded-2xl"
                style={{ boxShadow: '0 0 40px rgba(0,0,0,0.5)' }}
                data-testid="img-generated-card"
              />
              <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                长按上方图片 → 保存图片
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
