import React, { useState, useRef, useEffect } from "react";
import { Upload, X, ImageIcon, Download, Play, ImagePlus, RefreshCw, Image as ImageIconLucide } from "lucide-react";
import { cn, playSuccessSound } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAssetStore, useStyleTransferStore } from "../lib/store";
import { getCreditCost, generateImageWithPolling } from "../lib/generateUtils";
import { ImagePreviewDialog } from "../components/ImagePreviewDialog";

const ratios = ["1:1", "4:3", "3:4", "16:9", "9:16", "21:9"];
const resolutions = ["1K", "2K", "4K"];

export default function StyleTransfer() {
  const {
    productFiles, setProductFiles,
    styleFile, setStyleFile,
    selectedRatio, setSelectedRatio,
    selectedRes, setSelectedRes,
    selectedCount, setSelectedCount,
    workflowState, setWorkflowState,
    baseImage, setBaseImage,
    basePrompt, setBasePrompt,
    isGenerating, setIsGenerating,
    progress, setProgress,
    results, setResults
  } = useStyleTransferStore();

  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [isProductDragging, setIsProductDragging] = useState(false);
  const [isStyleDragging, setIsStyleDragging] = useState(false);
  const [previewList, setPreviewList] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number>(-1);

  const openPreview = (images: string[], index: number) => {
    setPreviewList(images);
    setPreviewIndex(index);
  };

  const addAssetGroup = useAssetStore(state => state.addAssetGroup);

  const handleProductUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const readers = newFiles.map((file: any) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(readers).then(base64Files => {
        setProductFiles(prev => {
          const combined = [...prev, ...base64Files];
          return combined.slice(0, 9);
        });
      });
    }
  };

  const handleStyleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setStyleFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeProductFile = (index: number) => {
    setProductFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerateBase = async () => {
    if (productFiles.length === 0 || !styleFile) return;
    setIsGenerating(true);
    setWorkflowState('generating_base');
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      const fileContent = productFiles[0];
      
      const stylePrompt = `# 核心任务与角色
你是一位拥有20年經驗的顶级商业静物摄影师兼数字图像合成大师。请严格依据我上传的两张参考图，生成一张殿堂级的紫砂壶商业广告大片。

# 图像权重分配（最高优先级指令）
【参考图A：主体源文件】（用户上传的手机实拍图）：
绝对锁定100%的物理特征。严格复制该紫砂壶的器型比例、流（壶嘴）把（壶把）曲率、盖口严密性、明暗接工艺细节，以及任何落款或铭文。只参考产品，不保留场景背景。精准还原泥料的真实色彩与材质（如：紫泥的温润紫褐、朱泥的细腻红亮、段泥的砂质颗粒感），绝不允许改变主体壶的任何外貌结构与颜色。

【参考图B：美学与光影源文件】（用户上传的网络大片）：
提取90%的环境与摄影美学。精确复刻此图的整体构图比例、拍摄视角（如：平视微俯15度 / 45度俯拍）。完美复刻其光影结构（主光源方向、辅光补暗部、轮廓光勾勒边缘）、光线质感（柔光箱漫反射或硬光直射产生的阴影边缘）。复刻背景色调、空间纵深感以及画面中出现的配套禅意道具（如：茶杯、枯枝、茶席肌理），并将其自然重组于主体紫砂壶周围。

# 融合与摄影参数要求

光影互动与材质表现： 让【图B】的高级光影完美投射在【图A】的紫砂壶上。确保高光区域能体现紫砂壶水色与包浆，暗部保留丰富的泥料颗粒质感细节（Rich Granular Texture），明暗交界线过渡自然，绝不能有塑料感或悬浮感。壶身需对环境光产生正确的漫反射。

相机与镜头语言： 模拟哈苏中画幅相机 H6D-100c，搭配 120mm Macro 微距镜头。光圈设定 f/8 以确保紫砂壶主体从壶嘴到壶把边缘绝对锐利清晰，背景道具呈现柔美的高级焦外虚化（Bokeh）。

色彩与氛围： 保持顶级商业广告的色彩科学，画面色彩深度达 16-bit，无任何色彩断层。整体调性呈现东方高级感与极致的静谧氛围。

# 负面提示词（Negative Prompt）
改变壶型，泥料偏色，变形的壶嘴/壶把，错误的透视关系，悬浮感，光影冲突，多个光源影子，塑料质感，过度曝光，画面杂乱，模糊不清，水印，文字，排版。`;

      const resultUrl = await generateImageWithPolling({
        prompt: stylePrompt,
        ratio: selectedRatio,
        resolution: selectedRes,
        images: [fileContent, styleFile]
      }, signal);
      
      if (signal.aborted) return;
      useStyleTransferStore.getState().setBaseImage(resultUrl);

      // Now extract basePrompt from the generated image for potential batch processing
      const promptRes = await fetch("/api/multiview-base-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: [resultUrl],
          remarks: "参考由风格迁移生成的新紫砂大片"
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

      useStyleTransferStore.getState().setBasePrompt(basePrompt);
      useStyleTransferStore.getState().setWorkflowState('base_generated');
      playSuccessSound();
      toast.success("基础风格参考图生成成功，您可以继续生成套图或重新生成");

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(err);
        toast.error(err.message || "基础生成发生错误");
        setWorkflowState('upload');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateBatch = async () => {
    const { basePrompt, baseImage } = useStyleTransferStore.getState();
    if (!basePrompt || !baseImage || productFiles.length === 0) return;

    setIsGenerating(true);
    setWorkflowState('generating_batch');
    setProgress(0);
    setResults([]);
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      // Generate batch prompts using basePrompt
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
              name: "风格套图_" + Date.now().toString().slice(-4),
              createdAt: Date.now(),
              images: successfulImages
          });
          toast.success("风格套图生成完成，已保存到资产库");
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
    setProductFiles([]);
    setStyleFile(null);
    useStyleTransferStore.getState().setBasePrompt("");
    useStyleTransferStore.getState().setBaseImage(null);
    setResults([]);
    setWorkflowState('upload');
  };

  const handleDownloadAll = () => {
    results.forEach((res, index) => {
      const a = document.createElement("a");
      a.href = res;
      a.download = `zisha_transfer_${Date.now()}_${index}.png`;
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
              <span className="text-xs tracking-widest text-[#E5E7EB] font-mono">参考图风格迁移</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-light tracking-wide serif">
              参考图<span className="text-[#C8855F]">风格迁移</span>
            </h1>
            <p className="text-zinc-500 font-light text-sm md:text-base tracking-wide max-w-xl">
              上传产品图与目标风格参考图，AI将精确提取参考图的光影氛围、场景布置与色彩调性，一键迁移至您的紫砂壶产品上。
            </p>
          </header>

          <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h2 className="text-xl font-light tracking-wide serif text-white">1. 添加多张产品原图</h2>
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsProductDragging(true); }}
                onDragLeave={() => setIsProductDragging(false)}
                onDrop={(e) => { 
                  e.preventDefault(); 
                  setIsProductDragging(false); 
                  if (e.dataTransfer.files) {
                    const newFiles = Array.from(e.dataTransfer.files);
                    const readers = newFiles.map((file: any) => {
                      return new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(file);
                      });
                    });
                    Promise.all(readers).then(base64Files => {
                      setProductFiles(prev => {
                        const combined = [...prev, ...base64Files];
                        return combined.slice(0, 9);
                      });
                    });
                  }
                }}
                className={cn(
                  "border border-dashed rounded-xl p-8 min-h-[200px] transition-all duration-300 relative group overflow-hidden flex flex-col items-center justify-center text-center",
                  isProductDragging ? "border-[#C8855F] bg-[#C8855F]/5" : "border-zinc-700 hover:border-[#C8855F] bg-[#080808] hover:bg-[#0F0F0F]"
                )}
              >
                <input id="product-file-upload" type="file" multiple className="hidden" accept="image/*" onChange={handleProductUpload} />
                <div className="w-14 h-14 rounded-full bg-[#161616] flex items-center justify-center group-hover:scale-110 transition-transform mb-4">
                  <ImagePlus className="w-5 h-5 text-zinc-500 group-hover:text-[#C8855F] transition-colors" />
                </div>
                <p className="text-sm font-medium text-zinc-300">上传紫砂壶产品原图</p>
                <p className="text-xs text-zinc-500 mt-1">支持多角度批量上传</p>
                <button onClick={() => document.getElementById('product-file-upload')?.click()} className="mt-4 text-xs bg-[#161616] border border-white/10 px-4 py-2 rounded-lg hover:bg-white/5 transition-colors">选择图片</button>
              </div>

              {productFiles.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  <AnimatePresence>
                    {productFiles.map((f, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        key={idx} 
                        className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group cursor-pointer"
                        onClick={() => openPreview(productFiles, idx)}
                      >
                        <img src={f} alt={`product-${idx}`} className="w-full h-full object-contain bg-zinc-900/50" />
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeProductFile(idx); }}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/50 hover:bg-red-500/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-light tracking-wide serif text-white">2. 上传风格参考图</h2>
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsStyleDragging(true); }}
                onDragLeave={() => setIsStyleDragging(false)}
                onDrop={(e) => { 
                  e.preventDefault(); 
                  setIsStyleDragging(false); 
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setStyleFile(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
                className={cn(
                  "border border-dashed rounded-xl p-6 min-h-[200px] transition-all duration-300 relative group overflow-hidden flex flex-col items-center justify-center text-center",
                  isStyleDragging ? "border-[#C8855F] bg-[#C8855F]/5" : "border-zinc-700 hover:border-[#C8855F] bg-[#080808] hover:bg-[#0F0F0F]"
                )}
              >
                <input id="style-file-upload" type="file" className="hidden" accept="image/*" onChange={handleStyleUpload} />
                
                {styleFile ? (
                  <>
                    <img src={styleFile} alt="Style" className="absolute inset-0 w-full h-full object-contain opacity-60" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                      <button onClick={(e) => { e.stopPropagation(); openPreview([styleFile], 0); }} className="text-white text-xs uppercase tracking-widest flex items-center gap-2 bg-black/60 px-4 py-2 rounded-lg backdrop-blur-md hover:bg-[#C8855F] transition-colors">
                        <ImageIcon className="w-3 h-3" /> 预览大图
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); document.getElementById('style-file-upload')?.click(); }} className="text-white text-xs uppercase tracking-widest flex items-center gap-2 bg-black/60 px-4 py-2 rounded-lg backdrop-blur-md hover:bg-white/20 transition-colors">
                        <RefreshCw className="w-3 h-3" /> 更换参考图
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-full bg-[#161616] flex items-center justify-center group-hover:scale-110 transition-transform mb-4">
                      <ImageIconLucide className="w-5 h-5 text-zinc-500 group-hover:text-[#C8855F] transition-colors" />
                    </div>
                    <p className="text-sm font-medium text-zinc-300">上传光影/场景参考图</p>
                    <p className="text-xs text-zinc-500 mt-1">AI将提取图中的美学特征</p>
                    <button onClick={() => document.getElementById('style-file-upload')?.click()} className="mt-4 text-xs bg-[#161616] border border-white/10 px-4 py-2 rounded-lg hover:bg-white/5 transition-colors">选择图片</button>
                  </>
                )}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <h3 className="text-xs tracking-widest text-zinc-500 uppercase font-medium">统一画面比例</h3>
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
              <h3 className="text-xs tracking-widest text-zinc-500 uppercase font-medium">精细度级 (每张)</h3>
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

          <div className="pt-4 border-t border-white/5 pb-20 flex flex-col gap-3">
            {workflowState === 'upload' && (
              <button 
                onClick={handleGenerateBase}
                disabled={productFiles.length === 0 || !styleFile || isGenerating}
                className="w-full relative group overflow-hidden rounded-xl bg-[#C8855F] text-black font-bold h-16 flex items-center justify-center shadow-[0_0_40px_rgba(200,133,95,0.15)] disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-[#D59871]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                <div className="flex flex-col items-center justify-center relative z-10 w-full px-4">
                  <span className="flex items-center gap-2 text-base font-bold">
                    <Play className="w-4 h-4 fill-black shrink-0" />
                    阶段 1：风格迁移与基础视觉
                  </span>
                  <span className="text-[12px] font-mono tracking-widest mt-0.5 font-bold">{getCreditCost(selectedRes)} 积分</span>
                </div>
              </button>
            )}

            {workflowState === 'generating_base' && (
               <div className="w-full h-16 bg-[#161616] text-[#C8855F] border border-[#C8855F]/30 rounded-xl font-bold tracking-wider flex justify-center items-center gap-3">
                 <RefreshCw className="w-5 h-5 animate-spin" />
                 正在迁移风格并生成主场景...
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
                       阶段 2：风格化套图衍生渲染
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
                     <RefreshCw className="w-4 h-4" /> 对风格不满？重新生成第一张
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
                 配置新的一组生图
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
                  toast.info("已中止迁移任务");
                }}
                className="w-full flex items-center justify-center gap-2 h-14 rounded-xl bg-red-500/10 text-red-500 font-bold border border-red-500/20 hover:bg-red-500/20 transition-all font-sans text-sm"
              >
                中止迁移任务
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
              <p className="text-sm font-medium">暂无迁移结果</p>
              <p className="text-xs mt-2 font-light">上传原图和参考图并在左侧发起生成</p>
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
                    <a href={baseImage} download={`zisha_transfer_base.png`} onClick={(e) => e.stopPropagation()} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-[#C8855F] text-white transition-colors">
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                  <div className="absolute top-2 left-2 bg-[#C8855F] text-black text-[10px] font-bold px-2 py-0.5 rounded">基础风格转换图</div>
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
                      <a href={r} download={`zisha_transfer_multi_${i}.png`} onClick={(e) => e.stopPropagation()} className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-[#C8855F] text-white transition-colors">
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
