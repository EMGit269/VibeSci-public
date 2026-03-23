
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Network, 
  Search, 
  Filter, 
  Database, 
  FileText,
  MessageSquareShare,
  Loader2,
  ChevronRight,
  Trash2,
  Sparkles,
  Layers,
  Activity,
  GitBranch,
  Circle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UploadKnowledgeDialog } from '@/components/upload-knowledge-dialog';
import { useUser, useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc, getDocs } from 'firebase/firestore';
import type { KnowledgeSource, KnowledgeChunk, KnowledgeGraphData } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { extractKnowledgeGraphAction } from '@/app/actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// 可视化辅助函数：计算圆周布局位置
const calculateNodePositions = (nodes: any[], width: number, height: number) => {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 3;
  
  return nodes.map((node, index) => {
    const angle = (index / nodes.length) * 2 * Math.PI;
    return {
      ...node,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });
};

export default function KnowledgePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAnalyzingGraph, setIsAnalyzingGraph] = useState(false);

  // 1. 获取知识源列表
  const sourcesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'users', user.uid, 'knowledgeSources'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user?.uid]);

  const { data: sources, isLoading: isSourcesLoading } = useCollection<KnowledgeSource>(sourcesQuery);

  // 2. 获取选中源的切片列表
  const chunksQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid || !selectedSourceId) return null;
    return query(
      collection(firestore, 'users', user.uid, 'knowledgeSources', selectedSourceId, 'chunks'),
      orderBy('index', 'asc')
    );
  }, [firestore, user?.uid, selectedSourceId]);

  const { data: chunks, isLoading: isChunksLoading } = useCollection<KnowledgeChunk>(chunksQuery);

  const filteredSources = (sources || []).filter(s => 
    s.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedSource = sources?.find(s => s.id === selectedSourceId);

  const graphDataWithPositions = useMemo(() => {
    if (!selectedSource?.graphData) return null;
    const { nodes, edges } = selectedSource.graphData;
    const positionedNodes = calculateNodePositions(nodes, 800, 500);
    return { nodes: positionedNodes, edges };
  }, [selectedSource]);

  const handleAskSai = (source: KnowledgeSource) => {
    router.push(`/dashboard/chat?sourceId=${source.id}&sourceName=${encodeURIComponent(source.fileName)}`);
  };

  const handleAnalyzeGraph = async () => {
    if (!user || !firestore || !selectedSourceId || !chunks || chunks.length === 0) return;
    
    setIsAnalyzingGraph(true);
    try {
      // 提取前 10 个切片的文本作为 AI 分析背景，防止 token 超限
      const sampledText = chunks.slice(0, 10).map(c => c.content).join('\n\n');
      const response = await extractKnowledgeGraphAction(sampledText);
      
      if (response.success && response.data) {
        const sourceRef = doc(firestore, 'users', user.uid, 'knowledgeSources', selectedSourceId);
        updateDocumentNonBlocking(sourceRef, { graphData: response.data });
        toast({ title: "图谱已生成", description: "AI 已成功提取知识关联结构。" });
      } else {
        throw new Error(response.error);
      }
    } catch (e) {
      toast({ title: "生成失败", description: "无法提取知识图谱，请稍后再试。", variant: "destructive" });
    } finally {
      setIsAnalyzingGraph(false);
    }
  };

  const handleDeleteSource = async () => {
    if (!user || !firestore || !selectedSourceId) return;
    
    setIsDeleting(true);
    try {
      const chunksRef = collection(firestore, 'users', user.uid, 'knowledgeSources', selectedSourceId, 'chunks');
      const chunksSnap = await getDocs(chunksRef);
      for (const chunkDoc of chunksSnap.docs) {
        deleteDocumentNonBlocking(doc(firestore, 'users', user.uid, 'knowledgeSources', selectedSourceId, 'chunks', chunkDoc.id));
      }

      const sourceRef = doc(firestore, 'users', user.uid, 'knowledgeSources', selectedSourceId);
      deleteDocumentNonBlocking(sourceRef);

      toast({ title: "删除成功", description: "该知识源及其切片已永久移除。" });
      setSelectedSourceId(null);
    } catch (e) {
      toast({ title: "删除失败", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6 bg-card -m-8 lg:-m-12 p-8 lg:p-12 mb-8 transition-colors">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <Network className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Scientific Atlas</span>
          </div>
          <h1 className="text-4xl font-headline font-bold tracking-tight">知识图谱</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            可视化您的科研体系。通过小塞自动提取并关联各项目中的核心概念、文献与实验结论。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <Filter className="h-4 w-4" />
            筛选
          </Button>
          <UploadKnowledgeDialog />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-8 items-start">
        <div className="space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="搜索文档..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 border-2 border-slate-100 dark:border-slate-800 focus-visible:ring-indigo-100 bg-card"
            />
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">已录入知识源</h3>
            <ScrollArea className="h-[600px] pr-4">
              {isSourcesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : filteredSources.length > 0 ? (
                <div className="space-y-3">
                  {filteredSources.map((source) => (
                    <Card 
                      key={source.id} 
                      onClick={() => setSelectedSourceId(source.id)}
                      className={cn(
                        "group border-2 transition-all cursor-pointer shadow-none bg-card overflow-hidden relative",
                        selectedSourceId === source.id 
                          ? "border-indigo-600 ring-1 ring-indigo-600" 
                          : "border-slate-50 dark:border-slate-900 hover:border-indigo-100 dark:hover:border-indigo-900/30"
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-lg",
                              selectedSourceId === source.id ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20"
                            )}>
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold truncate max-w-[180px]">{source.fileName}</h4>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {source.fileType.toUpperCase()} • {source.totalChunks} 个切片
                              </p>
                            </div>
                          </div>
                          <ChevronRight className={cn(
                            "h-4 w-4 transition-transform",
                            selectedSourceId === source.id ? "translate-x-1 text-indigo-600" : "text-slate-300"
                          )} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 border-2 border-dashed rounded-2xl">
                  <Database className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">暂无知识文档</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <div className="space-y-6 min-w-0">
          {selectedSource ? (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <Card className="border-2 border-indigo-100 dark:border-indigo-900/30 overflow-hidden">
                <CardHeader className="bg-indigo-50/30 dark:bg-indigo-900/10 flex flex-row items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-zinc-950 rounded-lg shadow-sm border">
                      <Layers className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-headline">{selectedSource.fileName}</CardTitle>
                      <p className="text-xs text-muted-foreground">最后更新：{new Date(selectedSource.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="icon" className="text-slate-400 hover:text-destructive hover:bg-destructive/10 border-slate-200 h-9 w-9">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>确认删除此知识库？</AlertDialogTitle>
                          <AlertDialogDescription>
                            此操作将永久移除《{selectedSource.fileName}》及其下所有文本切片。该过程无法撤销。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleDeleteSource} 
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isDeleting}
                          >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                            确认删除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button 
                      variant="outline"
                      onClick={handleAnalyzeGraph}
                      disabled={isAnalyzingGraph || isChunksLoading}
                      className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                    >
                      {isAnalyzingGraph ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      {selectedSource.graphData ? "重新生成图谱" : "生成知识图谱"}
                    </Button>
                    <Button 
                      onClick={() => handleAskSai(selectedSource)}
                      className="bg-gradient-to-r from-[#5F6AD1] to-[#C181F9] text-white shadow-lg border-none hover:scale-105 transition-transform"
                    >
                      <MessageSquareShare className="h-4 w-4 mr-2" />
                      与小塞深度对话
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="relative h-[500px] w-full bg-slate-50/50 dark:bg-slate-950/20 overflow-hidden border-t">
                    {selectedSource.graphData && graphDataWithPositions ? (
                      <svg width="100%" height="100%" viewBox="0 0 800 500" className="absolute inset-0">
                        {/* 连线层 */}
                        <g>
                          {graphDataWithPositions.edges.map((edge, idx) => {
                            const sourceNode = graphDataWithPositions.nodes.find(n => n.id === edge.source);
                            const targetNode = graphDataWithPositions.nodes.find(n => n.id === edge.target);
                            if (!sourceNode || !targetNode) return null;
                            return (
                              <line 
                                key={`edge-${idx}`}
                                x1={sourceNode.x} y1={sourceNode.y}
                                x2={targetNode.x} y2={targetNode.y}
                                stroke="hsl(var(--primary))"
                                strokeWidth="1"
                                strokeDasharray="4 2"
                                opacity="0.2"
                              />
                            );
                          })}
                        </g>
                        {/* 节点层 */}
                        <g>
                          {graphDataWithPositions.nodes.map((node, idx) => (
                            <g key={`node-${idx}`} transform={`translate(${node.x}, ${node.y})`}>
                              <circle 
                                r="12" 
                                className={cn(
                                  "fill-white stroke-2 shadow-sm",
                                  node.type === 'Concept' ? "stroke-indigo-500" : 
                                  node.type === 'Method' ? "stroke-emerald-500" : 
                                  "stroke-orange-500"
                                )} 
                              />
                              <text 
                                dy="25" 
                                textAnchor="middle" 
                                className="text-[10px] font-bold fill-slate-600 dark:fill-slate-400 select-none"
                              >
                                {node.label}
                              </text>
                              <circle 
                                r="4" 
                                className={cn(
                                  node.type === 'Concept' ? "fill-indigo-500" : 
                                  node.type === 'Method' ? "fill-emerald-500" : 
                                  "fill-orange-500"
                                )} 
                              />
                            </g>
                          ))}
                        </g>
                      </svg>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
                        <div className="relative mb-4">
                          <Activity className="h-12 w-12 text-slate-200 animate-pulse" />
                          <GitBranch className="h-6 w-6 text-indigo-400 absolute -bottom-1 -right-1" />
                        </div>
                        <p className="text-sm font-bold text-slate-400">暂无图谱数据</p>
                        <p className="text-xs text-slate-400 max-w-xs mt-1">点击上方“生成知识图谱”按钮，AI 将分析该文档并提取核心概念关联图。</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 flex items-center gap-2">
                  <Sparkles className="h-3 w-3 text-indigo-600" />
                  知识溯源：切片预览
                </h3>
                {isChunksLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <p className="text-sm">正在加载知识切片...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {chunks?.map((chunk) => (
                      <Card key={chunk.id} className="border-2 border-slate-50 dark:border-slate-900 bg-card/50 hover:bg-card transition-colors relative group">
                        <span className="absolute top-3 right-3 bg-indigo-50 dark:bg-indigo-900/30 text-[8px] font-mono px-1.5 py-0.5 rounded text-indigo-600">
                          #{chunk.index + 1}
                        </span>
                        <CardContent className="p-5 pt-8">
                          <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 italic line-clamp-6">
                            "{chunk.content}"
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Card className="h-[600px] border-2 border-slate-100 dark:border-slate-800 shadow-none overflow-hidden relative flex flex-col items-center justify-center text-center p-12">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-indigo-100 blur-3xl opacity-20 rounded-full animate-pulse" />
                <Network className="h-20 w-20 text-indigo-600 relative z-10 opacity-40" />
              </div>
              <h2 className="text-2xl font-headline font-bold text-slate-800 dark:text-slate-200">科学知识图谱</h2>
              <p className="text-muted-foreground text-sm max-w-md mt-2">
                请从左侧选择一个知识源查看切片详情，或者上传新的文献、实验报告来扩充您的小塞大脑。
              </p>
              <div className="mt-8 flex gap-4">
                <UploadKnowledgeDialog />
                <Button variant="outline" className="h-9 border-2" onClick={() => router.push('/dashboard/chat')}>
                  直接去提问
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
