import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import { PULSE } from "./pulseTheme";

interface Props {
  brandColor: string;
  eventName: string;
  onRegisterClick: () => void;
  registerLabel?: string;
  registerDisabled?: boolean;
}

export function StickyRegisterBar({
  eventName,
  onRegisterClick,
  registerLabel = "Register",
  registerDisabled = false,
}: Props) {
  const [show, setShow] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (v) => {
    setShow(v > 480);
  });

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="sticky-register"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 260 }}
          className="fixed bottom-4 left-0 right-0 z-40 flex justify-center px-4"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex w-full max-w-lg items-center gap-3 rounded-full bg-white p-1.5 shadow-[0_16px_50px_-20px_rgba(15,23,42,0.45)] sm:px-2 sm:py-1.5">
            <span className="hidden min-w-0 flex-1 truncate pl-3 text-sm font-medium text-slate-700 sm:block">
              {eventName}
            </span>
            <button
              type="button"
              className="w-full rounded-full px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 sm:ml-auto sm:w-auto sm:py-2"
              style={{ background: PULSE.teal }}
              onClick={onRegisterClick}
              disabled={registerDisabled}
            >
              {registerLabel}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
