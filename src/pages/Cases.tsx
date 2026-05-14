import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const cases = [
  { img: "https://picsum.photos/id/1025/800/800", title: "阳羡春色", desc: "自然光影，适合带有茶盘的完整场景" },
  { img: "https://picsum.photos/id/106/800/800", title: "微距肌理", desc: "极致放大紫砂泥门，展现手工痕迹" },
  { img: "https://picsum.photos/id/175/800/800", title: "宋代极简", desc: "低保和度背景，凸显禅意" },
  { img: "https://picsum.photos/id/312/800/800", title: "侘寂原野", desc: "搭配枯木与夯土墙面，粗犷质感" },
  { img: "https://picsum.photos/id/42/800/800", title: "赛博朋克", desc: "突破传统，引入霓虹高光映射" },
  { img: "https://picsum.photos/id/431/800/800", title: "院线电影", desc: "伦勃朗单侧光，质感极强深邃迷人" },
  { img: "https://picsum.photos/id/436/800/800", title: "高定时尚", desc: "纯净背景与强几何空间光影" },
  { img: "https://picsum.photos/id/63/800/800", title: "博物馆聚光", desc: "顶部聚光，如同玻璃展柜中的国宝" },
];

export default function Cases() {
  return (
    <div className="bg-[#0B0B0B] min-h-screen text-[#E5E7EB] font-sans overflow-x-hidden selection:bg-[#C8855F] selection:text-white p-6 md:p-12">
      <Link to="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-12">
        <ArrowLeft className="w-4 h-4" /> 返回首页
      </Link>
      
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <h1 className="text-4xl md:text-5xl font-serif mb-4">精选渲染案例</h1>
        <p className="text-zinc-400 text-lg mb-12 max-w-2xl font-light">
          探索 Zisha.AI 为诸多大厂与独立艺术家渲染的高定商业视觉。覆盖多种质感需求，100% 由 AI 引擎从粗糙手机实拍直出。
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cases.map((c, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="group relative bg-[#0F0F0F] rounded-2xl overflow-hidden border border-white/5 hover:border-white/10 transition-colors"
          >
            <div className="aspect-square overflow-hidden relative">
              <img src={c.img} alt={c.title} className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300 p-2 bg-white/10 backdrop-blur rounded-full text-white">
                <ExternalLink className="w-4 h-4" />
              </div>
            </div>
            <div className="p-5">
              <h3 className="text-lg font-serif mb-2 group-hover:text-[#C8855F] transition-colors">{c.title}</h3>
              <p className="text-sm text-zinc-400 font-light">{c.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
