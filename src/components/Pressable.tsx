import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';
import { spring } from '../lib/motion';

type Props = HTMLMotionProps<'button'> & {
  /** How far the button compresses when pressed. */
  press?: number;
};

/** Every tappable thing in Moments compresses gently and springs back. */
export const Pressable = forwardRef<HTMLButtonElement, Props>(function Pressable(
  { press = 0.96, transition, type = 'button', disabled, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: press }}
      transition={transition ?? spring.press}
      {...rest}
    />
  );
});
