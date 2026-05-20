import { motion } from "framer-motion";
import { EMOTIONS, type EmotionType } from "@/utils/constants";
import { AlertTriangle, Frown, Angry, HelpCircle, Smile, Meh } from "lucide-react";

const emotionIcons: Record<EmotionType, React.ElementType> = {
  PANIC: AlertTriangle,
  FEAR: Frown,
  ANGER: Angry,
  CONFUSED: HelpCircle,
  NEUTRAL: Smile,
  SAD: Meh,
};

interface EmotionIndicatorProps {
  emotion: string | EmotionType;
  size?: "sm" | "md" | "lg";
}

export default function EmotionIndicator({ emotion, size = "md" }: EmotionIndicatorProps) {
  // Normalize the input emotion (handle undefined, null, lowercase, etc.)
  const normalizedEmotion = (typeof emotion === "string" ? emotion.toUpperCase() : "NEUTRAL") as EmotionType;
  
  // Safe lookup with fallbacks
  const config = EMOTIONS[normalizedEmotion] || EMOTIONS.NEUTRAL;
  const Icon = emotionIcons[normalizedEmotion] || emotionIcons.NEUTRAL;

  const sizeClasses = {
    sm: "w-7 h-7 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-base",
  };
  const iconSize = { sm: 13, md: 18, lg: 24 };

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`${sizeClasses[size]} rounded-xl flex items-center justify-center ${
        config.pulse ? "animate-pulse" : ""
      }`}
      style={{ backgroundColor: config.color + "15", color: config.color }}
      title={config.label}
    >
      <Icon size={iconSize[size]} />
    </motion.div>
  );
}
