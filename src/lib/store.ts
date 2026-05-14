import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { generateImageWithPolling } from './generateUtils';

// Custom storage object using idb-keyval
const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

interface AssetGroup {
  id: string;
  name: string;
  createdAt: number;
  images: string[];
}

interface AssetState {
  assets: string[];
  assetGroups: AssetGroup[];
  addAsset: (asset: string) => void;
  addAssets: (newAssets: string[]) => void;
  addAssetGroup: (group: AssetGroup) => void;
  updateAssetGroupName: (id: string, newName: string) => void;
  removeAssetGroup: (id: string) => void;
  removeAssetImage: (groupId: string, imageIndex: number) => void;
}

export const useAssetStore = create<AssetState>()(
  persist(
    (set) => ({
      assets: [
        "https://img.cdn1.vip/i/6a00179d715e0_1778390941.webp",
        "https://img.cdn1.vip/i/6a0017c2bfa49_1778390978.webp",
        "https://img.cdn1.vip/i/6a0017bb9bca9_1778390971.webp",
        "https://img.cdn1.vip/i/6a0017d358dbf_1778390995.webp",
        "https://img.cdn1.vip/i/6a0017e932d6a_1778391017.webp"
      ],
      assetGroups: [
        {
          id: "demo-group-1",
          name: "示例产品集",
          createdAt: Date.now(),
          images: [
            "https://img.cdn1.vip/i/6a00179d715e0_1778390941.webp",
            "https://img.cdn1.vip/i/6a0017c2bfa49_1778390978.webp",
            "https://img.cdn1.vip/i/6a0017bb9bca9_1778390971.webp",
            "https://img.cdn1.vip/i/6a0017d358dbf_1778390995.webp",
            "https://img.cdn1.vip/i/6a0017e932d6a_1778391017.webp"
          ]
        }
      ],
      addAsset: (asset) => set((state) => ({ assets: [asset, ...state.assets] })),
      addAssets: (newAssets) => set((state) => ({ assets: [...newAssets, ...state.assets] })),
      addAssetGroup: (group) => set((state) => ({ assetGroups: [group, ...state.assetGroups] })),
      updateAssetGroupName: (id, newName) => set((state) => ({
        assetGroups: state.assetGroups.map(g => g.id === id ? { ...g, name: newName } : g)
      })),
      removeAssetGroup: (id) => set((state) => ({
        assetGroups: state.assetGroups.filter(g => g.id !== id)
      })),
      removeAssetImage: (groupId, imageIndex) => set((state) => ({
        assetGroups: state.assetGroups.map(g => {
          if (g.id === groupId) {
            const newImages = [...g.images];
            newImages.splice(imageIndex, 1);
            return { ...g, images: newImages };
          }
          return g;
        }).filter(g => g.images.length > 0) // optionally remove empty groups
      })),
    }),
    {
      name: 'zisha-assets-storage',
      storage: createJSONStorage(() => idbStorage),
    }
  )
);

export interface BatchItem {
  id: string;
  name: string;
  file?: File;
  base64: string | null;
  status: "pending" | "processing" | "done" | "error";
  progress: number;
}

interface BatchState {
  isRunning: boolean;
  queue: BatchItem[];
  selectedRatio: string;
  selectedRes: string;
  setSelectedRatio: (ratio: string) => void;
  setSelectedRes: (res: string) => void;
  addItems: (items: BatchItem[]) => void;
  updateItem: (id: string, update: Partial<BatchItem>) => void;
  setIsRunning: (isRunning: boolean) => void;
}

export const useBatchStore = create<BatchState>()(
  (set) => ({
    isRunning: false,
    queue: [],
    selectedRatio: "4:3",
    selectedRes: "2K",
    setSelectedRatio: (ratio) => set({ selectedRatio: ratio }),
    setSelectedRes: (res) => set({ selectedRes: res }),
    addItems: (items) => set((state) => ({ queue: [...state.queue, ...items] })),
    updateItem: (id, update) => set((state) => ({
      queue: state.queue.map(q => q.id === id ? { ...q, ...update } : q)
    })),
    setIsRunning: (isRunning) => set({ isRunning }),
  })
);

let batchAbortController: AbortController | null = null;

export const abortBatchProcessing = () => {
  if (batchAbortController) {
    batchAbortController.abort();
    batchAbortController = null;
  }
};

