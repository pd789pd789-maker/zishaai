import { Link, useNavigate } from "react-router-dom";
import { useState, FormEvent, useEffect } from "react";
import { ArrowRight, Loader2, Mail, Lock, Phone, MessageSquare, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "../lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";

declare global {
  interface Window { recaptchaVerifier: any; }
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [isPhoneAuth, setIsPhoneAuth] = useState(false);
  const [betaCode, setBetaCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    // Check if beta mode was activated via localStorage
    if (localStorage.getItem('beta_access') === 'true') {
      localStorage.removeItem('beta_access');
      window.location.href = '/app';
    }
  }, []);

  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => {}
      });
    }
  }, []);

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isPhoneAuth) {
        if (confirmationResult) {
          const result = await confirmationResult.confirm(code);
          await ensureUserProfile(result.user.uid, result.user.phoneNumber || '');
          toast.success("登录成功！");
          navigate('/app');
        } else {
          const appVerifier = window.recaptchaVerifier;
          const formattedPhone = phone.startsWith('+') ? phone : `+86${phone}`;
          const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
          setConfirmationResult(result);
          toast.success("验证码已发送至您的手机");
        }
      } else {
        if (isRegister) {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          await ensureUserProfile(userCredential.user.uid, email);
          toast.success("注册成功！");
        } else {
          await signInWithEmailAndPassword(auth, email, password);
          toast.success("登录成功！");
        }
        navigate('/app');
      }
    } catch (err: any) {
      toast.error(err.message || "操作失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleBetaLogin = (e: FormEvent) => {
    e.preventDefault();
    if (betaCode === "888888") {
      localStorage.setItem('beta_access', 'true');
      toast.success("正在进入工作台...");
      window.location.href = '/app';
    } else {
      toast.error("内测码错误");
    }
  };

  const ensureUserProfile = async (uid: string, identifier: string) => {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid,
        email: identifier.includes('@') ? identifier : null,
        phoneNumber: identifier.includes('@') ? null : identifier,
        points: 100,
        role: 'user',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans relative overflow-hidden">
      <div id="recaptcha-container"></div>
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