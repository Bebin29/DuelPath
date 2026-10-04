'use client';

import { motion } from 'motion/react';
import { EASE } from '@/lib/motion';
import { cn } from '@/lib/utils';

/**
 * Text in der Hand des Rotstifts, der sich von links nach rechts aufschreibt (Motion-Prinzip 2,
 * Szenen „Handtrap“ und „Stresstest“). Längere Notizen brauchen länger, aber höchstens so lange
 * wie ein Strich (DUR.draw), damit niemand auf den Text wartet. Bei reduzierter Bewegung steht er
 * sofort da (MotionProvider).
 */
export function Handschrift({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const length = typeof children === 'string' ? children.length : 40;
  return (
    <motion.p
      initial={{ clipPath: 'inset(-20% 100% -20% 0)' }}
      animate={{ clipPath: 'inset(-20% 0% -20% 0)' }}
      transition={{ duration: Math.min(0.5, 0.2 + length * 0.006), delay, ease: EASE.ink }}
      className={cn('font-hand text-opponent', className)}
    >
      {children}
    </motion.p>
  );
}
