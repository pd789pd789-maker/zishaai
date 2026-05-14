import React, { useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { LayoutTemplate, Download, Frame, Image as ImageIcon, CheckCircle2, Upload, Trash2, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import { useLayoutStore, useAssetStore } from "../lib/store";
import { toast } from "sonner";
import Markdown from "react-markdown";
import { generateImageWithPolling, getCreditCost } from "../lib/generateUtils";
import { ImagePreviewDialog } from "../components/ImagePreviewDialog";

export default function LayoutCenter() {
  const [previewState, setPreviewState] = useState<{ open: boolean; images: string[]; initialIndex: number }>({ open: false, images: [], initialIndex: 0 });
  const [selectedRes, setSelectedRes] = useState('2K');
  const resolutions = ['1K', '2K', '4K'];
  const abortControllerRef = useRef<AbortController | null>(null);
  const addAssetGroup = useAssetStore(state => state.addAssetGroup);
  const {
    uploadImages, setUploadImages,
    reportInfo, setReportInfo,
    generatedPrompts, setGeneratedPrompts,
    finalImages, setFinalImages,
    isAnalyzing, setIsAnalyzing,
    isGeneratingImages, setIsGeneratingImages,
    progress, setProgress
  } = useLayoutStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const readers = newFiles.map((file: any) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              let width = img.width;
              let height = img.height;
              const maxDim = 1024;
              if (width > maxDim || height > maxDim) {
                if (width > height) {
                  height = Math.round((height * maxDim) / width);
                  width = maxDim;
                } else {
                  width = Math.round((width * maxDim) / height);
                  height = maxDim;
                }
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d");
              ctx?.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL("image/jpeg", 0.7));
            };
            img.src = reader.result as string;
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(readers).then(base64Files => {
        setUploadImages(prev => {
          const combined = [...prev, ...base64Files];
          return combined.slice(0, 9);
        });
      });
    }
  };

  const removeUploadImage = (index: number) => {
    setUploadImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerateWorkflow = async () => {
    if (uploadImages.length === 0) {
      toast.error("请先上传产品图片");
      return;
    }

    try {
      setIsAnalyzing(true);
      setReportInfo("");
      setGeneratedPrompts([]);
      setFinalImages([]);
      setProgress(0);

      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      toast.info("正在进行艺术品细节与光影美学智能分析...");

      const promptsRes = await fetch('/api/layout-generate-prompts', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ images: uploadImages.slice(0, 3) }),
         signal
      });

      if (!promptsRes.ok) {
         const errData = await promptsRes.json().catch(() => ({}));
         throw new Error(errData.error || "获取生成提示词失败");
      }
      
      const promptsText = await promptsRes.text();
      let promptsData;
      try {
         promptsData = JSON.parse(promptsText);
      } catch (e) {
         console.error("Failed to parse prompt response:", promptsText);
         throw new Error("获取生成提示词失败");
      }

      if (promptsData.error) {
         throw new Error(promptsData.error);
      }

      const prompts = promptsData.prompts as string[];
      
      if (!prompts || prompts.length === 0) {
         throw new Error("模型返回的提示词为空");
      }

      setGeneratedPrompts(prompts);
      toast.success(`成功生成 ${prompts.length} 个分屏镜头，开始批量绘图...`);
      
      setIsAnalyzing(false);
      setIsGeneratingImages(true);
      setProgress(0);

      const totalScreens = Math.min(15, prompts.length);
      let currentImages: string[] = new Array(totalScreens).fill(null);
      setFinalImages(currentImages);
      let completedCount = 0;

      const generatePromises = Array.from({ length: totalScreens }).map(async (_, i) => {
         if (signal.aborted) return;
         const promptText = prompts[i];
         try {
           const resultUrl = await generateImageWithPolling({
             style: promptText,
             ratio: "2:3",
             resolution: selectedRes,
             image: uploadImages[i % uploadImages.length]
           }, signal);

           if (signal.aborted) return;
           
           setFinalImages(prev => {
             const newArr = [...prev];
             newArr[i] = resultUrl;
             return newArr;
           });
           
           completedCount++;
           setProgress(Math.round((completedCount / totalScreens) * 100));
         } catch (err: any) {
           if (err.name === 'AbortError') return;
           console.error("Screen generation error:", err);
           toast.error(`第 ${i+1} 屏生成失败: ${err.message}`);
           
           setFinalImages(prev => {
             const newArr = [...prev];
             newArr[i] = "error";
             return newArr;
           });
           completedCount++;
           setProgress(Math.round((completedCount / totalScreens) * 100));
         }
      });
      
      await Promise.all(generatePromises);
      
      if (signal.aborted) return;

      // Save to AssetGroup
      setFinalImages(prev => {
        const successfulImages = prev.filter(img => img && img !== "error");
        if (successfulImages.length > 0) {
          try {
            addAssetGroup({
              id: Date.now().toString(),
              name: "作品图录_" + Date.now().toString().slice(-4),
              createdAt: Date.now(),
              images: successfulImages as string[]
            });
          } catch (e: any) {
             console.error("保存资产失败:", e);
             toast.error("保存到资产库失败，本地存储可能已满");
          }
        }
        return prev;
      });

      toast.success("排版生成完成，已保存至资产库");
      setIsGeneratingImages(false);

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error(err);
      toast.error(err.message || "生成工作流失败");
      setIsAnalyzing(false);
      setIsGeneratingImages(false);
    }
  };

  const handleDownloadAll = () => {
     // Trigger download of all images
     finalImages.forEach((img, i) => {
       if (img) {
         const a = document.createElement("a");
         a.href = img;
         a.download = `detail-screen-${i + 1}.jpg`;
         a.click();
       }
     });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      className="p-10 h-full flex flex-col overflow-y-auto custom-scrollbar"
    >
      <header className="mb-8 shrink-0">
        <h2 className="text-3xl font-light tracking-wide serif mb-2">智能详情页排版中心</h2>
        <p className="text-zinc-500 text-sm tracking-wide font-light">
          上传产品多角度细节图，自动分析器物美学，生成15屏顶级艺术摄影图录。
        </p>
      </header>

      <div className="flex flex-col xl:flex-row gap-8 min-h-0 pb-10">
        
        <div className="flex flex-col gap-6 xl:w-[400px] shrink-0">
          <section className="bg-[#0F0F0F] rounded-2xl p-6 border border-[#ffffff10]">
             <h3 className="text-sm font-medium text-zinc-300 mb-4 flex items-center justify-between">
               <span>产品原图上传</span>
               <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{uploadImages.length} / 9</span>
             </h3>
             <div className="grid grid-cols-3 gap-2">
                {uploadImages.map((img, i) => (
                  <div 
                    key={i} 
                    className="aspect-square relative rounded-lg border border-[#ffffff10] bg-[#161616] overflow-hidden group cursor-pointer"
                    onClick={() => setPreviewState({ open: true, images: uploadImages, initialIndex: i })}
                  >
                     <img src={img} alt="产品图" className="w-full h-full object-contain bg-zinc-900/50" />
                     <button 
                       onClick={(e) => { e.stopPropagation(); removeUploadImage(i); }}
                       className="absolute top-1 right-1 bg-black/60 p-1.5 rounded-md text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                     >
                       <Trash2 className="w-3.5 h-3.5" />
                     </button>
                  </div>
                ))}
                {uploadImages.length < 9 && (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-lg border border-dashed border-[#ffffff20] bg-transparent hover:bg-[#ffffff05] transition-colors flex flex-col items-center justify-center text-zinc-500 hover:text-zinc-300"
                  >
                    <Upload className="w-5 h-5 mb-1" />
                    <span className="text-[10px]">上传照片</span>
                  </button>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  multiple 
                  accept="image/jpeg,image/png,image/webp" 
                  onChange={handleUpload} 
                />
             </div>
             <p className="text-[10px] text-zinc-500 mt-4 leading-relaxed">
               支持单张或多张产品图，建议包含多个角度与局部特写，以便系统进行全方位材质与工艺分析。
             </p>
          </section>

          <section className="bg-[#0F0F0F] rounded-2xl p-6 border border-[#ffffff10]">
             <h3 className="text-sm font-medium text-zinc-300 mb-4">生成精度</h3>
             <div className="flex flex-col gap-2">
               {resolutions.map(r => (
                 <button 
                   key={r}
                   onClick={() => setSelectedRes(r)}
                   className={cn(
                     "px-4 py-3 rounded-lg text-sm font-mono transition-all border flex items-center justify-between",
                     selectedRes === r ? "bg-[#C8855F]/10 text-[#C8855F] border-[#C8855F]/30" : "bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300"
                   )}
                 >
                   <span>{r}</span><span className="text-sm font-bold text-[#C8855F]">{getCreditCost(r)} 积分</span>
                 </button>
               ))}
             </div>
          </section>

          <section className="flex flex-col gap-3">
             <button 
               onClick={handleGenerateWorkflow} 
               disabled={isAnalyzing || isGeneratingImages || uploadImages.length === 0} 
               className="w-full relative group overflow-hidden bg-[#C8855F] text-black font-bold h-16 rounded-xl flex items-center justify-center hover:bg-[#B5754F] transition-all shadow-lg shadow-[#C8855F]/20 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {!(isAnalyzing || isGeneratingImages || uploadImages.length === 0) && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000 hidden group-hover:block"></div>}
               {isAnalyzing ? (
                 <span className="flex items-center gap-2 relative z-10"><Loader2 className="w-5 h-5 animate-spin" /> 智能分析中...</span>
               ) : isGeneratingImages ? (
                 <span className="flex items-center gap-2 relative z-10"><Loader2 className="w-5 h-5 animate-spin" /> 绘制排版中 ({Math.floor(progress)}%)</span>
               ) : (
                 <div className="flex flex-col items-center justify-center relative z-10 w-full px-4">
                   <span className="flex items-center gap-2 text-base font-bold">
                     <Sparkles className="w-4 h-4 shrink-0 fill-black" />
                     批量生成高端图录
                   </span>
                   <span className="text-[12px] font-mono tracking-widest mt-0.5 font-bold">{15 * getCreditCost(selectedRes)} 积分</span>
                 </div>
               )}
             </button>
             {(isAnalyzing || isGeneratingImages) && (
               <button 
                 onClick={() => {
                   if (abortControllerRef.current) {
                     abortControllerRef.current.abort();
                   }
                   setIsAnalyzing(false);
                   setIsGeneratingImages(false);
                   setFinalImages([]);
                   toast.info("已中止生成任务");
                 }}
                 className="w-full justify-center bg-red-500/10 text-red-500 border border-red-500/20 font-bold px-6 py-3 rounded-xl text-sm hover:bg-red-500/20 transition-all flex items-center gap-2"
               >
                 中止生成任务
               </button>
             )}
          </section>
        </div>

        <div className="flex-1 min-h-[600px] border border-[#ffffff10] bg-[#0A0A0A] rounded-2xl overflow-hidden relative flex flex-col">
          <div className="h-14 shrink-0 border-b border-[#ffffff10] flex items-center justify-between px-6 bg-[#0F0F0F]">
             <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                智能图录预览 <span className="text-xs text-[#C8855F] bg-[#C8855F]/10 px-2 py-0.5 rounded font-mono">{finalImages.filter(i => i).length} / 15</span>
             </h3>
             {finalImages.length > 0 && finalImages.some(i => i) && (
               <button onClick={handleDownloadAll} className="flex items-center gap-1.5 text-xs text-[#C8855F] hover:text-white transition-colors">
                 <Download className="w-3.5 h-3.5" /> 导出全部图录
               </button>
             )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 sm:p-10 custom-scrollbar flex flex-col items-center">
            {finalImages.length === 0 && !isAnalyzing && !isGeneratingImages ? (
              <div className="h-full flex flex-col justify-center items-center text-zinc-500 opacity-60">
                 <LayoutTemplate className="w-16 h-16 mb-4" />
                 <p className="font-light tracking-widest text-sm">暂无排版内容</p>
                 <p className="text-xs mt-2">上传产品图片以开启高端排版工作流</p>
              </div>
            ) : (
              <div className="w-full grid grid-cols-2 md:grid-cols-3 gap-4 pb-12">
                 {isAnalyzing && (
                   <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="col-span-full p-6 border border-[#C8855F]/30 bg-[#C8855F]/5 rounded-xl text-center">
                      <Loader2 className="w-8 h-8 text-[#C8855F] animate-spin mx-auto mb-3" />
                      <p className="text-sm text-[#E5E7EB]">Gemini 3.1 正在进行极深度的博物馆级美学提取...</p>
                      <p className="text-xs text-zinc-500 mt-2">这可能需要约 10-30 秒，请耐心等待。</p>
                   </motion.div>
                 )}

                 {finalImages.map((img, idx) => (
                   <motion.div 
                     key={idx}
                     initial={{ opacity: 0, scale: 0.98 }}
                     animate={{ opacity: 1, scale: 1 }}
                     className="w-full aspect-[2/3] relative rounded-lg shadow-xl bg-[#0F0F0F] border border-[#ffffff10] overflow-hidden group"
                   >
                     {img && img !== "error" ? (
                       <img 
                         src={img} 
                         alt={`Screen ${idx + 1}`} 
                         className="w-full h-full object-contain cursor-pointer transition-transform group-hover:scale-[1.02] duration-500" 
                         referrerPolicy="no-referrer" 
                         onClick={() => setPreviewState({ open: true, images: finalImages.filter(i => i && i !== "error") as string[], initialIndex: finalImages.filter(i => i && i !== "error").indexOf(img) })}
                       />
                     ) : (
                       <div className="w-full aspect-[2/3] flex flex-col items-center justify-center text-zinc-500 relative">
                         {isGeneratingImages && img !== "error" ? (
                           <>
                             <Loader2 className="w-8 h-8 animate-spin mb-3 text-[#C8855F]" />
                             <p className="text-sm">正在渲染第 {idx + 1} 屏...</p>
                           </>
                         ) : (
                           <>
                             <AlertCircle className="w-8 h-8 mb-3 text-red-500/50" />
                             <p className="text-sm">生成失败</p>
                           </>
                         )}
                         <div className="absolute top-4 left-4 text-xs font-mono bg-black/50 px-2 py-1 rounded text-white/50">
                           第 {String(idx + 1).padStart(2, '0')} 屏
                         </div>
                       </div>
                     )}
                   </motion.div>
                 ))}

                 {isGeneratingImages && finalImages.length < 15 && (
                   <div className="w-full aspect-[2/3] border border-dashed border-[#ffffff10] rounded-none flex items-center justify-center flex-col animate-pulse">
                      <LayoutTemplate className="w-8 h-8 text-zinc-600 mb-3" />
                      <p className="text-sm text-zinc-500 tracking-wide">排队生成中 ({finalImages.length + 1}/15)</p>
                   </div>
                 )}
              </div>
            )}
          </div>
        </div>
      </div>
      {previewState.open && (
        <ImagePreviewDialog
          images={previewState.images}
          currentIndex={previewState.initialIndex}
          onClose={() => setPreviewState(prev => ({ ...prev, open: false }))}
          onChangeIndex={(i) => setPreviewState(prev => ({ ...prev, initialIndex: i }))}
        />
      )}
    </motion.div>
  );
}
