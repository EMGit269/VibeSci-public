'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { 
  FileUp, 
  Loader2, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Layers,
  Scissors,
  Tag
} from 'lucide-react';
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import * as mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';
import { cn } from '@/lib/utils';

// 配置 PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export function UploadKnowledgeDialog() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [knowledgeName, setKnowledgeName] = useState('');
  const [rawText, setRawText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // 切片设置
  const [chunkSize, setChunkSize] = useState(500);
  const [overlap, setOverlap] = useState(50);
  const [separator, setSeparator] = useState('\\n\\n'); // 默认按段落
  const [previewChunks, setPreviewChunks] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 当设置改变时重新计算切片
  useEffect(() => {
    if (rawText) {
      const chunks = sliceText(rawText, chunkSize, overlap, separator);
      setPreviewChunks(chunks);
    }
  }, [chunkSize, overlap, separator, rawText]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setKnowledgeName(selectedFile.name);
      extractText(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      const ext = droppedFile.name.split('.').pop()?.toLowerCase();
      if (['pdf', 'docx', 'md', 'txt'].includes(ext || '')) {
        setFile(droppedFile);
        setKnowledgeName(droppedFile.name);
        extractText(droppedFile);
      } else {
        toast({ title: '文件格式不支持', description: '仅支持 PDF, Word, Markdown 或文本文件。', variant: 'destructive' });
      }
    }
  };

  const extractText = async (selectedFile: File) => {
    setIsProcessing(true);
    try {
      let text = '';
      const extension = selectedFile.name.split('.').pop()?.toLowerCase();

      if (extension === 'md' || extension === 'txt') {
        text = await selectedFile.text();
      } else if (extension === 'docx') {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else if (extension === 'pdf') {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map((item: any) => item.str).join(' ') + '\n';
        }
        text = fullText;
      } else {
        throw new Error('不支持的文件格式');
      }

      setRawText(text);
    } catch (e: any) {
      toast({ title: '解析失败', description: e.message, variant: 'destructive' });
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const sliceText = (text: string, size: number, ov: number, sep: string) => {
    if (!text) return [];
    const actualSep = sep.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    const parts = actualSep ? text.split(actualSep) : [text];
    const finalChunks: string[] = [];
    let currentChunk = "";

    for (let part of parts) {
      const trimmedPart = part.trim();
      if (!trimmedPart) continue;

      if ((currentChunk.length + trimmedPart.length) <= size) {
        currentChunk += (currentChunk ? actualSep : "") + trimmedPart;
      } else {
        if (currentChunk) {
          finalChunks.push(currentChunk);
        }

        if (trimmedPart.length > size) {
          let start = 0;
          while (start < trimmedPart.length) {
            const end = Math.min(start + size, trimmedPart.length);
            finalChunks.push(trimmedPart.slice(start, end));
            start += (size - ov);
            if (size <= ov || start >= trimmedPart.length) break;
          }
          currentChunk = "";
        } else {
          currentChunk = trimmedPart;
        }
      }
    }

    if (currentChunk) {
      finalChunks.push(currentChunk);
    }

    return finalChunks;
  };

  const handleUpload = async () => {
    if (!user || !firestore || !file || previewChunks.length === 0) return;

    setIsUploading(true);
    try {
      const sourcesRef = collection(firestore, 'users', user.uid, 'knowledgeSources');
      const sourceDoc = await addDocumentNonBlocking(sourcesRef, {
        fileName: knowledgeName || file.name,
        fileType: file.name.split('.').pop() || 'unknown',
        totalChunks: previewChunks.length,
        createdAt: new Date().toISOString(),
      });

      if (sourceDoc) {
        const chunksRef = collection(firestore, 'users', user.uid, 'knowledgeSources', sourceDoc.id, 'chunks');
        for (let i = 0; i < previewChunks.length; i++) {
          addDocumentNonBlocking(chunksRef, {
            sourceId: sourceDoc.id,
            content: previewChunks[i],
            index: i,
            createdAt: new Date().toISOString(),
          });
        }
        
        toast({ title: '入库成功', description: `文档已切分为 ${previewChunks.length} 个知识块。` });
        setOpen(false);
        resetState();
      }
    } catch (e) {
      toast({ title: '上传失败', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setKnowledgeName('');
    setRawText('');
    setPreviewChunks([]);
    setChunkSize(500);
    setOverlap(50);
    setSeparator('\\n\\n');
    setIsDragging(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if(!v) resetState(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-9 gap-2 bg-gradient-to-r from-[#5F6AD1] to-[#C181F9] text-white border-none shadow-lg hover:opacity-90">
          <FileUp className="h-4 w-4" />
          知识录入
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-headline flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-600" />
            自定义知识解析
          </DialogTitle>
          <DialogDescription>
            支持高级切片策略。您可以根据文档结构自定义分隔符和最大长度以优化 AI 检索。
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!file ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-2xl py-12 flex flex-col items-center justify-center transition-all group cursor-pointer",
                isDragging 
                  ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20" 
                  : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10"
              )}
            >
              <FileUp className={cn(
                "h-12 w-12 mb-4 transition-colors",
                isDragging ? "text-indigo-500" : "text-slate-300 group-hover:text-indigo-500"
              )} />
              <p className={cn(
                "text-sm font-bold transition-colors",
                isDragging ? "text-indigo-600" : "text-slate-600 dark:text-slate-400"
              )}>
                {isDragging ? "松开文件立即解析" : "点击或拖拽文件上传"}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">支持 .pdf, .docx, .md, .txt</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".pdf,.docx,.md,.txt" 
                className="hidden" 
              />
            </div>
          ) : (
            <div className="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl p-4 flex items-center justify-between border border-indigo-100 dark:border-indigo-900/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white dark:bg-zinc-950 rounded-lg shadow-sm">
                  <FileText className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-bold truncate max-w-[200px]">{file.name}</p>
                  <p className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="text-xs text-slate-500 hover:text-destructive">更换文件</Button>
            </div>
          )}

          {file && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-500">
              {/* 高级设置面板 */}
              <div className="bg-card border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 space-y-6">
                {/* 知识源命名 */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Tag className="h-3 w-3" /> 知识源命名
                  </Label>
                  <Input 
                    placeholder="输入知识库显示名称" 
                    value={knowledgeName}
                    onChange={(e) => setKnowledgeName(e.target.value)}
                    className="h-10 bg-slate-50/50 border-slate-200 dark:bg-slate-900/50 dark:border-slate-700"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Scissors className="h-3 w-3" /> 自定义分隔符
                    </Label>
                    <span className="text-[10px] text-slate-400 italic">例如: \n\n (段落), . (句子)</span>
                  </div>
                  <Input 
                    placeholder="输入分隔符，留空则仅按长度切分" 
                    value={separator}
                    onChange={(e) => setSeparator(e.target.value)}
                    className="h-9 bg-slate-50/50 border-slate-200 dark:bg-slate-900/50 dark:border-slate-700 font-mono text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">最大切片大小</Label>
                      <span className="text-[10px] font-mono text-indigo-600 font-bold">{chunkSize} 字符</span>
                    </div>
                    <Slider 
                      value={[chunkSize]} 
                      min={100} max={2000} step={50} 
                      onValueChange={([v]) => setChunkSize(v)} 
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">重叠度 (Overlap)</Label>
                      <span className="text-[10px] font-mono text-indigo-600 font-bold">{overlap} 字符</span>
                    </div>
                    <Slider 
                      value={[overlap]} 
                      min={0} max={200} step={10} 
                      onValueChange={([v]) => setOverlap(v)} 
                    />
                  </div>
                </div>
              </div>

              {/* 预览区 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-indigo-600" />
                    切片预览 ({previewChunks.length} 个知识块)
                  </h3>
                </div>
                <div className="grid gap-3">
                  {isProcessing ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin mb-2" />
                      <span className="text-xs">正在分析文本结构...</span>
                    </div>
                  ) : previewChunks.length > 0 ? (
                    previewChunks.slice(0, 3).map((chunk, i) => (
                      <div key={i} className="group relative bg-slate-50 dark:bg-slate-900/30 rounded-xl p-4 border-2 border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/30 transition-all">
                        <span className="absolute -top-2 -left-2 bg-white dark:bg-zinc-950 border-2 border-slate-100 dark:border-slate-800 text-[8px] font-mono px-1.5 py-0.5 rounded-full text-slate-400">CHUNK #{i+1}</span>
                        <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 line-clamp-3 italic">
                          "{chunk}"
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400 border-2 border-dashed rounded-xl">
                      暂无切片内容
                    </div>
                  )}
                  {previewChunks.length > 3 && (
                    <p className="text-center text-[10px] text-slate-400 py-2">... 以及另外 {previewChunks.length - 3} 个切片</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-0">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isUploading}>取消</Button>
          <Button 
            onClick={handleUpload} 
            disabled={!file || isProcessing || isUploading || previewChunks.length === 0}
            className="px-8 shadow-xl bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isUploading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> 正在入库...</> : <><CheckCircle2 className="h-4 w-4 mr-2" /> 确认入库</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
