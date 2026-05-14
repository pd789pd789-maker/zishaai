import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db, storage } from '../lib/firebase';
import { collection, getDocs, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';
import { UploadCloud, Image as ImageIcon } from 'lucide-react';

export default function Admin() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [samples, setSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (profile?.role !== 'admin') return;
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        const txSnap = await getDocs(query(collection(db, 'transactions'), orderBy('createdAt', 'desc')));
        setTransactions(txSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const samplesSnap = await getDocs(query(collection(db, 'sampleImages'), orderBy('createdAt', 'desc')));
        setSamples(samplesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile]);

  const handleUploadSample = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploading(true);
    const toastId = toast.loading("上传样片中...");
    try {
      const storageRef = ref(storage, `samples/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      const newDoc = await addDoc(collection(db, 'sampleImages'), {
         url,
         category: 'style',
         uploaderId: profile?.uid,
         createdAt: serverTimestamp()
      });
      
      setSamples([{ id: newDoc.id, url, category: 'style', uploaderId: profile?.uid, createdAt: new Date() }, ...samples]);
      toast.success("样片上传成功", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "上传失败", { id: toastId });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (loading) return <div className="p-10 text-zinc-400">加载中...</div>;

  return (
    <div className="p-6 md:p-10 space-y-10">
      <h2 className="text-3xl font-serif text-[#C8855F]">管理后台</h2>
      
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">样片管理 (Sample Images)</h3>
          <label className="flex items-center gap-2 bg-[#C8855F] text-black px-4 py-2 rounded-xl cursor-pointer hover:bg-[#B5754F] transition-colors">
            <UploadCloud className="w-4 h-4" />
            <span className="font-bold">{uploading ? '上传中...' : '上传新样片'}</span>
            <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleUploadSample} />
          </label>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
           {samples.map(s => (
             <div key={s.id} className="relative aspect-square rounded-xl overflow-hidden bg-black border border-white/10 group">
                {s.url ? <img src={s.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform" /> : <ImageIcon className="w-8 h-8 m-auto text-zinc-600" />}
             </div>
           ))}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold mb-4">用户列表</h3>
        <div className="overflow-x-auto bg-[#0F0F0F] rounded-xl border border-white/5">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4">UID</th>
                <th className="px-6 py-4">邮箱</th>
                <th className="px-6 py-4">积分</th>
                <th className="px-6 py-4">角色</th>
                <th className="px-6 py-4">注册时间</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-6 py-4 font-mono text-xs">{u.uid}</td>
                  <td className="px-6 py-4">{u.email || '-'}</td>
                  <td className="px-6 py-4 text-[#C8855F]">{u.points}</td>
                  <td className="px-6 py-4">{u.role}</td>
                  <td className="px-6 py-4">{new Date(u.createdAt?.seconds * 1000 || Date.now()).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold mb-4">流水日志</h3>
        <div className="overflow-x-auto bg-[#0F0F0F] rounded-xl border border-white/5">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4">用户 ID</th>
                <th className="px-6 py-4">操作</th>
                <th className="px-6 py-4">积分变化</th>
                <th className="px-6 py-4">金额</th>
                <th className="px-6 py-4">描述</th>
                <th className="px-6 py-4">时间</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-6 py-4 font-mono text-xs">{t.userId}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] uppercase ${t.type === 'consume' ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold">{t.points > 0 ? '+' + t.points : t.points}</td>
                  <td className="px-6 py-4">¥{t.amount}</td>
                  <td className="px-6 py-4 text-zinc-400">{t.description}</td>
                  <td className="px-6 py-4">{new Date(t.createdAt?.seconds * 1000 || Date.now()).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
