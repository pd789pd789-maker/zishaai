import { Sidebar } from "./components/Sidebar";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import Generate from "./pages/Generate";
import MultiView from "./pages/MultiView";
import StyleTransfer from "./pages/StyleTransfer";
import LayoutCenter from "./pages/LayoutCenter";
import Batch from "./pages/Batch";
import Assets from "./pages/Assets";
import Landing from "./pages/Landing";
import Cases from "./pages/Cases";
import Login from "./pages/Login";
import Pricing from "./pages/Pricing";
import Admin from "./pages/Admin";

import { AIAssistant } from "./components/AIAssistant";
import { AuthProvider, useAuth } from "./lib/AuthContext";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0B0B0B]"><div className="w-8 h-8 border-2 border-[#C8855F] border-t-transparent rounded-full animate-spin"></div></div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { profile, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0B0B0B]"><div className="w-8 h-8 border-2 border-[#C8855F] border-t-transparent rounded-full animate-spin"></div></div>;
  if (!profile || profile.role !== 'admin') return <Navigate to="/app" />;
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster theme="dark" position="top-center" richColors />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/cases" element={<Cases />} />
          <Route path="/login" element={<Login />} />
          <Route path="/app/*" element={
            <ProtectedRoute>
              <div className="flex bg-[#0B0B0B] min-h-[100dvh] text-[#E5E7EB] font-sans selection:bg-[#C8855F] selection:text-white">
                <Sidebar />
                <main className="flex-1 h-[100dvh] overflow-y-auto overflow-x-hidden pt-14 md:pt-0 w-full relative">
                  <Routes>
                    <Route path="/" element={<Generate />} />
                    <Route path="multiview" element={<MultiView />} />
                    <Route path="style-transfer" element={<StyleTransfer />} />
                    <Route path="layout" element={<LayoutCenter />} />
                    <Route path="batch" element={<Batch />} />
                    <Route path="assets" element={<Assets />} />
                    <Route path="pricing" element={<Pricing />} />
                    <Route path="admin" element={<AdminRoute><Admin /></AdminRoute>} />
                  </Routes>
                  <AIAssistant />
                </main>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
