'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Headphones, X, Mail, MessageCircle } from 'lucide-react';

export default function SupportButton() {
  const [open, setOpen] = useState(false);

  const handleEmail = () => {
    window.open(
      'mailto:airdrophubgroup@gmail.com?subject=Beediyo%20Kall%20—%20Support%20Request&body=Hi%20Beediyo%20Kall%20Support%2C%0A%0AI%20need%20help%20with%3A%0A%0A',
      '_blank'
    );
    setOpen(false);
  };

  return (
    <div className="fixed bottom-20 right-4 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute bottom-14 right-0 w-56 rounded-2xl bg-midnight-800/95 backdrop-blur-xl border border-white/[0.1] shadow-2xl shadow-black/50 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-white font-bold text-xs">Support</p>
              <button onClick={() => setOpen(false)}>
                <X className="w-3.5 h-3.5 text-white/30 hover:text-white/60" />
              </button>
            </div>

            <p className="text-white/35 text-[10px] leading-relaxed">
              Need help? Send us an email and we'll get back to you.
            </p>

            <button
              onClick={handleEmail}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-accent-600/15 border border-accent-500/20 hover:bg-accent-600/25 transition-colors"
            >
              <Mail className="w-4 h-4 text-accent-400" />
              <div className="text-left">
                <p className="text-white text-[11px] font-semibold">Email Us</p>
                <p className="text-white/30 text-[9px]">airdrophubgroup@gmail.com</p>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB button */}
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className="w-11 h-11 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/[0.1] flex items-center justify-center text-white/40 hover:bg-white/[0.1] hover:text-white/60 transition-all shadow-lg shadow-black/20"
      >
        {open ? (
          <X className="w-4.5 h-4.5" />
        ) : (
          <Headphones className="w-4.5 h-4.5" />
        )}
      </motion.button>
    </div>
  );
}
