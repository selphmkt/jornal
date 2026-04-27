import { useState, useRef, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, CheckCircle2, AlertCircle, Download, 
  Hourglass, Moon, Sun, Image, Layout, Settings, History 
} from "lucide-react";

interface ProgressData {
  total: number;
  processed: number;
  percentage: number;
  currentCard: string;
}

export default function CardGenerator() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [zipPath, setZipPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [isDark, setIsDark] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [originalFileName, setOriginalFileName] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [, setLocation] = useLocation();

  const generateCardsMutation = trpc.card.generateCards.useMutation();

  useEffect(() => {
    const socket = io({ reconnection: true });
    socket.on("connect", () => { socket.emit("join", sessionId); });
    socket.on("progress", (data: ProgressData) => setProgress(data));
    socket.on("error", (message: string) => { setError(message); setIsProcessing(false); });
    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, [sessionId]);

  // --- Lógica de Estilo (Inspirado no GitHub) ---
  const colors = {
    bg: isDark ? "bg-[#0d1117]" : "bg-[#f6f8fa]",
    sidebar: isDark ? "bg-[#010409] border-[#30363d]" : "bg-[#ffffff] border-[#d0d7de]",
    card: isDark ? "bg-[#161b22] border-[#30363d]" : "bg-[#ffffff] border-[#d0d7de]",
    textMain: isDark ? "text-[#c9d1d9]" : "text-[#24292f]",
    textHeading: isDark ? "text-[#f0f6fc]" : "text-[#1f2328]",
    accent: "bg-[#238636] hover:bg-[#2ea043]", // Verde padrão "New Project" do GitHub
    blue: "text-[#58a6ff]"
  };

  const handleFileSelect = (selectedFile: File | null | undefined) => {
    if (!selectedFile) return;
    if (!selectedFile.name.endsWith(".xlsx")) { setError("Por favor, selecione um arquivo .xlsx"); return; }
    setFile(selectedFile);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadResponse = await fetch("/api/upload", { method: "POST", body: formData });
      const { filePath, fileName } = await uploadResponse.json();
      const result = await generateCardsMutation.mutateAsync({ filePath, sessionId, originalFileName: fileName });
      if (result.success) setZipPath(result.zipPath);
    } catch (err) {
      setError("Erro ao processar arquivo");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`flex min-h-screen ${colors.bg} ${colors.textMain} transition-all`}>
      
      {/* Sidebar - Similar à do GitHub */}
      <aside className={`w-64 border-r hidden md:flex flex-col ${colors.sidebar}`}>
        <div className="p-4 flex items-center space-x-2 border-b border-inherit">
          <Layout className={colors.blue} />
          <span className="font-bold">Cards Dashboard</span>
        </div>
        <nav className="p-4 space-y-2 flex-grow">
          <div className={`flex items-center space-x-3 p-2 rounded-md ${isDark ? 'bg-[#1f6feb]/10 text-[#58a6ff]' : 'bg-[#0969da]/10 text-[#0969da]'}`}>
            <History size={18} /> <span>Recentes</span>
          </div>
          <div onClick={() => setLocation("/logos")} className="flex items-center space-x-3 p-2 rounded-md hover:bg-white/5 cursor-pointer">
            <Image size={18} /> <span>Logos</span>
          </div>
          <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-white/5 cursor-pointer">
            <Settings size={18} /> <span>Configurações</span>
          </div>
        </nav>
        <div className="p-4 border-t border-inherit">
          <button onClick={() => setIsDark(!isDark)} className="flex items-center space-x-2 text-xs">
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
            <span>Trocar Tema</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <header className="max-w-4xl mx-auto flex justify-between items-center mb-8">
          <h1 className={`text-xl font-semibold ${colors.textHeading}`}>Início</h1>
        </header>

        <div className="max-w-4xl mx-auto">
          <div className={`${colors.card} border rounded-md p-8 shadow-sm`}>
            
            {!isProcessing && !zipPath && (
              <div className="space-y-6">
                <div>
                  <h2 className={`text-2xl font-bold ${colors.textHeading}`}>Gerar novos cards</h2>
                  <p className="text-sm opacity-70">Carregue sua planilha .xlsx para iniciar o Puppeteer</p>
                </div>

                <div 
                  onClick={() => document.getElementById("file-input")?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileSelect(e.dataTransfer.files[0]); }}
                  className={`border-2 border-dashed rounded-md p-10 text-center cursor-pointer transition-all ${
                    isDragging ? 'border-[#58a6ff] bg-[#58a6ff]/5' : colors.card.split(' ')[1]
                  }`}
                >
                  <Upload className={`mx-auto mb-4 ${colors.blue}`} size={32} />
                  <p className="font-medium">Arraste ou clique para selecionar a planilha</p>
                  <input id="file-input" type="file" accept=".xlsx" onChange={(e) => handleFileSelect(e.target.files?.[0])} className="hidden" />
                </div>

                {file && (
                  <div className={`p-3 rounded border flex justify-between items-center ${isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]'}`}>
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 size={16} className="text-[#3fb950]" />
                      <span className="text-sm font-mono">{file.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setFile(null)}>Remover</Button>
                  </div>
                )}

                <Button 
                  onClick={handleUpload} 
                  disabled={!file} 
                  className={`w-full text-white font-bold h-12 ${colors.accent}`}
                >
                  Iniciar Automação
                </Button>
              </div>
            )}

            {isProcessing && progress && (
              <div className="py-10 space-y-6">
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="font-bold">Processando...</h3>
                    <p className="text-sm opacity-60">{progress.currentCard}</p>
                  </div>
                  <span className="text-xs font-mono">{progress.percentage}%</span>
                </div>
                <div className={`w-full h-2 rounded-full ${isDark ? 'bg-[#30363d]' : 'bg-[#d0d7de]'}`}>
                  <div className="h-full bg-[#2f81f7] rounded-full transition-all duration-300" style={{ width: `${progress.percentage}%` }} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <StatBox label="Concluídos" value={progress.processed} isDark={isDark} />
                  <StatBox label="Total" value={progress.total} isDark={isDark} />
                  <StatBox label="Restantes" value={progress.total - progress.processed} isDark={isDark} />
                </div>
              </div>
            )}

            {zipPath && (
              <div className="text-center py-10 space-y-6">
                <div className="bg-[#238636]/10 p-4 rounded-full inline-block">
                  <Download className="text-[#3fb950]" size={40} />
                </div>
                <h2 className="text-2xl font-bold">Arquivo pronto!</h2>
                <Button onClick={() => window.open(`/api/download?zipPath=${zipPath}`)} className={`w-full h-12 ${colors.accent}`}>
                  Baixar Pacote ZIP
                </Button>
                <Button variant="link" onClick={() => {setZipPath(null); setFile(null);}} className={colors.blue}>
                  Gerar mais cards
                </Button>
              </div>
            )}

          </div>
          
          <footer className="mt-8 text-center text-xs opacity-50">
            Esio Lima • Design & Code • v2.3.1
          </footer>
        </div>
      </main>
    </div>
  );
}

function StatBox({ label, value, isDark }: { label: string, value: number, isDark: boolean }) {
  return (
    <div className={`p-4 border rounded-md text-center ${isDark ? 'bg-[#0d1117] border-[#30363d]' : 'bg-[#f6f8fa] border-[#d0d7de]'}`}>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] uppercase opacity-60 tracking-wider">{label}</div>
    </div>
  );
}
