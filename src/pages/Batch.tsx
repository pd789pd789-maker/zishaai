import React from "react";
import { ListTree, Upload, CheckCircle2, Loader2, Play, AlertCircle, Settings2, Image as ImageIcon, Frame } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { useAssetStore, useBatchStore, startBatchProcessing, abortBatchProcessing } from "../lib/store";

export default function Batch() {
  const { isRunning, queue, addItems, selectedRatio, selectedRes, setSelectedRatio, setSelectedRes } = useBatchStore();

  const startBatch = async () => {
    if (queue.every(q => q.status === 'done')) return;
    toast.info("流水线启动，正在批量生成广告图，您可以随意切换页面，任务将在后台继续。");
    startBatchProcessing().then(() => {
        toast.success("所有任务处理完成！请前往数字资产库查看。");
    }).catch((e) => {
        toast.error("处理中止");
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length > 0) {
      const newItems = files.map((f, i) => ({
        id: Date.now() + i.toString(),
        name: f.name,
        file: f,
        base64: null,
        status: "pending" as const,
        progress: 0
      }));
      addItems(newItems);
      toast.success(`已添加 ${files.length} 个文件到队列`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []) as File[];
    if (files.length > 0) {
      const newItems = files.map((f, i) => ({
        id: Date.now() + i.toString(),
        name: f.name,
        file: f,
        base64: null,
        status: "pending" as const,
        progress: 0      
      }));
      addItems(newItems);
      toast.success(`已添加 ${files.length} 个文件到队列`);
    }
  };

  const handleUploadClick = () => {
    document.getElementById('batch-upload')?.click();
  };

  const doneCount = queue.filter(q => q.status === 'done').length;
  const progress = queue.length === 0 ? 0 : (doneCount / queue.length) * 100;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="p-10 h-full flex flex-col">
      <header className="mb-8 shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-light tracking-wide serif mb-2">工作室批量流水线</h2>
          <p className="text-zinc-500 text-sm tracking-wide font-light">上传多视角的单张产品拼接图，全自动生成9套不同光影的商业广告图并存入资产库。</p>
        </div>
        <div className="flex flex-col gap-2 w-full md:w-auto">
          <button 
            onClick={startBatch} 
            disabled={isRunning || queue.length === 0 || progress === 100}
            className="w-full justify-center bg-[#C8855F] text-black font-medium px-6 py-2.5 rounded-full text-sm flex items-center gap-2 hover:bg-[#B5754F] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? <><Loader2 className="w-4 h-4 animate-spin" /> 流水线运转中...</> : <><Play className="w-4 h-4" /> 启动流水线</>}
          </button>
          
          {isRunning && (
            <button
              onClick={() => {
                abortBatchProcessing();
                toast.info("已中止流水线任务");
              }}
              className="w-full justify-center bg-red-500/10 text-red-500 font-medium border border-red-500/20 px-6 py-2.5 rounded-full text-sm flex items-center gap-2 hover:bg-red-500/20 transition-all font-sans"
            >
              中止流水线任务
            </button>
          )}
        </div>
      </header>

      <div className="mb-6 bg-[#0F0F0F] border border-white/5 p-6 rounded-2xl shrink-0">
        <div className="flex items-center gap-2 mb-4 text-[#C8855F]">
           <Settings2 className="w-5 h-5" />
           <span className="font-medium text-sm">流水线全局设定</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div>
              <div className="flex items-center gap-2 mb-3 text-zinc-400">
                <Frame className="w-4 h-4" />
                <span className="text-xs font-mono">尺寸比例</span>
              </div>
              <div className="flex gap-2">
                 {["1:1", "4:3", "3:4", "16:9", "9:16"].map(ratio => (
                    <button
                      key={ratio}
                      className={cn(
                        "px-4 py-2 rounded-lg text-xs font-mono transition-all border",
                        selectedRatio === ratio 
                          ? "bg-[#C8855F]/20 text-[#C8855F] border-[#C8855F]/50" 
                          : "bg-[#1A1A1A] text-zinc-400 border-white/5 hover:bg-[#222]"
                      )}
                      onClick={() => setSelectedRatio(ratio)}
                    >
                      {ratio}
                    </button>
                 ))}
              </div>
           </div>
           
           <div>
              <div className="flex items-center gap-2 mb-3 text-zinc-400">
                <ImageIcon className="w-4 h-4" />
                <span className="text-xs font-mono">输出画质</span>
              </div>
              <div className="flex gap-2">
                 {[
                   { id: "1K", desc: "标准" },
                   { id: "2K", desc: "高清" },
                   { id: "4K", desc: "商业级" }
                 ].map(res => (
                    <button
                      key={res.id}
                      className={cn(
                        "px-4 py-2 rounded-lg flex flex-col items-center gap-1 transition-all border",
                        selectedRes === res.id 
                          ? "bg-[#C8855F]/20 text-[#C8855F] border-[#C8855F]/50" 
                          : "bg-[#1A1A1A] text-zinc-400 border-white/5 hover:bg-[#222]"
                      )}
                      onClick={() => setSelectedRes(res.id)}
                    >
                      <span className="text-xs font-mono font-bold">{res.id}</span>
                      <span className="text-[10px] opacity-70">{res.desc}</span>
                    </button>
                 ))}
              </div>
           </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 min-h-0">
        <div 
          onClick={handleUploadClick}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={handleDrop}
          className="col-span-1 lg:col-span-1 border-2 border-dashed border-[#ffffff10] rounded-2xl bg-[#0F0F0F] flex flex-col items-center justify-center p-8 text-center hover:border-[#C8855F]/50 transition-colors cursor-pointer group min-h-[200px] lg:min-h-0"
        >
           <input id="batch-upload" type="file" multiple className="hidden" accept="image/*" onChange={handleFileChange} />
           <Upload className="w-8 h-8 text-zinc-500 mb-4 group-hover:text-[#C8855F] transition-colors" />
           <p className="text-sm font-medium mb-1">拖拽产品合拼图至此</p>
           <p className="text-xs text-zinc-500">建议上传单张包含多角度的产品原图</p>
        </div>

        <div className="col-span-1 lg:col-span-2 bg-[#0F0F0F] border border-[#ffffff10] rounded-2xl p-6 flex flex-col min-h-[400px] lg:min-h-0">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-sm font-medium">渲染队列</h3>
             <span className="text-xs font-mono text-[#C8855F]">{Math.round(progress)}% 已完成</span>
          </div>
          
          <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden mb-6">
            <motion.div 
              className="h-full bg-[#C8855F]"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
            {queue.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-[#161616] border border-white/5">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-zinc-900 rounded flex items-center justify-center">
                      <ListTree className="w-4 h-4 text-zinc-600" />
                    </div>
                    <div>
                        <span className="text-sm font-mono text-zinc-300 block">{item.name}</span>
                        {item.status === 'processing' && (
                            <span className="text-xs text-[#C8855F]">生成中... ({item.progress}/9)</span>
                        )}
                    </div>
                 </div>
                 <div>
                    {item.status === 'done' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {item.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                    {item.status === 'processing' && <Loader2 className="w-4 h-4 text-[#C8855F] animate-spin" />}
                    {item.status === 'pending' && <span className="text-[10px] text-zinc-600 uppercase">等待排期</span>}
                 </div>
              </div>
            ))}
            
            {queue.length === 0 && (
                <div className="h-full flex items-center justify-center text-zinc-600 text-sm">
                    队列空空如也，请先添加任务
                </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

