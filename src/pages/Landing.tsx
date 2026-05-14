import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Image as ImageIcon, Camera, LayoutTemplate } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function Landing() {
  const handleComingSoon = () => toast("即将上线，敬请期待！", { description: "即将上线" });

  return (
    <div className="bg-[#0B0B0B] min-h-screen text-[#E5E7EB] font-sans overflow-x-hidden selection:bg-[#C8855F] selection:text-white">
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="fixed top-0 w-full z-50 bg-[#0B0B0B]/80 backdrop-blur-md haute-border"
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="haute-title text-xl text-white">
              数字紫砂<span className="text-[#C8855F]">系统</span>
              <span className="text-[10px] border border-[#C8855F]/30 text-[#C8855F] px-2 py-0.5 ml-3 font-sans font-light tracking-widest rounded-none">
                专业版
              </span>
            </span>
          </div>
          <div className="flex items-center justify-center absolute left-1/2 -translate-x-1/2">
             {/* Centered nav links for symmetry */}
             <div className="hidden md:flex items-center gap-10 haute-subtitle text-[11px] text-zinc-400">
               <Link to="/cases" className="hover:text-white transition-colors">展厅</Link>
               <Link to="/app/pricing" className="hover:text-white transition-colors">企业定制</Link>
             </div>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/login" className="haute-subtitle text-[11px] text-zinc-400 hover:text-white transition-colors hidden sm:block">登入</Link>
            <Link to="/app" className="border border-white/20 text-white px-5 py-2 hover:bg-white hover:text-black transition-all haute-subtitle text-[11px] flex items-center gap-3">
              进入工作台 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </motion.nav>
      
      <main className="pt-32 pb-24">
        {/* Her Section */}
        <section className="max-w-7xl mx-auto px-6 mt-12 md:mt-20 mb-32 flex flex-col items-start text-left">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut", staggerChildren: 0.2 }}
            className="w-full flex max-lg:flex-col lg:justify-between lg:items-end mb-16 gap-10"
          >
            <div>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 1 }} className="haute-subtitle text-[#C8855F] mb-6 text-xs md:text-sm tracking-[0.4em]">数字紫砂 · 高定引擎</motion.p>
              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 1 }} className="text-6xl md:text-8xl lg:text-[9rem] font-serif mb-2 leading-[0.9] text-white tracking-widest text-shadow-xl font-bold">
                重塑影像
              </motion.h1>
              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 1 }} className="text-5xl md:text-7xl lg:text-[8rem] font-serif leading-[0.9] text-white">
                <span className="italic text-zinc-500 font-light pr-4">无尽</span>形制
              </motion.h1>
            </div>
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 1 }} className="max-w-sm">
              <p className="text-sm text-zinc-400 font-light leading-relaxed tracking-wide mb-8">
                摒弃繁杂影棚，跨越时空限制。仅需实拍图，即可为您渲染出超现实的电影级商业大片，严格保留原矿深层肌理。
              </p>
              <div className="flex items-center gap-6">
                <Link to="/app" className="text-black font-semibold haute-subtitle text-sm lg:text-base px-10 py-4 bg-white hover:bg-[#C8855F] hover:text-white transition-colors tracking-widest">
                  开启创作
                </Link>
                <a href="#features" className="border border-white/20 text-white haute-subtitle text-sm lg:text-base px-10 py-4 hover:bg-white/5 transition-colors tracking-widest">
                  探索深境
                </a>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            className="w-full relative aspect-[16/9] lg:aspect-[21/9] overflow-hidden group"
          >
            <div className="absolute inset-0 bg-black/20 z-10 transition-opacity duration-700 group-hover:opacity-0"></div>
            <img 
              src="https://img.cdn1.vip/i/6a00179d715e0_1778390941.webp" 
              alt="展台主图" 
              className="w-full h-full object-cover scale-100 group-hover:scale-105 transition-transform duration-[3s] ease-out object-center" 
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none w-full hidden">
              {/* Fallback pattern */}
            </div>
          </motion.div>
        </section>

        {/* Features - Symmetrical List */}
        <section id="features" className="max-w-5xl mx-auto px-6 py-20 border-t border-white/10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-center mb-24"
          >
            <h2 className="text-3xl md:text-4xl haute-title mb-6">光影炼金术</h2>
            <div className="w-12 h-px bg-[#C8855F] mx-auto opacity-50"></div>
          </motion.div>

          <div className="flex flex-col gap-32">
            
            {/* Feature 1 - Centered */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-px h-16 bg-white/20 mb-8"></div>
              <p className="haute-subtitle text-[#C8855F] text-[11px] mb-4">壹 / 绝对解构</p>
              <h3 className="text-3xl md:text-5xl font-serif mb-6 text-white max-w-2xl leading-tight">形制与泥料级纯粹解构</h3>
              <p className="text-zinc-400 font-light max-w-2xl text-sm md:text-base leading-relaxed tracking-wide">
                底层专属视觉引擎将严格保留您原图中的矿粒感、出水孔细节及壶嘴接缝。仅改变光影氛围，绝不篡改物品本身结构与神韵。
              </p>
              <div className="mt-12 w-full max-w-3xl aspect-[21/9] overflow-hidden border border-white/10 relative">
                <motion.img 
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  src="https://img.cdn1.vip/i/6a0017c2bfa49_1778390978.webp" 
                  alt="精细解构" 
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000 object-center origin-center"
                />
              </div>
            </motion.div>

            {/* Feature 2 - Centered */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-px h-16 bg-white/20 mb-8"></div>
              <p className="haute-subtitle text-[#C8855F] text-[11px] mb-4">贰 / 高奢质感</p>
              <h3 className="text-3xl md:text-5xl font-serif mb-6 text-white max-w-2xl leading-tight">20+ 顶级高定风格</h3>
              <p className="text-zinc-400 font-light max-w-2xl text-sm md:text-base leading-relaxed tracking-wide">
                从院线电影的幽暗深邃，到香奈儿式的纯色极简。告别廉价的套版，瞬间赋予紫砂高奢调性。
              </p>
              <div className="mt-12 w-full max-w-3xl flex justify-center gap-8">
                 <div className="w-1/2 aspect-[3/4] border border-white/10 overflow-hidden relative">
                   <motion.img whileHover={{ scale: 1.05 }} transition={{ duration: 2, ease: "easeOut" }} src="https://img.cdn1.vip/i/6a0017bb9bca9_1778390971.webp" className="w-full h-full object-cover grayscale opacity-60 hover:opacity-100 hover:grayscale-0 transition-all duration-1000 origin-center" />
                 </div>
                 <div className="w-1/2 aspect-[3/4] border border-white/10 overflow-hidden relative mt-12">
                   <motion.img whileHover={{ scale: 1.05 }} transition={{ duration: 2, ease: "easeOut" }} src="https://img.cdn1.vip/i/6a00179d715e0_1778390941.webp" className="w-full h-full object-cover grayscale opacity-60 hover:opacity-100 hover:grayscale-0 transition-all duration-1000 origin-center" />
                 </div>
              </div>
            </motion.div>

             {/* Feature 3 - Centered */}
             <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-px h-16 bg-white/20 mb-8"></div>
              <p className="haute-subtitle text-[#C8855F] text-[11px] mb-4">叁 / 极速流水线</p>
              <h3 className="text-3xl md:text-5xl font-serif mb-6 text-white max-w-2xl leading-tight">全景阵列生成引擎</h3>
              <p className="text-zinc-400 font-light max-w-2xl text-sm md:text-base leading-relaxed tracking-wide">
                单图触发裂变，自动产出主图、场景图、微距白底图，并完美契合高定版式。整窑新品，批量极速渲染，尽显从容。
              </p>
              <Link to="/app/layout" className="mt-12 border-b border-[#C8855F]/50 text-[#C8855F] haute-subtitle text-[11px] pb-1 hover:border-[#C8855F] transition-all flex items-center gap-3">
                探索批量处理 <ArrowRight className="w-3 h-3" />
              </Link>
            </motion.div>

          </div>
        </section>
        
        {/* Call to action */}
        <section className="max-w-4xl mx-auto px-6 mt-40 text-center relative pt-20 border-t border-white/10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <h2 className="text-4xl md:text-6xl font-serif mb-8 relative z-10 text-white leading-tight">重塑视觉资产</h2>
            <p className="text-zinc-500 mb-14 max-w-md mx-auto relative z-10 text-sm md:text-base font-light tracking-wide leading-relaxed">
              无需下载，打开网页即可开启您的首次 8K 级大片渲染体验。
            </p>
            <Link to="/app" className="relative z-10 font-semibold bg-white text-black haute-subtitle text-sm lg:text-base px-14 py-5 hover:bg-[#C8855F] hover:text-white transition-colors inline-block shadow-2xl tracking-widest">
              立刻入局
            </Link>
          </motion.div>
        </section>
      </main>
      
      <footer className="border-t border-white/10 py-16 text-center mt-20">
        <div className="max-w-5xl mx-auto px-6 flex flex-col items-center gap-10">
          <div className="haute-title text-xl text-white">
            数字紫砂<span className="text-[#C8855F]">系统</span>
          </div>
          <div className="flex gap-10 haute-subtitle text-[11px] text-zinc-500">
            <span onClick={handleComingSoon} className="hover:text-white cursor-pointer transition-colors">隐私声明</span>
            <span onClick={handleComingSoon} className="hover:text-white cursor-pointer transition-colors">服务条款</span>
            <span onClick={handleComingSoon} className="hover:text-white cursor-pointer transition-colors">联络中心</span>
          </div>
          <p className="text-zinc-600 font-serif text-xs">© {new Date().getFullYear()} 数字紫砂系统. 版权所有.</p>
        </div>
      </footer>
    </div>
  );
}
