import React, { useState, useRef, useEffect } from "react";
import { Upload, ImageIcon, Maximize, Settings2, Sparkles, RefreshCw, Download, ArrowRight, X } from "lucide-react";
import { cn, playSuccessSound } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAssetStore, useGenerateStore } from "../lib/store";
import { getCreditCost, generateImageWithPolling } from "../lib/generateUtils";
import { ImagePreviewDialog } from "../components/ImagePreviewDialog";
import { useNavigate } from "react-router-dom";
import { ZISHA_STYLES, Category, Style } from "../lib/stylesData";

const ratios = ["1:1", "4:3", "3:4", "2:3", "3:2", "16:9", "9:16", "21:9"];
const resolutions = ["1K", "2K", "4K"];

const steps = [
  "分析源图泥门颗粒特征...",
  "匹配三维几何光影基准...",
  "锁定出水孔及肌理权重...",
  "渲染院线级高光材质..."
];

export default function Generate() {
  const {
    file, setFile,
    selectedStyle, setSelectedStyle,
    selectedRatio, setSelectedRatio,
    selectedRes, setSelectedRes,
    isGenerating, setIsGenerating,
    stepIndex, setStepIndex,
    result, setResult
  } = useGenerateStore();
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [previewList, setPreviewList] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number>(-1);

  const openPreview = (images: string[], index: number) => {
    setPreviewList(images);
    setPreviewIndex(index);
  };

  const addAssetGroup = useAssetStore(state => state.addAssetGroup);
  const navigate = useNavigate();

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = `zisha_generated_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExpand = () => {
    if (!result) return;
    openPreview([result], 0);
  };

  const handlePushToLayout = () => {
    // Navigate to LayoutCenter. Assuming it's at /app/layout
    navigate("/app/layout", { state: { pushedImage: result } });
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFile(reader.result as string);
        setResult(null);
      };
      reader.readAsDataURL(f);
    }
  };

  const triggerUpload = () => {
    document.getElementById('file-upload')?.click();
  };

  const handleGenerate = async () => {
    if (!file) return;
    if (file.startsWith('blob:')) {
      toast.error('The file format is outdated. Please re-upload your image.');
      setFile(null);
      return;
    }
    setIsGenerating(true);
    setStepIndex(0);
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setStepIndex(currentStep);
      }
    }, 2000); // Slower interval for real API request

    try {
      const activeStyle = ZISHA_STYLES.find(s => s.id === selectedStyle);

      const resultUrl = await generateImageWithPolling({
        style: activeStyle ? activeStyle.prompt : undefined,
        ratio: selectedRatio,
        resolution: selectedRes,
        image: file
      }, signal);

      if (signal.aborted) return;

      clearInterval(interval);
      setResult(resultUrl);
      playSuccessSound();
      addAssetGroup({
        id: Date.now().toString(),
        name: "场景构建_" + Date.now().toString().slice(-4),
        createdAt: Date.now(),
        images: [resultUrl]
      });
      toast.success("生成成功，已自动保存至数字资产库");
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error(err);
      clearInterval(interval);
      toast.error(err.message || "抱歉，生成图片失败");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0B0B0B]">
      <header className="px-10 py-8 border-b border-[#ffffff10] shrink-0">
        <h2 className="text-3xl font-light tracking-wide serif">AI 极简出片引擎</h2>
        <p className="text-zinc-500 mt-2 text-sm tracking-wide font-light">手机废片进，商业大片出。严格锁定壶型与泥门肌理。</p>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Column: Settings & Upload */}
        <div className="w-full lg:w-[480px] border-b lg:border-b-0 lg:border-r border-[#ffffff10] flex flex-col overflow-y-auto custom-scrollbar shrink-0 z-10 bg-[#0B0B0B]">
          <div className="p-8 pb-32 flex flex-col gap-8">
            
            {/* Upload Zone */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm uppercase tracking-widest text-[#E5E7EB] font-medium">1. 导入源图</h3>
                <span className="text-[10px] text-[#C8855F] tracking-wider bg-[#C8855F]/10 px-2 py-0.5 rounded-full">建议使用自然光</span>
              </div>
              <div 
                onClick={triggerUpload}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { 
                  e.preventDefault(); 
                  setIsDragging(false); 
                  const f = e.dataTransfer.files?.[0];
                  if (f) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setFile(reader.result as string);
                      setResult(null);
                    };
                    reader.readAsDataURL(f);
                  }
                }}
                className={cn(
                  "border border-dashed rounded-xl flex items-center justify-center p-6 cursor-pointer transition-all duration-500 ease-out w-full aspect-[4/3] group overflow-hidden relative",
                  file 
                    ? "border-zinc-700 bg-[#0F0F0F]" 
                    : isDragging 
                      ? "border-[#C8855F] bg-[#C8855F]/5 scale-[0.98]" 
                      : "border-zinc-700 hover:border-[#C8855F] bg-[#080808] hover:bg-[#0F0F0F]"
                )}
              >
                <input id="file-upload" type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                {file ? (
                  <>
                    <img src={file} alt="Source" className="w-full h-full object-contain opacity-80" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                      <button onClick={(e) => { e.stopPropagation(); openPreview([file], 0); }} className="text-white text-xs uppercase tracking-widest flex items-center gap-2 bg-black/60 px-4 py-2 rounded-lg backdrop-blur-md">
                        <ImageIcon className="w-3 h-3" /> 预览大图
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); document.getElementById('file-upload')?.click(); }} className="text-white text-xs uppercase tracking-widest flex items-center gap-2 bg-black/60 px-4 py-2 rounded-lg backdrop-blur-md">
                        <RefreshCw className="w-3 h-3" /> 更换图片
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-zinc-500 group-hover:text-zinc-300 transition-colors">
                    <Upload className="w-6 h-6 mb-3 stroke-[1.5]" />
                    <p className="text-sm font-light">点击上传手机实拍图</p>
                    <p className="text-xs opacity-50 mt-1 font-mono">JPG, PNG 最大 10MB</p>
                  </div>
                )}
              </div>
            </section>

            {/* Style Selection */}
            <section>
              <h3 className="text-sm uppercase tracking-widest text-[#E5E7EB] font-medium mb-4 flex justify-between items-center">
                2. 高定视觉风格
                <span className="text-[10px] text-zinc-500 tracking-wider">专属视觉引擎</span>
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {ZISHA_STYLES.map((s) => (
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    key={s.id}
                    onClick={() => setSelectedStyle(s.id)}
                    className={cn(
                      "group text-left rounded-lg border overflow-hidden relative transition-colors duration-300 aspect-[4/3]",
                      selectedStyle === s.id 
                        ? "border-[#C8855F] ring-1 ring-[#C8855F]/50" 
                        : "border-[#ffffff10] hover:border-zinc-500 opacity-70 hover:opacity-100"
                    )}
                  >
                    <img src={s.img} alt={s.name} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity grayscale-[30%] group-hover:grayscale-0" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0B] via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 p-3 w-full z-10">
                      <p className="text-[13px] text-white font-medium mb-0.5">{s.name}</p>
                      <p className="text-[10px] text-zinc-400 font-light truncate">{s.desc}</p>
                    </div>
                    {selectedStyle === s.id && (
                      <motion.div layoutId="styleIndicator" className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#C8855F] shadow-[0_0_8px_rgba(200,133,95,0.8)] z-10" />
                    )}
                  </motion.button>
                ))}
              </div>
            </section>

            {/* Parameters */}
            <section>
              <h3 className="text-sm uppercase tracking-widest text-[#E5E7EB] font-medium mb-4">3. 输出参数</h3>
              
              <div className="space-y-4">
                <div className="flex bg-[#0F0F0F] rounded-lg p-1 border border-[#ffffff0a] relative">
                  {ratios.map(r => {
                    const isActive = selectedRatio === r;
                    return (
                      <button 
                        key={r}
                        onClick={() => setSelectedRatio(r)}
                        className={cn(
                          "flex-1 py-1.5 text-xs rounded-md transition-colors relative z-10",
                          isActive ? "text-white font-medium shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        {isActive && (
                          <motion.div layoutId="ratioActive" className="absolute inset-0 bg-[#C8855F] rounded-md -z-10" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                        )}
                        <span>{r}</span>
                      </button>
                    )
                  })}
                </div>

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
              </div>
            </section>

          </div>
          
          <div className="mt-auto p-8 pt-4 sticky bottom-0 bg-gradient-to-t from-[#0B0B0B] via-[#0B0B0B] to-transparent z-20 pointer-events-none">
            <div className="pointer-events-auto flex flex-col gap-3">
              <motion.button 
                whileHover={(!file || isGenerating) ? {} : { scale: 1.01 }}
                whileTap={(!file || isGenerating) ? {} : { scale: 0.98 }}
                onClick={handleGenerate}
                disabled={!file || isGenerating}
                className={cn(
                  "w-full h-16 rounded-xl relative overflow-hidden group flex items-center justify-center transition-all duration-300",
                  (!file || isGenerating) 
                    ? "bg-[#0F0F0F] text-zinc-600 border border-[#ffffff0a] cursor-not-allowed" 
                    : "bg-[#C8855F] text-black hover:bg-[#B5754F] shadow-lg shadow-[#C8855F]/20"
                )}
              >
                {!(!file || isGenerating) && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000 hidden group-hover:block"></div>}
                
                {isGenerating ? (
                  <span className="flex items-center gap-2 relative z-10"><RefreshCw className="w-4 h-4 animate-spin" />正在生成...</span>
                ) : (
                  <div className="flex flex-col items-center justify-center relative z-10 w-full px-4">
                    <span className="flex items-center gap-2 text-base font-bold">
                      <Sparkles className="w-4 h-4 fill-black shrink-0" />
                      生成商业大片
                    </span>
                    <span className="text-[12px] font-mono tracking-widest mt-0.5 font-bold">{getCreditCost(selectedRes)} 积分</span>
                  </div>
                )}
              </motion.button>
              {isGenerating && (
                <button
                  onClick={() => {
                    if (abortControllerRef.current) {
                      abortControllerRef.current.abort();
                    }
                    setIsGenerating(false);
                    toast.info("已中止生成任务");
                  }}
                  className="w-full justify-center bg-red-500/10 text-red-500 border border-red-500/20 font-bold px-6 py-3 rounded-xl text-sm hover:bg-red-500/20 transition-all flex items-center gap-2"
                >
                  中止生成任务
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Preview/Results */}
        <div className="flex-1 bg-[#080808] relative flex items-center justify-center px-4 lg:px-12 py-12 lg:py-12 overflow-hidden min-h-[300px] lg:min-h-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(200,133,95,0.08),transparent_70%)] pointer-events-none"></div>
          
          {!result && !isGenerating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20 pointer-events-none">
              <ImageIcon className="w-24 h-24 mb-6 stroke-[1]" />
              <p className="text-xl serif tracking-widest uppercase">预览工作区</p>
            </div>
          )}

          {isGenerating && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="flex flex-col items-center z-10 w-full max-w-lg"
            >
               <div className="w-full h-1 bg-[#0F0F0F] rounded-full overflow-hidden mb-8 border border-white/5 relative">
                 <motion.div 
                   className="h-full bg-gradient-to-r from-transparent via-[#C8855F] to-[#C8855F]"
                   initial={{ width: "0%" }}
                   animate={{ width: "100%" }}
                   transition={{ duration: 3.2, ease: "easeOut" }}
                 />
                 {/* Shimmer sweep */}
                 <motion.div 
                   className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg]"
                   initial={{ left: "-100%" }}
                   animate={{ left: "200%" }}
                   transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                 />
               </div>
               <div className="h-6 overflow-hidden relative w-full text-center">
                 <AnimatePresence mode="popLayout">
                   <motion.div
                     key={stepIndex}
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -10 }}
                     transition={{ duration: 0.3 }}
                     className="text-zinc-300 text-sm font-mono tracking-widest uppercase absolute w-full"
                   >
                     {steps[stepIndex]}
                   </motion.div>
                 </AnimatePresence>
               </div>
               <p className="text-[10px] text-zinc-600 mt-4 tracking-wider uppercase font-sans">极简出片 2.0 高保真渲染引擎</p>
            </motion.div>
          )}

          <AnimatePresence>
            {result && !isGenerating && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.96, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-4xl max-h-full flex items-center justify-center p-8"
              >
                <div className="relative group w-full h-full flex items-center justify-center">
                  <img 
                    src={result} 
                    onDoubleClick={() => openPreview([result], 0)}
                    className="max-w-full max-h-[80vh] object-contain shadow-2xl shadow-black/80 ring-1 ring-[#ffffff10] cursor-pointer" 
                    alt="Generated Result" 
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Floating Action Bar on hover */}
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0 flex gap-2">
                    <button onClick={handleDownload} className="bg-[#0F0F0F]/80 backdrop-blur-md border border-[#ffffff10] text-[#E5E7EB] px-4 py-2 rounded-full font-mono text-xs hover:bg-[#C8855F] hover:border-[#C8855F] transition-colors flex items-center gap-2">
                      <Download className="w-3.5 h-3.5" />
                      下载{selectedRes}原图
                    </button>
                    <button onClick={handleExpand} className="bg-[#0F0F0F]/80 backdrop-blur-md border border-[#ffffff10] text-[#E5E7EB] px-4 py-2 rounded-full font-mono text-xs hover:bg-[#C8855F] hover:border-[#C8855F] transition-colors flex items-center gap-2">
                      <Maximize className="w-3.5 h-3.5" />
                      全屏预览
                    </button>
                    <button onClick={handlePushToLayout} className="bg-[#0F0F0F]/80 backdrop-blur-md border border-[#ffffff10] text-[#E5E7EB] px-4 py-2 rounded-full font-mono text-xs hover:bg-white hover:text-black hover:border-white transition-colors flex items-center gap-2">
                      <ArrowRight className="w-3.5 h-3.5" />
                      推送到详情页
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ImagePreviewDialog
        images={previewList}
        currentIndex={previewIndex}
        onClose={() => setPreviewIndex(-1)}
        onChangeIndex={setPreviewIndex}
      />
    </div>
  );
}
