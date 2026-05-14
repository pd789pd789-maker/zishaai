import React, { useState, useRef, useEffect } from "react";
import { Upload, X, ImageIcon, Download, Maximize, Play, ImagePlus, CheckCircle2, ArrowRight, RefreshCw, FileText } from "lucide-react";
import { cn, playSuccessSound } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAssetStore, useMultiViewStore } from "../lib/store";
import { getCreditCost, generateImageWithPolling } from "../lib/generateUtils";
import { ImagePreviewDialog } from "../components/ImagePreviewDialog";

const ratios = ["1:1", "4:3", "3:4", "16:9", "9:16", "21:9"];
const resolutions = ["1K", "2K", "4K"];

export default function MultiView() {
  const {
    files, setFiles,
    remarks, setRemarks,
    selectedRatio, setSelectedRatio,
    selectedRes, setSelectedRes,
    selectedCount, setSelectedCount,
    workflowState, setWorkflowState,
    baseImage, setBaseImage,
    basePrompt, setBasePrompt,
    isGenerating, setIsGenerating,
    progress, setProgress,
    results, setResults
  } = useMultiViewStore();

  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [previewList, setPreviewList] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number>(-1);

  const openPreview = (images: string[], index: number) => {
    setPreviewList(images);
    setPreviewIndex(index);
  };

  const addAssetGroup = useAssetStore(state => state.addAssetGroup);

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
              if (ctx) ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL("image/jpeg", 0.7));
            };
            img.src = reader.result as string;
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(readers).then(base64Files => {
        setFiles(prev => {
          const combined = [...prev, ...base64Files];
          return combined.slice(0, 9);
        });
        setResults([]); // reset results if new files are added
        setWorkflowState('upload');
      });
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      if (newFiles.length === 0) setWorkflowState('upload');
      return newFiles;
    });
    if (results.length > index) {
      setResults(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleGenerateBase = async () => {
    if (files.length === 0) return;
    setIsGenerating(true);
    setWorkflowState('generating_base');
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      // 1. Generate Base Prompt
      const promptRes = await fetch("/api/multiview-base-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: files,
          remarks
        }),
        signal
      });

      if (!promptRes.ok) {
         const errText = await promptRes.text();
         throw new Error("场景分析失败: " + errText.substring(0, 100));
      }
      
      const promptData = await promptRes.json();
      if (promptData.error) throw new Error(promptData.error);
      
      const basePrompt = promptData.prompt;
      if (!basePrompt) throw new Error("未能生成场景提示词");

      useMultiViewStore.getState().setBasePrompt(basePrompt);

      if (signal.aborted) return;

      // 2. Generate Base Image
      const baseImageUrl = await generateImageWithPolling({
        prompt: basePrompt,
        ratio: selectedRatio,
        resolution: selectedRes,
        image: files[0]
      }, signal);

      if (signal.aborted) return;

      useMultiViewStore.getState().setBaseImage(baseImageUrl);
      useMultiViewStore.getState().setWorkflowState('base_generated');
      playSuccessSound();
      toast.success("主场景生成成功，请在第二步确认张数并生成套图");

    } catch (err: any) {
       if (err.name !== 'AbortError') {
         console.error(err);
         toast.error(err.message || "主场景生成流程发生错误");
         setWorkflowState('upload');
       }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateBatch = async () => {
    const { basePrompt, baseImage } = useMultiViewStore.getState();
    if (!basePrompt || !baseImage || files.length === 0) return;

    setIsGenerating(true);
    setWorkflowState('generating_batch');
    setProgress(0);
    setResults([]);
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      // Step 1: Generate batch prompts using basePrompt
      const promptRes = await fetch("/api/multiview-generate-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          basePrompt,
          count: selectedCount,
          ratio: selectedRatio,
          resolution: selectedRes
        }),
        signal
      });

      if (!promptRes.ok) {
         throw new Error("套图视角计划生成失败");
      }
      
      let batchPrompts: string[] = [];
      const rawResponse = await promptRes.text();
      
      try {
        const blocks = rawResponse.split("}");
        let validJson = "";
        for (const block of blocks) {
          if (block.includes('"prompts"')) {
             validJson = block + "}";
             break;
          }
        }
        if (validJson) {
          const data = JSON.parse(validJson);
          batchPrompts = data.prompts || [];
        } else {
          const data = JSON.parse(rawResponse);
          if (data.error) throw new Error(data.error);
          batchPrompts = data.prompts || [];
        }
      } catch (e) {
        throw new Error("套图解析失败");
      }

      if (!batchPrompts || batchPrompts.length === 0) throw new Error("未能生成具体的场景视角");

      if (signal.aborted) return;

      let generatedBase64List: string[] = [];
      const totalToGenerate = Math.min(batchPrompts.length, selectedCount);
      
      for (let i = 0; i < totalToGenerate; i++) {
        try {
          const promptObj = batchPrompts[i];
          const promptText = typeof promptObj === "string" ? promptObj : JSON.stringify(promptObj);
          
          const resultUrl = await generateImageWithPolling({
            prompt: promptText,
            ratio: selectedRatio,
            resolution: selectedRes,
            image: baseImage // reference base image
          }, signal);
          
          if (signal.aborted) return;

          generatedBase64List.push(resultUrl);
          playSuccessSound();
        } catch (err: any) {
          if (err.name === 'AbortError') return;
          console.error(err);
          toast.error(`第 ${i + 1} 张图片生成失败: ` + err.message);
          generatedBase64List.push(""); 
        }
        setProgress(Math.round(((i + 1) / totalToGenerate) * 100));
        setResults([...generatedBase64List]);
      }

      const successfulImages = generatedBase64List.filter(res => res && res !== "");
      setResults(successfulImages);
      
      if (successfulImages.length > 0) {
        try {
          addAssetGroup({
              id: Date.now().toString(),
              name: "场景套图_" + Date.now().toString().slice(-4),
              createdAt: Date.now(),
              images: successfulImages
          });
          toast.success("场景套图生成完成，已保存到资产库");
        } catch (e: any) {
          console.error("保存资产失败:", e);
          toast.error("保存到资产库失败，本地存储可能已满");
        }
        setWorkflowState('batch_generated');
      } else {
        toast.error("所有图片生成失败，请重试");
        setWorkflowState('base_generated');
      }
    } catch (err: any) {
       if (err.name !== 'AbortError' && err.message !== '已取消') {
         console.error(err);
         toast.error(err.message || "套图生成流程发生错误");
         setWorkflowState('base_generated');
       }
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const handleReset = () => {
    setFiles([]);
    useMultiViewStore.getState().setBasePrompt("");
    useMultiViewStore.getState().setBaseImage(null);
    setResults([]);
    setWorkflowState('upload');
  };

  const handleDownloadAll = () => {
    results.forEach((res, index) => {
      const a = document.createElement("a");
      a.href = res;
      a.download = `zisha_multi_${Date.now()}_${index}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full bg-[#0B0B0B] relative overflow-hidden">
      <div className="w-full lg:w-[480px] overflow-y-auto custom-scrollbar lg:border-r border-[#ffffff10] shrink-0 bg-[#0B0B0B]">
        <div className="p-6 md:p-8 space-y-10 pb-32">
          
          <header className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1A1A1A] border border-white/5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#C8855F] animate-pulse"></span>
              <span className="text-xs tracking-widest text-[#E5E7EB] font-mono">场景套图引擎</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-light tracking-wide serif">
              场景套图<span className="text-[#C8855F]">工作台</span>
            </h1>
            <p className="text-zinc-500 font-light text-sm md:text-base tracking-wide max-w-xl">
              结合 AI 强大的审美与图像分析能力，通过智能提示词管线与参数控制，为您一键生成多角度、同一系列的场景视觉大片。
            </p>
          </header>

          <section className="space-y-6">
            <h2 className="text-xl font-light tracking-wide serif">1. 添加源素材</h2>
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { 
                e.preventDefault(); 
                setIsDragging(false); 
                if (e.dataTransfer.files) {
                  const newFiles = Array.from(e.dataTransfer.files);
                  const readers = newFiles.map((file: any) => {
                    return new Promise<string>((resolve) => {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const img = new Image();
                        img.onload = () => {
                          const canvas = document.createElement("canvas");
                          let width = img.width, height = img.height;
                          const maxDim = 1024;
                          if (width > maxDim || height > maxDim) {
                            if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim; }
                            else { width = Math.round((width * maxDim) / height); height = maxDim; }
                          }
                          canvas.width = width; canvas.height = height;
                          const ctx = canvas.getContext("2d");
                          if (ctx) ctx.drawImage(img, 0, 0, width, height);
                          resolve(canvas.toDataURL("image/jpeg", 0.7));
                        };
                        img.src = reader.result as string;
                      };
                      reader.readAsDataURL(file);
                    });
                  });
                  Promise.all(readers).then(base64Files => {
                    setFiles(prev => {
                      const combined = [...prev, ...base64Files];
                      return combined.slice(0, 9);
                    });
                    setResults([]);
                    setWorkflowState('upload');
                  });
                }
              }}
              className={cn(
                "border border-dashed rounded-xl p-8 transition-all duration-300 relative group overflow-hidden",
                isDragging ? "border-[#C8855F] bg-[#C8855F]/5" : "border-zinc-700 hover:border-[#C8855F] bg-[#080808] hover:bg-[#0F0F0F]"
              )}
            >
              <input id="multi-file-upload" type="file" multiple className="hidden" accept="image/*" onChange={handleUpload} />
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#161616] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ImagePlus className="w-6 h-6 text-zinc-500 group-hover:text-[#C8855F] transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-300">将同一产品的多张视角细节拖拽至此处，或 <button onClick={() => document.getElementById('multi-file-upload')?.click()} className="text-[#C8855F] hover:underline cursor-pointer">点击上传</button></p>
                  <p className="text-xs text-zinc-500 mt-1">上传单张或多张产品图，AI将以此作为主体参考</p>
                </div>
              </div>
            </div>

            {files.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <AnimatePresence>
                  {files.map((f, idx) => (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      key={idx} 
                      className="relative aspect-[4/3] rounded-lg overflow-hidden border border-white/10 group bg-zinc-900 cursor-pointer"
                      onClick={() => openPreview(files, idx)}
                    >
                      <img src={f} alt={`view-${idx}`} className="w-full h-full object-contain bg-zinc-900/50" />
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                        className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-red-500/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>

          <section className="space-y-6">
            <h2 className="text-xl font-light tracking-wide serif">2. 补充内容备注</h2>
            <div className="relative group">
              <div className="absolute top-4 left-4">
                <FileText className="w-5 h-5 text-zinc-500 group-focus-within:text-[#C8855F] transition-colors" />
              </div>
              <textarea 
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="例如：泥料产地是宜兴黄龙山底槽清，文化寓意是知足常乐，表面有全手工肌理，整体风格想要东方禅意..."
                className="w-full h-32 pl-12 pr-4 py-4 bg-[#161616] border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#C8855F] focus:ring-1 focus:ring-[#C8855F] transition-all resize-none custom-scrollbar font-light placeholder:text-zinc-600"
              />
            </div>
            <p className="text-xs text-zinc-500 tracking-wide">
              * 选填。备注信息会被AI纳入特征分析模型中，从而提高审美分析报告的精确度和风格的掌控力。
            </p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xs tracking-widest text-zinc-500 uppercase font-medium">统一画面尺寸 (画幅比例)</h3>
              <div className="flex flex-wrap gap-2">
                {ratios.map(r => (
                  <button 
                    key={r}
                    onClick={() => setSelectedRatio(r)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-mono transition-all border",
                      selectedRatio === r ? "bg-[#161616] text-[#E5E7EB] border-zinc-600 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]" : "bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs tracking-widest text-zinc-500 uppercase font-medium">精细度级 (每张分辨率)</h3>
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

            {(workflowState === 'base_generated' || workflowState === 'generating_batch' || workflowState === 'batch_generated') && (
              <div className="space-y-5 md:col-span-2 pt-4 border-t border-white/5 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs tracking-widest text-zinc-500 uppercase font-medium">生成视效张数</h3>
                  <span className="text-xl font-mono text-[#E5E7EB]">{selectedCount} <span className="text-sm text-zinc-500">张</span></span>
                </div>
                <div className="relative pt-2">
                  <input 
                    type="range" 
                    min="1" 
                    max="12" 
                    step="1"
                    disabled={isGenerating}
                    value={selectedCount}
                    onChange={(e) => setSelectedCount(parseInt(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-[#C8855F] focus:outline-none focus:ring-2 focus:ring-[#C8855F]/50"
                    style={{
                       background: `linear-gradient(to right, #C8855F ${(selectedCount - 1) / 11 * 100}%, #27272a ${(selectedCount - 1) / 11 * 100}%)`
                    }}
                  />
                  <div className="flex justify-between text-[10px] uppercase text-zinc-600 mt-2 font-mono tracking-widest">
                    <span>1 MIN</span>
                    <span>12 MAX</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          <div className="pt-6 border-t border-white/5 pb-20 flex flex-col gap-3">
            {workflowState === 'upload' && (
               <button 
                 onClick={handleGenerateBase}
                 disabled={isGenerating || files.length === 0}
                 className="w-full relative group overflow-hidden rounded-xl bg-[#C8855F] text-black font-bold h-16 flex items-center justify-center shadow-[0_0_40px_rgba(200,133,95,0.15)] disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-[#D59871]"
               >
                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                 <div className="flex flex-col items-center justify-center relative z-10 w-full px-4">
                   <span className="flex items-center gap-2 text-base font-bold">
                     <Play className="w-4 h-4 fill-black shrink-0" />
                     阶段 1：智能分析与主场景构建
                   </span>
                   <span className="text-[12px] font-mono tracking-widest mt-0.5 font-bold">{getCreditCost(selectedRes)} 积分</span>
                 </div>
               </button>
            )}

            {workflowState === 'generating_base' && (
               <div className="w-full h-16 bg-[#161616] text-[#C8855F] border border-[#C8855F]/30 rounded-xl font-bold tracking-wider flex justify-center items-center gap-3">
                 <RefreshCw className="w-5 h-5 animate-spin" />
                 正在分析紫砂细节并生成主场景...
               </div>
            )}

            {workflowState === 'base_generated' && (
               <div className="flex flex-col gap-3">
                 <button 
                   onClick={handleGenerateBatch}
                   disabled={isGenerating}
                   className="w-full relative group overflow-hidden rounded-xl bg-[#C8855F] text-black font-bold h-16 flex items-center justify-center shadow-[0_0_40px_rgba(200,133,95,0.15)] disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-[#D59871]"
                 >
                   <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                   <div className="flex flex-col items-center justify-center relative z-10 w-full px-4">
                     <span className="flex items-center gap-2 text-base font-bold">
                       <Play className="w-4 h-4 fill-black shrink-0" />
                       阶段 2：多视角套图批量渲染
                     </span>
                     <span className="text-[12px] font-mono tracking-widest mt-0.5 font-bold">{selectedCount * getCreditCost(selectedRes)} 积分</span>
                   </div>
                 </button>
                 <button
                   onClick={handleGenerateBase}
                   disabled={isGenerating}
                   className="w-full flex flex-col items-center justify-center h-14 rounded-xl bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 transition-all border border-white/5"
                 >
                   <span className="flex items-center gap-2 font-bold text-sm">
                     <RefreshCw className="w-4 h-4" /> 对主场景不满？重新生成第一张
                   </span>
                   <span className="text-[11px] text-zinc-400 font-mono mt-0.5 font-bold">{getCreditCost(selectedRes)} 积分</span>
                 </button>
               </div>
            )}

            {workflowState === 'generating_batch' && (
               <div className="w-full h-16 bg-[#161616] text-[#C8855F] border border-[#C8855F]/30 rounded-xl font-bold tracking-wider flex justify-center items-center gap-3">
                 <RefreshCw className="w-5 h-5 animate-spin" />
                 {progress > 0 ? `正在批量生成套图中 (${progress}%)` : "规划批处理任务中..."}
               </div>
            )}

            {workflowState === 'batch_generated' && (
               <button 
                 onClick={handleReset}
                 disabled={isGenerating}
                 className="w-full relative group overflow-hidden rounded-xl bg-zinc-800 text-white font-bold h-16 flex items-center justify-center text-lg shadow-xl hover:bg-zinc-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 配置新的一组设计
               </button>
            )}

            {isGenerating && (
              <button
                onClick={() => {
                  if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                  }
                  setIsGenerating(false);
                  setWorkflowState(workflowState === 'generating_base' ? 'upload' : 'base_generated');
                  toast.info("已中止图文管线任务");
                }}
                className="w-full flex items-center justify-center gap-2 h-14 rounded-xl bg-red-500/10 text-red-500 font-bold border border-red-500/20 hover:bg-red-500/20 transition-all font-sans text-sm"
              >
                中止任务
              </button>
            )}
          </div>

        </div>
      </div>

      <div className="flex-1 bg-[#0F0F0F] relative overflow-hidden flex flex-col h-[600px] lg:h-full">
        <div className="h-16 flex items-center justify-between px-6 border-b border-[#ffffff10]">
          <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            主图与套图结果 <span className="text-xs bg-[#C8855F]/20 text-[#C8855F] px-1.5 py-0.5 rounded font-mono">{results.length} / {selectedCount}</span>
          </h3>
          {results.length > 0 && (
            <button onClick={handleDownloadAll} className="text-xs text-[#C8855F] hover:text-white transition-colors flex items-center gap-1">
              <Download className="w-3.5 h-3.5" /> 导出全部
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {(!results || results.length === 0) && !baseImage && !isGenerating ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6 opacity-30">
              <ImageIcon className="w-16 h-16 mb-4" />
              <p className="text-sm font-medium">暂无场景出图</p>
              <p className="text-xs mt-2 font-light">请首先执行确认生成主图</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-12">
              {baseImage && (
                <div 
                  onClick={() => openPreview([baseImage, ...results], 0)}
                  className="relative aspect-square rounded-xl overflow-hidden border-2 border-[#C8855F]/50 group bg-zinc-900 cursor-pointer shadow-[0_0_20px_rgba(200,133,95,0.15)]"
                >
                  <img src={baseImage} alt="base-scene" className="w-full h-full object-contain bg-zinc-900/50" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <a href={baseImage} download={`zisha_base.png`} onClick={(e) => e.stopPropagation()} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-[#C8855F] text-white transition-colors">
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                  <div className="absolute top-2 left-2 bg-[#C8855F] text-black text-[10px] font-bold px-2 py-0.5 rounded">基础主场景</div>
                </div>
              )}
              
              <AnimatePresence>
                {results.map((r, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={i}
                    onClick={() => openPreview([baseImage, ...results], i + 1)}
                    className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group bg-zinc-900 cursor-pointer"
                  >
                    <img src={r} alt={`result-${i}`} className="w-full h-full object-contain bg-zinc-900/50" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <a href={r} download={`zisha_multi_${i}.png`} onClick={(e) => e.stopPropagation()} className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-[#C8855F] text-white transition-colors">
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
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
