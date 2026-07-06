import { motion } from "framer-motion";
import type { ReactNode } from "react";

type AnimateSectionProps = {
  children: ReactNode;
};

function AnimateSection({ children }: AnimateSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 70 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.7,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.div>
  );
}

export default AnimateSection;