export const startBatchProcessing = async () => {
  const state = useBatchStore.getState();
  if (state.isRunning) return;
  if (state.queue.every(q => q.status === 'done')) return;
  
  state.setIsRunning(true);
  
  batchAbortController = new AbortController();
  const signal = batchAbortController.signal;

  try {
    const queue = useBatchStore.getState().queue;
    const pendingItems = queue.filter(q => q.status === 'pending');
    
    await Promise.all(pendingItems.map(async (item, index) => {
      useBatchStore.getState().updateItem(item.id, { status: "processing", progress: 0 });
      
      try {
        let base64 = item.base64;
        if (!base64 && item.file) {
          base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(item.file!);
          });
          useBatchStore.getState().updateItem(item.id, { base64 });
        }

        const { selectedRatio, selectedRes } = useBatchStore.getState();

        // 1. Generate local prompts using Gemini 3.1 
        const promptsRes = await fetch("/api/batch-generate-prompts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
             image: base64,
             ratio: selectedRatio,
             resolution: selectedRes
          }),
          signal
        });
        
        let batchPrompts: string[] = [];
        const rawResponse = await promptsRes.text();
        
        // Extract JSON from potentially chunked response
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
          throw new Error("Failed to parse prompt generation response");
        }

        if (!batchPrompts || batchPrompts.length === 0) {
           throw new Error("Failed to generate dynamic prompts");
        }

        const promises = batchPrompts.slice(0, 9).map(async (prompt, pIndex) => {
          if (signal.aborted) throw new DOMException("Aborted", "AbortError");
          
          try {
            const resultUrl = await generateImageWithPolling({
              style: prompt,
              ratio: selectedRatio,
              resolution: selectedRes,
              image: base64
            }, signal);
            
            const currentItem = useBatchStore.getState().queue.find(q => q.id === item.id);
            if (currentItem) {
               useBatchStore.getState().updateItem(item.id, { progress: currentItem.progress + 1 });
            }
            try {
              const { playSuccessSound } = await import("./utils");
              playSuccessSound();
            } catch(e) {}
            return resultUrl;
          } catch (err: any) {
            throw new Error(err.message || "Failed to generate image in batch");
          }
        });

        const resultImages = await Promise.all(promises);

        if (resultImages.length > 0) {
          useAssetStore.getState().addAssetGroup({
            id: Date.now().toString() + "-" + index,
            name: item.name.replace(/\.[^/.]+$/, ""),
            createdAt: Date.now(),
            images: resultImages
          });
          useBatchStore.getState().updateItem(item.id, { status: "done", progress: 9 });
        } else {
            throw new Error("No images generated");
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          useBatchStore.getState().updateItem(item.id, { status: "pending", progress: 0 });
        } else {
          console.error("Batch processing error", err);
          useBatchStore.getState().updateItem(item.id, { status: "error" });
        }
      }
    }));
  } finally {
    batchAbortController = null;
    useBatchStore.getState().setIsRunning(false);
  }
};

interface GenerateState {
  file: string | null;
  selectedStyle: string;
  selectedRatio: string;
  selectedRes: string;
  isGenerating: boolean;
  stepIndex: number;
  result: string | null;
  setFile: (file: string | null) => void;
  setSelectedStyle: (style: string) => void;
  setSelectedRatio: (ratio: string) => void;
  setSelectedRes: (res: string) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setStepIndex: (stepIndex: number) => void;
  setResult: (result: string | null) => void;
}

export const useGenerateStore = create<GenerateState>()(
  persist(
    (set) => ({
      file: null,
      selectedStyle: "t1",
      selectedRatio: "1:1",
      selectedRes: "2K",
      isGenerating: false,
      stepIndex: 0,
      result: null,
      setFile: (file) => set({ file }),
      setSelectedStyle: (selectedStyle) => set({ selectedStyle }),
      setSelectedRatio: (selectedRatio) => set({ selectedRatio }),
      setSelectedRes: (selectedRes) => set({ selectedRes }),
      setIsGenerating: (isGenerating) => set({ isGenerating }),
      setStepIndex: (stepIndex) => set({ stepIndex }),
      setResult: (result) => set({ result }),
    }),
    {
      name: 'zisha-generate-storage-v2',
      storage: createJSONStorage(() => idbStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setIsGenerating(false);
        }
      }
    }
  )
);

type WorkflowState = 'upload' | 'generating_base' | 'base_generated' | 'generating_batch' | 'batch_generated';

interface MultiViewState {
  files: string[];
  remarks: string;
  selectedRatio: string;
  selectedRes: string;
  selectedCount: number;
  workflowState: WorkflowState;
  basePrompt: string;
  baseImage: string | null;
  isGenerating: boolean;
  progress: number;
  results: string[];
  setFiles: (files: string[] | ((prev: string[]) => string[])) => void;
  setRemarks: (remarks: string) => void;
  setSelectedRatio: (ratio: string) => void;
  setSelectedRes: (res: string) => void;
  setSelectedCount: (count: number) => void;
  setWorkflowState: (state: WorkflowState) => void;
  setBasePrompt: (prompt: string) => void;
  setBaseImage: (image: string | null) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setProgress: (progress: number) => void;
  setResults: (results: string[] | ((prev: string[]) => string[])) => void;
}

