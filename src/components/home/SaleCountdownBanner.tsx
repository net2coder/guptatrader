import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Tag, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnnouncementCoupons } from '@/hooks/useCoupons';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateTimeLeft(expiresAt: string): TimeLeft | null {
  const difference = new Date(expiresAt).getTime() - new Date().getTime();
  
  if (difference <= 0) {
    return null;
  }
  
  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-background/20 backdrop-blur-sm rounded-lg px-2.5 py-1.5 min-w-[44px]">
        <span className="text-xl sm:text-2xl font-bold font-mono">
          {value.toString().padStart(2, '0')}
        </span>
      </div>
      <span className="text-[10px] uppercase tracking-wider mt-1 opacity-80">{label}</span>
    </div>
  );
}

export function SaleCountdownBanner() {
  const { data: coupons = [] } = useAnnouncementCoupons();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  
  // Find an active announcement coupon with expiration date
  const activeSale = coupons.find(
    coupon => 
      coupon.is_announcement && 
      coupon.is_active && 
      coupon.expires_at &&
      !dismissed.includes(coupon.id) &&
      new Date(coupon.expires_at) > new Date()
  );
  
  useEffect(() => {
    if (!activeSale?.expires_at) return;
    
    // Initial calculation
    setTimeLeft(calculateTimeLeft(activeSale.expires_at));
    
    // Update every second
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(activeSale.expires_at!);
      setTimeLeft(newTimeLeft);
      
      if (!newTimeLeft) {
        clearInterval(timer);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [activeSale?.expires_at]);
  
  if (!activeSale || !timeLeft) {
    return null;
  }
  
  const discountText = activeSale.discount_type === 'percentage' 
    ? `${activeSale.discount_value}% OFF` 
    : `₹${activeSale.discount_value} OFF`;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-gradient-to-r from-primary via-primary/90 to-primary text-primary-foreground overflow-hidden"
      >
        <div className="container py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Sale Info */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-background/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 sm:hidden" />
                  <span className="font-bold text-sm sm:text-base">{discountText}</span>
                  {activeSale.description && (
                    <span className="hidden lg:inline text-sm opacity-90">— {activeSale.description}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm opacity-90">
                  <span>Use code:</span>
                  <code className="bg-background/20 px-2 py-0.5 rounded font-mono font-bold">
                    {activeSale.code}
                  </code>
                </div>
              </div>
            </div>
            
            {/* Center: Countdown */}
            <div className="hidden md:flex items-center gap-1.5">
              <Clock className="w-4 h-4 mr-2 opacity-80" />
              <TimeBlock value={timeLeft.days} label="Days" />
              <span className="text-xl font-bold opacity-50 -mt-4">:</span>
              <TimeBlock value={timeLeft.hours} label="Hrs" />
              <span className="text-xl font-bold opacity-50 -mt-4">:</span>
              <TimeBlock value={timeLeft.minutes} label="Min" />
              <span className="text-xl font-bold opacity-50 -mt-4">:</span>
              <TimeBlock value={timeLeft.seconds} label="Sec" />
            </div>
            
            {/* Mobile Countdown */}
            <div className="flex md:hidden items-center gap-1 text-xs">
              <Clock className="w-3.5 h-3.5 opacity-80" />
              <span className="font-mono font-bold">
                {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
              </span>
            </div>
            
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-background/20 shrink-0"
              onClick={() => setDismissed(prev => [...prev, activeSale.id])}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
