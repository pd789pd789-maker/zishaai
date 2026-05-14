import { motion } from "framer-motion";
import { Check, Zap, Crown, CheckCircle2, Coins, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../lib/AuthContext";
import { auth } from "../lib/firebase";
import { useState } from "react";

export default function Pricing() {
  const { profile, refreshProfile } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleCheckout = async (planName: string, amount: number, points: number) => {
    if (!profile) {
      toast.error("请先登录");
      return;
    }
    
    setLoadingPlan(planName);
    try {
      const idToken = auth.currentUser?.getIdToken() || localStorage.getItem('beta_id_token');
      if (!idToken) throw new Error("Authentication error");

      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ amount, points, description: planName })
      });
      
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);

      if (data.mock) {
        toast.success(data.message || "模拟支付成功");
        await refreshProfile(); // Refresh points
      } else if (data.url) {
        window.location.href = data.url; // Redirect to Alipay
      }
    } catch (e: any) {
      toast.error(e.message || "发起支付失败");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="p-4 md:p-10 h-full flex flex-col">
      <header className="mb-10 shrink-0 text-center max-w-3xl mx-auto px-4 md:px-0">
        <h2 className="text-3xl font-light tracking-wide serif mb-4">算力充值与订阅方案</h2>
        <p className="text-zinc-400 text-sm tracking-wide font-light flex flex-col gap-1 mt-2">
          <span>单次渲染消耗：4K 扣除 10 积分，2K 扣除 8 积分，1K 扣除 6 积分。</span>
          <span>充值积分不过期，订阅会员享超额折扣及专属高定特权。</span>
        </p>
        {profile && (
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#C8855F]/30 bg-[#C8855F]/10">
            <span className="text-zinc-400 text-sm">当前算力余额：</span>
            <span className="text-xl font-bold text-[#C8855F] font-mono">{profile.points}</span>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
        <div className="max-w-6xl mx-auto">
          {/* Credits Top-up */}
          <div className="mb-16">
            <div className="flex items-center gap-2 mb-6">
              <Coins className="w-5 h-5 text-[#C8855F]" />
              <h3 className="text-xl font-serif">单次算力充值</h3>
              <span className="ml-4 text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded-full">基础比例: 1元 = 10积分</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { rmb: 50, credits: 500, extra: 0 },
                { rmb: 100, credits: 1000, extra: 150 },
                { rmb: 300, credits: 3000, extra: 600 },
                { rmb: 500, credits: 5000, extra: 1500, hot: true },
              ].map((pkt, i) => {
                const planName = `${pkt.rmb}元充值包`;
                const isExecuting = loadingPlan === planName;
                return (
                  <div key={i} onClick={() => !isExecuting && handleCheckout(planName, pkt.rmb, pkt.credits + pkt.extra)} className={`relative p-5 rounded-2xl border cursor-pointer transition-all hover:-translate-y-1 ${pkt.hot ? 'bg-[#C8855F]/10 border-[#C8855F]/50 ring-1 ring-[#C8855F]/20' : 'bg-[#0F0F0F] border-white/5 hover:border-zinc-500'} ${isExecuting ? 'opacity-50 pointer-events-none' : ''}`}>
                    {pkt.hot && <span className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 bg-[#C8855F] text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">热销</span>}
                    <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400 mb-1 flex items-center justify-between">
                      <div>
                        {pkt.credits + pkt.extra} <span className="text-sm font-normal text-zinc-500">积分</span>
                      </div>
                      {isExecuting && <Loader2 className="w-4 h-4 animate-spin text-[#C8855F]" />}
                    </div>
                    {pkt.extra > 0 && <div className="text-[10px] text-[#C8855F] mb-4">含额外赠送 {pkt.extra} 积分</div>}
                    {pkt.extra === 0 && <div className="text-[10px] text-transparent mb-4">.</div>}
                    
                    <div className="flex justify-between items-end mt-4">
                       <span className="text-xl text-white">¥{pkt.rmb}</span>
                       <span className="text-[10px] text-zinc-500 line-through">¥{(pkt.credits + pkt.extra)/10}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Memberships */}
          <div className="flex items-center gap-2 mb-6">
            <Crown className="w-5 h-5 text-[#C8855F]" />
            <h3 className="text-xl font-serif">工作室畅享订阅</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Monthly Plan */}
            <div className="bg-[#0F0F0F] border border-white/5 rounded-3xl p-8 flex flex-col relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
              
              <h3 className="text-2xl font-serif mb-2">专业版 月度会员</h3>
              <p className="text-sm text-zinc-400 mb-6">适合接单初创期工作室，灵活控制成本</p>
              
              <div className="mb-8">
                <span className="text-4xl font-bold">¥198</span>
                <span className="text-zinc-500"> / 月</span>
              </div>
              
              <ul className="space-y-4 mb-10 flex-1">
                {[
                  "每月 2180 积分 (最多可生成363张图)",
                  "解锁全部 20+ 款顶级高定风格",
                  "极速出图排队优先权",
                  "去除生成图片水印",
                  "专属 1V1 技术支持"
                ].map((ft, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                    <CheckCircle2 className="w-5 h-5 text-white/50 shrink-0" />
                    <span>{ft}</span>
                  </li>
                ))}
              </ul>
              
              <button 
                disabled={loadingPlan === "专业版 月度会员"}
                onClick={() => handleCheckout("专业版 月度会员", 198, 2180)} 
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold bg-[#161616] text-white border border-white/10 hover:bg-white hover:text-black transition-colors disabled:opacity-50"
              >
                {loadingPlan === "专业版 月度会员" && <Loader2 className="w-4 h-4 animate-spin" />}
                订阅月度方案
              </button>
            </div>

            {/* Yearly Plan */}
            <div className="bg-gradient-to-b from-[#18120F] to-[#0B0A09] border border-[#C8855F]/30 rounded-3xl p-8 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#C8855F] text-black text-xs font-bold px-4 py-1.5 rounded-bl-xl z-20">立省 35%</div>
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#C8855F]/20 blur-3xl rounded-full translate-x-1/2 translate-y-1/2"></div>
              
              <div className="relative z-10">
                <h3 className="text-2xl font-serif mb-2 text-[#C8855F]">旗舰版 年度会员</h3>
                <p className="text-sm text-zinc-400 mb-6">适合成熟品牌与高产出窑口，将出片成本压至极致</p>
                
                <div className="mb-8">
                  <span className="text-4xl font-bold">¥1980</span>
                  <span className="text-zinc-500"> / 年</span>
                </div>
                
                <ul className="space-y-4 mb-10 flex-1">
                  {[
                    "每月 2280 积分 (全年最多生成4560张图)",
                    "所有 20+ 款顶级高定风格",
                    "专属企业品牌私有化水印集成",
                    "至尊 VIP 通道无排队直接并发渲染",
                    "批量流水线模块无限制使用",
                    "定期新品首发风格抢先体验"
                  ].map((ft, i) => (
                     <li key={i} className="flex items-start gap-3 text-sm text-zinc-200">
                      <CheckCircle2 className="w-5 h-5 text-[#C8855F] shrink-0" />
                      <span>{ft}</span>
                    </li>
                  ))}
                </ul>
                
                <button 
                  disabled={loadingPlan === "旗舰版 年度会员"}
                  onClick={() => handleCheckout("旗舰版 年度会员", 1980, 2280 * 12)} 
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold bg-[#C8855F] text-black hover:bg-[#B5754F] transition-colors shadow-lg shadow-[#C8855F]/20 disabled:opacity-50"
                >
                  {loadingPlan === "旗舰版 年度会员" && <Loader2 className="w-4 h-4 animate-spin text-black" />}
                  订阅年度大满贯
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