export const useMultiViewStore = create<MultiViewState>()(
  persist(
    (set) => ({
      files: [],
      remarks: "",
      selectedRatio: "1:1",
      selectedRes: "2K",
      selectedCount: 4,
      workflowState: 'upload',
      basePrompt: "",
      baseImage: null,
      isGenerating: false,
      progress: 0,
      results: [],
      setFiles: (files) => set((state) => ({ files: typeof files === 'function' ? files(state.files) : files })),
      setRemarks: (remarks) => set({ remarks }),
      setSelectedRatio: (selectedRatio) => set({ selectedRatio }),
      setSelectedRes: (selectedRes) => set({ selectedRes }),
      setSelectedCount: (selectedCount) => set({ selectedCount }),
      setWorkflowState: (workflowState) => set({ workflowState }),
      setBasePrompt: (basePrompt) => set({ basePrompt }),
      setBaseImage: (baseImage) => set({ baseImage }),
      setIsGenerating: (isGenerating) => set({ isGenerating }),
      setProgress: (progress) => set({ progress }),
      setResults: (results) => set((state) => ({ results: typeof results === 'function' ? results(state.results) : results })),
    }),
    {
      name: 'zisha-multiview-storage-v2',
      storage: createJSONStorage(() => idbStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setIsGenerating(false);
          state.setProgress(0);
          if (state.workflowState && state.workflowState.startsWith('generating')) {
            state.setWorkflowState('upload');
          }
        }
      }
    }
  )
);

type StyleTransferWorkflowState = 'upload' | 'generating_base' | 'base_generated' | 'generating_batch' | 'batch_generated';

interface StyleTransferState {
  productFiles: string[];
  styleFile: string | null;
  selectedRatio: string;
  selectedRes: string;
  selectedCount: number;
  workflowState: StyleTransferWorkflowState;
  baseImage: string | null;
  basePrompt: string; // Used strictly if we need a text prompt for batch generation
  isGenerating: boolean;
  progress: number;
  results: string[];
  setProductFiles: (files: string[] | ((prev: string[]) => string[])) => void;
  setStyleFile: (file: string | null) => void;
  setSelectedRatio: (ratio: string) => void;
  setSelectedRes: (res: string) => void;
  setSelectedCount: (count: number) => void;
  setWorkflowState: (state: StyleTransferWorkflowState) => void;
  setBaseImage: (image: string | null) => void;
  setBasePrompt: (prompt: string) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setProgress: (progress: number) => void;
  setResults: (results: string[] | ((prev: string[]) => string[])) => void;
}

export const useStyleTransferStore = create<StyleTransferState>()(
  persist(
    (set) => ({
      productFiles: [],
      styleFile: null,
      selectedRatio: "1:1",
      selectedRes: "2K",
      selectedCount: 4,
      workflowState: 'upload',
      baseImage: null,
      basePrompt: "",
      isGenerating: false,
      progress: 0,
      results: [],
      setProductFiles: (files) => set((state) => ({ productFiles: typeof files === 'function' ? files(state.productFiles) : files })),
      setStyleFile: (styleFile) => set({ styleFile }),
      setSelectedRatio: (selectedRatio) => set({ selectedRatio }),
      setSelectedRes: (selectedRes) => set({ selectedRes }),
      setSelectedCount: (selectedCount) => set({ selectedCount }),
      setWorkflowState: (workflowState) => set({ workflowState }),
      setBaseImage: (baseImage) => set({ baseImage }),
      setBasePrompt: (basePrompt) => set({ basePrompt }),
      setIsGenerating: (isGenerating) => set({ isGenerating }),
      setProgress: (progress) => set({ progress }),
      setResults: (results) => set((state) => ({ results: typeof results === 'function' ? results(state.results) : results })),
    }),
    {
      name: 'zisha-style-transfer-storage-v2',
      storage: createJSONStorage(() => idbStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setIsGenerating(false);
          state.setProgress(0);
          if (state.workflowState && state.workflowState.startsWith('generating')) {
            state.setWorkflowState('upload');
          }
        }
      }
    }
  )
);

interface LayoutState {
  uploadImages: string[];
  reportInfo: string;
  generatedPrompts: string[];
  finalImages: string[];
  isAnalyzing: boolean;
  isGeneratingImages: boolean;
  progress: number;
  setUploadImages: (images: string[] | ((prev: string[]) => string[])) => void;
  setReportInfo: (info: string) => void;
  setGeneratedPrompts: (prompts: string[]) => void;
  setFinalImages: (images: string[] | ((prev: string[]) => string[])) => void;
  setIsAnalyzing: (is: boolean) => void;
  setIsGeneratingImages: (is: boolean) => void;
  setProgress: (progress: number) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      uploadImages: [],
      reportInfo: "",
      generatedPrompts: [],
      finalImages: [],
      isAnalyzing: false,
      isGeneratingImages: false,
      progress: 0,
      setUploadImages: (images) => set((state) => ({ uploadImages: typeof images === 'function' ? images(state.uploadImages) : images })),
      setReportInfo: (reportInfo) => set({ reportInfo }),
      setGeneratedPrompts: (generatedPrompts) => set({ generatedPrompts }),
      setFinalImages: (images) => set((state) => ({ finalImages: typeof images === 'function' ? images(state.finalImages) : images })),
      setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
      setIsGeneratingImages: (isGeneratingImages) => set({ isGeneratingImages }),
      setProgress: (progress) => set({ progress }),
    }),
    {
      name: 'zisha-layout-storage-v2',
      storage: createJSONStorage(() => idbStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setIsAnalyzing(false);
          state.setIsGeneratingImages(false);
          state.setProgress(0);
        }
      }
    }
  )
);
