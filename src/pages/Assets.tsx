import React, { useState, useEffect } from "react";
import { Archive, ShieldCheck, Download, Grip, CheckCircle, Folder, PenSquare, Trash2, X, Plus, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAssetStore } from "../lib/store";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { ImagePreviewDialog } from "../components/ImagePreviewDialog";

export default function Assets() {
  const assetGroups = useAssetStore((state) => state.assetGroups);
  const addAssetGroup = useAssetStore((state) => state.addAssetGroup);
  const updateAssetGroupName = useAssetStore((state) => state.updateAssetGroupName);
  const removeAssetGroup = useAssetStore((state) => state.removeAssetGroup);
  const removeAssetImage = useAssetStore((state) => state.removeAssetImage);
  
  const [watermark, setWatermark] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const activeGroup = assetGroups.find(g => g.id === activeGroupId);
  const [previewList, setPreviewList] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number>(-1);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const openPreview = (images: string[], index: number) => {
    setPreviewList(images);
    setPreviewIndex(index);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [activeGroupId]);

  const downloadSingleImage = async (url: string, index: number, groupName: string) => {
    try {
      if (url.startsWith('data:')) {
        const arr = url.split(',');
        const bstr = atob(arr[1]);
        const mime = arr[0].match(/:(.*?);/)![1];
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], {type: mime});
        saveAs(blob, `${groupName}_${index + 1}.jpg`);
      } else if (url.startsWith("/")) {
        const response = await fetch(url);
        const blob = await response.blob();
        saveAs(blob, `${groupName}_${index + 1}.jpg`);
      } else {
        const response = await fetch('/api/proxy-image?url=' + encodeURIComponent(url));
        const blob = await response.blob();
        saveAs(blob, `${groupName}_${index + 1}.jpg`);
      }
      toast.success("图片已下载");
    } catch(e) {
      console.error(e);
      toast.error("图片下载失败");
    }
  };

  const downloadGroup = async (group: any) => {
    toast.info(`开始打包下载 ${group.name}...`);
    try {
      const zip = new JSZip();
      
      for (let i = 0; i < group.images.length; i++) {
        const url = group.images[i];
        
        // If it's base64 data URI
        if (url.startsWith('data:')) {
          const arr = url.split(',');
          const bstr = atob(arr[1]);
          const mime = arr[0].match(/:(.*?);/)![1];
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while(n--){
              u8arr[n] = bstr.charCodeAt(n);
          }
          const blob = new Blob([u8arr], {type: mime});
          zip.file(`${group.name}_${i + 1}.jpg`, blob);
        } else if (url.startsWith("/")) {
          const response = await fetch(url);
          const blob = await response.blob();
          zip.file(`${group.name}_${i + 1}.jpg`, blob);
        } else {
          // fetch URL blob via proxy to avoid CORS
          const response = await fetch('/api/proxy-image?url=' + encodeURIComponent(url));
          const blob = await response.blob();
          zip.file(`${group.name}_${i + 1}.jpg`, blob);
        }
      }
      
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${group.name}.zip`);
      toast.success("资产打包完成，已开始下载！");
    } catch (e) {
      console.error(e);
      toast.error("打包下载失败");
    }
  };

  const handleDownloadAll = async () => {
    if (assetGroups.length === 0) {
      toast.error("没有可下载的资产");
      return;
    }
    toast.info("开始打包所有群组，请耐心等待...");
    try {
      const zip = new JSZip();
      
      for (const group of assetGroups) {
        const folder = zip.folder(group.name);
        for (let i = 0; i < group.images.length; i++) {
          const url = group.images[i];
          if (url.startsWith('data:')) {
            const arr = url.split(',');
            const bstr = atob(arr[1]);
            const mime = arr[0].match(/:(.*?);/)![1];
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while(n--){ u8arr[n] = bstr.charCodeAt(n); }
            folder?.file(`${group.name}_${i + 1}.jpg`, new Blob([u8arr], {type: mime}));
          } else if (url.startsWith("/")) {
            const res = await fetch(url);
            folder?.file(`${group.name}_${i + 1}.jpg`, await res.blob());
          } else {
            const res = await fetch('/api/proxy-image?url=' + encodeURIComponent(url));
            folder?.file(`${group.name}_${i + 1}.jpg`, await res.blob());
          }
        }
      }
      
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "全部ZishaAI资产.zip");
      toast.success("所有资产打包完成！");
    } catch (e) {
      console.error(e);
      toast.error("打包下载所有资产失败");
    }
  };

  const handleAddAssetClick = () => {
    document.getElementById('assets-upload')?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length > 0) {
      const base64Promises = files.map(f => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(f);
        });
      });
      
      const newBase64s = await Promise.all(base64Promises);
      addAssetGroup({
        id: Date.now().toString(),
        name: "手动上传_" + Date.now().toString().slice(-4),
        createdAt: Date.now(),
        images: newBase64s
      });
      toast.success(`成功创建一个新资产文件夹，包含 ${files.length} 张图`);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="p-4 md:p-10 h-full flex flex-col">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 shrink-0">
        <div>
           <h2 className="text-3xl font-light tracking-wide serif mb-2">数字资产库</h2>
           <p className="text-zinc-500 text-sm tracking-wide font-light">云端图库管理，支持批量打包下载成压缩文件包，资产长期保存。</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => setWatermark(!watermark)}
            className={`px-4 py-2 rounded-full text-sm flex items-center gap-2 border transition-colors ${watermark ? 'bg-[#C8855F]/10 border-[#C8855F] text-[#C8855F]' : 'border-white/10 text-zinc-400 hover:text-white hover:border-zinc-500'}`}
          >
            <ShieldCheck className="w-4 h-4" /> 品牌防伪水印 {watermark ? '开' : '关'}
          </button>
          <button onClick={handleDownloadAll} className="bg-[#161616] text-[#E5E7EB] border border-white/5 px-4 py-2 rounded-full text-sm flex items-center gap-2 hover:bg-zinc-800 transition-colors">
            <Archive className="w-4 h-4" /> 打包下载全部
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {!activeGroup ? (
          <motion.div key="grid-view" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex-1 flex flex-col h-full overflow-hidden mt-4">
            <div className="columns-1 sm:columns-2 lg:columns-4 gap-6 flex-1 overflow-y-auto custom-scrollbar md:pr-2 pb-10 content-start">
              {assetGroups
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((group) => (
              <div key={group.id} className="group relative bg-[#0F0F0F] rounded-xl border border-white/5 overflow-hidden flex flex-col break-inside-avoid mb-6">
                 
                 {/* Thumbnail Grid */}
                 <div onClick={() => setActiveGroupId(group.id)} className="relative p-1.5 bg-[#161616] cursor-pointer hover:opacity-90 transition-opacity">
                    <div className="relative w-full overflow-hidden rounded-lg bg-zinc-900 flex items-center justify-center">
                       {group.images[0] ? (
                         <img src={group.images[0]} className="w-full h-auto block object-contain opacity-80 group-hover:opacity-100 transition-opacity" alt="thumbnail" />
                       ) : (
                         <div className="w-full h-32 flex items-center justify-center">
                           <Folder className="w-8 h-8 text-zinc-600" />
                         </div>
                       )}
                       {watermark && (
                         <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none mix-blend-overlay rotate-[-30deg]">
                           <span className="text-[10px] font-serif font-bold text-white tracking-widest select-none">ZISHA.AI</span>
                         </div>
                       )}
                       
                       {group.images.length > 1 && (
                         <div className="absolute top-2 right-2 flex space-x-1">
                           <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
                           <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
                           <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
                         </div>
                       )}
                    </div>
                 </div>
                 
                 {/* Info Bar */}
                 <div className="p-4 flex-col flex flex-1 justify-between bg-[#111]">
                     {editingId === group.id ? (
                        <div className="flex items-center gap-2 mb-2">
                          <input 
                            type="text" 
                            autoFocus
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="bg-black border border-[#C8855F] rounded px-2 py-1 text-sm text-white w-full outline-none"
                          />
                          <button 
                            onClick={() => {
                              if(editName.trim()) updateAssetGroupName(group.id, editName.trim());
                              setEditingId(null);
                            }}
                            className="text-[#C8855F] p-1"><CheckCircle className="w-4 h-4" />
                          </button>
                        </div>
                     ) : (
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 overflow-hidden cursor-pointer hover:underline" onClick={() => setActiveGroupId(group.id)}>
                            <Folder className="w-4 h-4 text-[#C8855F] shrink-0" />
                            <span className="text-sm font-medium text-white truncate" title={group.name}>{group.name}</span>
                          </div>
                          <button 
                            onClick={() => {
                              setEditName(group.name);
                              setEditingId(group.id);
                            }} 
                            className="text-zinc-500 hover:text-white shrink-0 p-0.5"
                          >
                            <PenSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                     )}

                     <div className="flex items-center justify-between mt-auto pt-4">
                        <span className="text-xs text-zinc-500 font-mono">{group.images.length} Items</span>
                        <div className="flex items-center gap-2">
                           <button onClick={(e) => { e.stopPropagation(); removeAssetGroup(group.id); }} className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-colors" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                           </button>
                           <button onClick={(e) => { e.stopPropagation(); downloadGroup(group); }} className="w-8 h-8 rounded-full bg-white/5 text-white flex items-center justify-center hover:bg-white/20 transition-colors" title="Download ZIP">
                              <Download className="w-3.5 h-3.5" />
                           </button>
                        </div>
                     </div>
                 </div>
              </div>
            ))}
            
            </div>

            {Math.ceil(assetGroups.length / itemsPerPage) > 1 && (
              <div className="flex justify-center items-center mt-4 gap-4 pb-4">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-2 rounded-full bg-white/5 text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-zinc-400">
                  {currentPage} / {Math.ceil(assetGroups.length / itemsPerPage)}
                </span>
                <button 
                  disabled={currentPage === Math.ceil(assetGroups.length / itemsPerPage)}
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(assetGroups.length / itemsPerPage), prev + 1))}
                  className="p-2 rounded-full bg-white/5 text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="group-view" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setActiveGroupId(null)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div>
                <h3 className="text-xl font-medium">{activeGroup.name}</h3>
                <p className="text-zinc-500 text-xs mt-1">{activeGroup.images.length} 张图片</p>
              </div>
              <div className="ml-auto">
                <button onClick={() => downloadGroup(activeGroup)} className="bg-[#161616] text-[#E5E7EB] border border-white/5 px-4 py-2 rounded-full text-sm flex items-center gap-2 hover:bg-zinc-800 transition-colors">
                  <Download className="w-4 h-4" /> 下载整组
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar md:pr-2 pb-10 content-start">
              <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6">
                {activeGroup.images
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((img: string, idx: number) => {
                    const originalIdx = (currentPage - 1) * itemsPerPage + idx;
                    return (
                      <div key={originalIdx} className="group relative rounded-xl overflow-hidden bg-[#161616] flex flex-col items-center justify-center border border-white/5 w-full break-inside-avoid mb-6">
                        <img src={img} alt={`Asset ${originalIdx}`} className="w-full h-auto block object-contain opacity-90 transition-opacity group-hover:opacity-100" />
                        {watermark && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none mix-blend-overlay rotate-[-30deg] overflow-hidden">
                            <span className="text-[12px] font-serif font-bold text-white tracking-widest select-none block max-w-full text-center">ZISHA.AI</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <button onClick={() => openPreview(activeGroup.images, originalIdx)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#C8855F] hover:text-white transition-colors text-white">
                            <Eye className="w-5 h-5" />
                          </button>
                          <button onClick={() => downloadSingleImage(img, originalIdx, activeGroup.name)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#C8855F] hover:text-white transition-colors text-white">
                            <Download className="w-5 h-5" />
                          </button>
                          <button onClick={() => removeAssetImage(activeGroup.id, originalIdx)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors text-red-500">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {Math.ceil(activeGroup.images.length / itemsPerPage) > 1 && (
                <div className="flex justify-center items-center mt-8 gap-4 pb-4">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-2 rounded-full bg-white/5 text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm text-zinc-400">
                    {currentPage} / {Math.ceil(activeGroup.images.length / itemsPerPage)}
                  </span>
                  <button 
                    disabled={currentPage === Math.ceil(activeGroup.images.length / itemsPerPage)}
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(activeGroup.images.length / itemsPerPage), prev + 1))}
                    className="p-2 rounded-full bg-white/5 text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ImagePreviewDialog
        images={previewList}
        currentIndex={previewIndex}
        onClose={() => setPreviewIndex(-1)}
        onChangeIndex={setPreviewIndex}
        watermark={watermark}
      />
    </motion.div>
  );
}

