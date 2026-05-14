import { Link, useNavigate } from "react-router-dom";
import { useState, FormEvent, useEffect } from "react";
import { Coffee, ArrowRight, Loader2, Mail, Lock, Phone, MessageSquare } from "lucide-react";
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
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => {
           // reCAPTCHA solved
        }
      });
    }
  }, []);

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isPhoneAuth) {
        if (confirmationResult) {
          // Verify code
          const result = await confirmationResult.confirm(code);
          await ensureUserProfile(result.user.uid, result.user.phoneNumber || '');
          toast.success("登录成功！");
          navigate('/app');
        } else {
          // Send SMS
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

  const ensureUserProfile = async (uid: string, identifier: string) => {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid,
        email: identifier.includes('@') ? identifier : null,
        phoneNumber: identifier.includes('@') ? null : identifier,
        points: 100, // starting points
        role: 'user',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  };

  const handleWechatLogin = () => {
    toast.error("微信登录功能需要配置企业开放平台及有效域名，目前处于预览模式，暂不可用");
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans relative overflow-hidden">
      {/* Invisible Recaptcha */}
      <div id="recaptcha-container"></div>
      
      {/* Background Ornaments */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#C8855F]/20 blur-[120px] rounded-full pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white/5 blur-[100px] rounded-full pointer-events-none -translate-x-1/3 translate-y-1/3"></div>

      {/* Nav */}
      <nav className="relative z-10 px-8 py-6 flex items-center justify-between">
        <Link to="/" className="text-xl tracking-widest uppercase flex items-center gap-3 serif font-bold hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-sm bg-[#C8855F] flex items-center justify-center font-bold text-black font-sans">
            Z
          </div>
          <span className="flex items-center">
            Zisha<span className="text-[#C8855F]">.AI</span>
          </span>
        </Link>
        <Link to="/" className="text-sm text-zinc-400 hover:text-white transition-colors">
           返回主页
        </Link>
      </nav>

      {/* Main Form */}
      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-[#111111] border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C8855F]/0 via-[#C8855F] to-[#C8855F]/0"></div>
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-serif mb-2">{isPhoneAuth ? "手机号安全登录" : (isRegister ? "创建您的工作账户" : "登录您的工作空间")}</h1>
            <p className="text-zinc-500 text-sm">Zisha.AI 专业版渲染集群</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
             <button 
                type="button"
                onClick={() => setIsPhoneAuth(false)}
                className={`py-2.5 rounded-lg text-sm transition-colors border ${!isPhoneAuth ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-zinc-500 hover:text-white'}`}
             >账号密码</button>
             <button 
                type="button" 
                onClick={() => setIsPhoneAuth(true)}
                className={`py-2.5 rounded-lg text-sm transition-colors border ${isPhoneAuth ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-zinc-500 hover:text-white'}`}
             >手机号验证码</button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <AnimatePresence mode="popLayout">
              {isPhoneAuth ? (
                <motion.div key="phone-auth" initial={{ opacity: 0, x:-20}} animate={{opacity: 1, x:0}} exit={{opacity:0, x:20}} className="space-y-4">
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input 
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="请输入手机号码" 
                      className="w-full bg-black border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#C8855F] transition-colors"
                      required
                      disabled={!!confirmationResult}
                    />
                  </div>
                  {confirmationResult && (
                    <div className="relative">
                       <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                       <input 
                         type="text"
                         value={code}
                         onChange={(e) => setCode(e.target.value)}
                         placeholder="请输入短信验证码" 
                         className="w-full bg-black border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#C8855F] transition-colors"
                         required
                       />
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="email-auth" initial={{ opacity: 0, x:-20}} animate={{opacity: 1, x:0}} exit={{opacity:0, x:20}} className="space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                      <input 
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="工作邮箱" 
                        className="w-full bg-black border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#C8855F] transition-colors"
                        required
                      />
                    </div>
                    
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                      <input 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="密码" 
                        className="w-full bg-black border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#C8855F] transition-colors"
                        required
                      />
                    </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-zinc-200 transition-colors mt-2 flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isPhoneAuth && !confirmationResult ? "获取验证码" : (isRegister && !isPhoneAuth ? '注册账号并登录' : '登 录')}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {!isPhoneAuth && (
            <div className="mt-6 text-center text-sm text-zinc-500">
              {isRegister ? "已有账号？" : "没有账号？"}
              <button onClick={() => setIsRegister(!isRegister)} className="text-[#C8855F] hover:text-[#B5754F] ml-2 transition-colors">
                {isRegister ? "去登录" : "快速注册"}
              </button>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="text-center text-sm text-zinc-500 mb-4 tracking-wide font-light">
               或者使用其他方式
            </div>
            <button 
              type="button" 
              onClick={handleWechatLogin}
              className="w-full bg-[#07C160]/10 text-[#07C160] border border-[#07C160]/30 hover:bg-[#07C160]/20 font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              微信快捷登录
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
