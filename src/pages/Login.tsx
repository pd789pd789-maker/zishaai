import { Link } from "react-router-dom";
import { useState, FormEvent } from "react";
import { ArrowRight, KeyRound } from "lucide-react";
import { motion } from "framer-motion";
import { signInAnonymously } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { auth, db } from "../lib/firebase";

export default function Login() {
  const [betaCode, setBetaCode] = useState("");

  const handleBetaLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (betaCode !== "888888") {
      toast.error("内测码错误");
      return;
    }
    try {
      // Sign in anonymously so Firebase Auth has a valid user
      const result = await signInAnonymously(auth);

      // Create user profile
      const userRef = doc(db, 'users', result.user.uid);
      await setDoc(userRef, {
        uid: result.user.uid,
        email: null,
        phoneNumber: null,
        points: 99999,
        role: 'user',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      toast.success("正在进入工作台...");
      window.location.href = '/app';
    } catch (err: any) {
      toast.error(err.message || "登录失败");
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#C8855F]/20 blur-[120px] rounded-full pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white/5 blur-[100px] rounded-full pointer-events-none -translate-x-1/3 translate-y-1/3"></div>

      <nav className="relative z-10 px-8 py-6 flex items-center justify-between">
        <Link to="/" className="text-xl tracking-widest uppercase flex items-center gap-3 serif font-bold hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-sm bg-[#C8855F] flex items-center justify-center font-bold text-black font-sans">Z</div>
          <span className="flex items-center">Zisha<span className="text-[#C8855F]">.AI</span></span>
        </Link>
        <Link to="/" className="text-sm text-zinc-400 hover:text-white transition-colors">返回主页</Link>
      </nav>

      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-[#111111] border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C8855F]/0 via-[#C8855F] to-[#C8855F]/0"></div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-serif mb-2">Zisha.AI 工作台</h1>
            <p className="text-zinc-500 text-sm">输入内测码即可进入</p>
          </div>

          <form onSubmit={handleBetaLogin} className="space-y-4">
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="password"
                value={betaCode}
                onChange={(e) => setBetaCode(e.target.value)}
                placeholder="请输入内测码"
                className="w-full bg-black border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#C8855F] transition-colors"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#C8855F] text-black font-bold py-3.5 rounded-xl hover:bg-[#B5754F] transition-colors flex items-center justify-center gap-2 group"
            >
              进入工作台
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}