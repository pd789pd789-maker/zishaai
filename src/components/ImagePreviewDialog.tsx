import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface ImagePreviewDialogProps {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onChangeIndex: (index: number) => void;
  watermark?: boolean;
}

export function ImagePreviewDialog({ images, currentIndex, onClose, onChangeIndex, watermark }: ImagePreviewDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (images.length === 0) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') {
        const prev = currentIndex - 1 < 0 ? images.length - 1 : currentIndex - 1;
        onChangeIndex(prev);
      }
      if (e.key === 'ArrowRight') {
        const next = currentIndex + 1 >= images.length ? 0 : currentIndex + 1;
        onChangeIndex(next);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, images.length, onClose, onChangeIndex]);

  if (images.length === 0 || currentIndex < 0 || currentIndex >= images.length) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
        onClick={onClose}
      >
        <div className="absolute top-6 right-6 flex items-center gap-4 z-50">
          <a
            href={images[currentIndex]}
            download={`zisha_image_${currentIndex}.png`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-mono text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            DOWNLOAD HIGH-RES
          </a>
          <button 
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {images.length > 1 && (
          <div className="absolute top-6 left-6 text-white/50 font-mono text-sm z-50 tracking-widest">
            {currentIndex + 1} / {images.length}
          </div>
        )}

        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { 
                e.stopPropagation(); 
                const prev = currentIndex - 1 < 0 ? images.length - 1 : currentIndex - 1;
                onChangeIndex(prev); 
              }}
              className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/80 rounded-full text-white transition-all z-50 border border-white/10 hover:border-white/30 group"
            >
              <ChevronLeft className="w-8 h-8 group-hover:-translate-x-1 transition-transform" />
            </button>
            <button
              onClick={(e) => { 
                e.stopPropagation(); 
                const next = currentIndex + 1 >= images.length ? 0 : currentIndex + 1;
                onChangeIndex(next); 
              }}
              className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/80 rounded-full text-white transition-all z-50 border border-white/10 hover:border-white/30 group"
            >
              <ChevronRight className="w-8 h-8 group-hover:translate-x-1 transition-transform" />
            </button>
          </>
        )}

        <AnimatePresence mode="wait">
           <div className="relative z-40 max-w-[90vw] max-h-[90vh]">
             <motion.img 
               key={currentIndex}
               initial={{ opacity: 0, scale: 0.98, x: 20 }}
               animate={{ opacity: 1, scale: 1, x: 0 }}
               exit={{ opacity: 0, scale: 0.98, x: -20 }}
               transition={{ duration: 0.2 }}
               src={images[currentIndex]} 
               alt={`Preview ${currentIndex}`} 
               className="max-h-[90vh] object-contain rounded-lg shadow-2xl" 
               onClick={(e) => e.stopPropagation()} 
             />
             {watermark && (
               <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none mix-blend-overlay rotate-[-30deg]">
                 <span className="text-4xl md:text-8xl font-serif font-bold text-white tracking-widest select-none">ZISHA.AI</span>
               </div>
             )}
           </div>
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
