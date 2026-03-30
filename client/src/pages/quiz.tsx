import { useState, useCallback, useRef, useMemo } from "react";
import { questions } from "@/data/questions";
import { dimensionLabels } from "@/data/questions";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import CharacterSVG from "@/components/character/CharacterSVG";
import { usePageView, useTracking } from "@/hooks/use-tracking";

interface QuizPageProps {
  onComplete: (answers: number[]) => void;
}

const ghostTypes = ['ER', 'RS', 'RM', 'ES', 'RE', 'SM', 'SE', 'ME', 'MA', 'EA', 'EM', 'AS', 'RA', 'EAv', 'REv', 'EX'];

export default function QuizPage({ onComplete }: QuizPageProps) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selecting, setSelecting] = useState<number | null>(null);
  const [xpFlash, setXpFlash] = useState<string | null>(null);
  const xpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { trackEvent } = useTracking();
  usePageView("quiz_start");

  // 防止用户意外离开丢失进度
  const answeredCount = answers.length;
  if (typeof window !== 'undefined') {
    window.onbeforeunload = answeredCount > 0 && answeredCount < questions.length ? () => "测评进度将丢失，确定离开吗？" : null;
  }
  const ghostType = useMemo(() => ghostTypes[Math.floor(Math.random() * ghostTypes.length)], []);

  const handleSelect = useCallback((optionIndex: number) => {
    if (selecting !== null) return;
    setSelecting(optionIndex);

    const question = questions[currentQ];
    const mainDim = question.dimension;

    if (xpTimerRef.current) clearTimeout(xpTimerRef.current);
    setXpFlash(`+${dimensionLabels[mainDim]}`);

    xpTimerRef.current = setTimeout(() => {
      setXpFlash(null);
      xpTimerRef.current = null;
    }, 1200);

    setTimeout(() => {
      const newAnswers = [...answers];
      newAnswers[currentQ] = optionIndex;
      setAnswers(newAnswers);
      setSelecting(null);

      if (currentQ < questions.length - 1) {
        setCurrentQ(currentQ + 1);
      } else {
        onComplete(newAnswers);
      }
    }, 600);
  }, [selecting, answers, currentQ, onComplete]);

  const question = questions[currentQ];
  const optionLabels = ['A', 'B', 'C', 'D'];
  const total = questions.length;

  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: 'var(--bg-0)' }}>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div style={{ opacity: 0.06 }}>
          <CharacterSVG type={ghostType} size={350} />
        </div>
      </div>
      <div className="sticky top-0 z-20 px-5 pt-4 pb-3" style={{ background: 'var(--bg-0)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-lg md:max-w-xl mx-auto">
          <div className="flex items-center justify-center gap-1.5 py-1" data-testid="progress-dots">
            {Array.from({ length: total }).map((_, i) => {
              const isAnswered = i < currentQ || (i === currentQ && selecting !== null);
              const isCurrent = i === currentQ && selecting === null;
              return (
                <div
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: isCurrent ? 10 : 6,
                    height: isCurrent ? 10 : 6,
                    background: isAnswered
                      ? 'var(--gold)'
                      : isCurrent
                        ? 'var(--gold)'
                        : 'rgba(255,255,255,0.15)',
                    boxShadow: isCurrent ? '0 0 8px rgba(var(--gold-rgb), 0.6)' : 'none',
                    animation: isCurrent ? 'dot-pulse 1.5s ease-in-out infinite' : 'none',
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-5 py-6 max-w-lg md:max-w-xl mx-auto w-full relative" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="flex-1 flex flex-col gpu-accelerate"
          >
            <div className="mb-2">
              <span className="font-tag text-[11px] tracking-wider" style={{ color: 'var(--gold)', opacity: 0.7 }}>
                SCENARIO {currentQ + 1}/{total}
              </span>
            </div>
            <div className="mb-6">
              <h2 className="text-[17px] font-semibold leading-relaxed" style={{ color: 'var(--text-strong)' }} data-testid="text-question">
                {question.text}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 flex-1 content-start">
              {question.options.map((option, idx) => {
                const isSelected = selecting === idx;
                const isDimmed = selecting !== null && !isSelected;

                return (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{
                      opacity: isDimmed ? 0.35 : 1,
                      y: 0,
                      scale: isDimmed ? 0.97 : 1,
                    }}
                    transition={{ duration: 0.2, ease: "easeOut", delay: idx * 0.05 }}
                    whileHover={selecting === null ? { scale: 1.03, y: -2 } : {}}
                    whileTap={selecting === null ? { scale: 0.97 } : {}}
                    onClick={() => handleSelect(idx)}
                    className="text-left p-3.5 rounded-xl flex flex-col gap-2 gpu-accelerate transition-all duration-300 min-h-[110px]"
                    style={{
                      background: isSelected
                        ? 'var(--gold-soft)'
                        : 'rgba(255,255,255,0.04)',
                      border: isSelected
                        ? '1.5px solid var(--gold)'
                        : '1px solid rgba(255,255,255,0.08)',
                      boxShadow: isSelected
                        ? '0 0 20px rgba(var(--gold-rgb), 0.15), inset 0 -2px 0 var(--gold)'
                        : 'none',
                    }}
                    data-testid={`button-option-${idx}`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold font-tag transition-colors duration-200"
                        style={{
                          background: isSelected ? 'var(--gold)' : 'transparent',
                          color: isSelected ? '#0D0F14' : 'var(--gold)',
                          border: isSelected ? 'none' : '1.5px solid rgba(var(--gold-rgb), 0.4)',
                        }}
                      >
                        {isSelected ? <Check className="w-3 h-3" /> : optionLabels[idx]}
                      </span>
                      <span className="text-[10px] font-tag" style={{ color: 'var(--text-muted)' }}>
                        {option.tag}
                      </span>
                    </div>
                    <span className="text-[13px] leading-snug" style={{ color: 'var(--text-strong)' }}>
                      {option.text}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {xpFlash && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed bottom-8 left-0 right-0 flex justify-center z-30 pointer-events-none"
            >
              <div
                className="px-5 py-2.5 rounded-full text-sm font-semibold"
                style={{
                  background: 'var(--gold-soft)',
                  color: 'var(--gold)',
                  border: '1px solid rgba(var(--gold-rgb), 0.3)',
                  backdropFilter: 'blur(8px)',
                }}
                data-testid="text-xp-flash"
              >
                {xpFlash}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
