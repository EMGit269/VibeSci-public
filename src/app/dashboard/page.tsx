'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, Code, Wrench, BookMarked, MoreHorizontal, FileText, Edit2, Share2, Sparkles } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Project } from '@/lib/types';
import { format, startOfMonth, endOfMonth, getDaysInMonth, isBefore, isAfter, getDate } from 'date-fns';

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  // 获取最近的项目用于展示
  const projectsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'users', user.uid, 'projects'),
      orderBy('createdAt', 'desc'),
      limit(2)
    );
  }, [firestore, user?.uid]);

  const ganttQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'users', user.uid, 'projects'),
      orderBy('createdAt', 'desc'),
      limit(6)
    );
  }, [firestore, user?.uid]);

  const { data: recentProjects } = useCollection<Project>(projectsQuery);
  const { data: ganttProjects } = useCollection<Project>(ganttQuery);

  // 计算当月甘特图数据
  const { chartData, dateLabels, currentMonthName } = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const totalDays = getDaysInMonth(now);
    const monthName = format(now, 'MMMM yyyy');

    // 生成底部的日期标签 (1, 5, 10, 15, 20, 25, 及其最后一天)
    const labels = [1, 5, 10, 15, 20, 25, totalDays];

    if (!ganttProjects) return { chartData: [], dateLabels: labels, currentMonthName: monthName };

    const data = ganttProjects
      .filter(proj => {
        const d = new Date(proj.createdAt);
        return !isAfter(d, monthEnd); // 排除未来创建的项目
      })
      .map((proj, index) => {
        const createdDate = new Date(proj.createdAt);
        
        // 计算起始点：如果早于本月，则从1号开始；如果在月内，则按日期开始
        let startDay = isBefore(createdDate, monthStart) ? 1 : getDate(createdDate);
        let startPercent = ((startDay - 1) / totalDays) * 100;

        // 计算宽度：一直延伸到今天（如果在当月内）或月底
        let todayDay = getDate(now);
        let endDay = todayDay;
        
        let widthPercent = ((endDay - startDay + 1) / totalDays) * 100;

        return {
          id: proj.id,
          name: proj.name,
          start: startPercent,
          width: Math.max(widthPercent, 2), // 至少给一点宽度可见
          color: index === 0 ? 'bg-indigo-600' : 'bg-indigo-400/40',
          label: index === 0 ? 'current' : 'active'
        };
      });

    return { chartData: data, dateLabels: labels, currentMonthName: monthName };
  }, [ganttProjects]);

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 animate-in fade-in duration-700">
      
      {/* 快捷导航 */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold font-headline flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-600" />
          快捷导航
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white border-2 border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                <CheckSquare className="h-5 w-5 text-indigo-600" />
              </div>
              <CardTitle className="text-sm font-bold">当前项目</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs font-bold mb-1 truncate">{recentProjects?.[0]?.name || '暂无项目'}</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
                {recentProjects?.[0]?.description || '点击侧边栏开始创建您的第一个科研项目。'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                <Code className="h-5 w-5 text-indigo-600" />
              </div>
              <CardTitle className="text-sm font-bold">上次修改</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs font-bold mb-1">修改日志：系统</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
                系统初始化完成，准备开始您的科研探索之旅。
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-slate-100 shadow-sm group">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                <Wrench className="h-5 w-5 text-indigo-600" />
              </div>
              <CardTitle className="text-sm font-bold">实用工具</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-8 w-8 rounded-full border-2 border-slate-100 bg-slate-50" />
                ))}
                <span className="text-[10px] text-indigo-600 font-bold ml-1 cursor-pointer hover:underline">more</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-slate-100 shadow-sm group">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                <BookMarked className="h-5 w-5 text-indigo-600" />
              </div>
              <CardTitle className="text-sm font-bold">文献库</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-8 w-8 rounded-full border-2 border-slate-100 bg-slate-50" />
                ))}
                <span className="text-[10px] text-indigo-600 font-bold ml-1 cursor-pointer hover:underline">more</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 我的科研打卡 (动态当月时间轴) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold font-headline">我的科研打卡</h2>
            <span className="text-[10px] font-bold text-indigo-600 px-2 py-0.5 bg-indigo-50 rounded-full border border-indigo-100 uppercase tracking-tight">
              {currentMonthName}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-indigo-600 rounded-full" />
              <span className="text-[10px] text-slate-500 font-bold uppercase">current</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-indigo-400/40 rounded-full" />
              <span className="text-[10px] text-slate-500 font-bold uppercase">active</span>
            </div>
          </div>
        </div>
        <Card className="border-2 border-slate-100 shadow-sm overflow-hidden bg-white">
          <CardContent className="p-10 pb-16">
            <div className="flex">
              {/* 时间轴主区 */}
              <div className="relative h-80 flex-1">
                {/* 日期坐标轴背景层 - 按当月天数划分网格 */}
                <div className="absolute inset-0 flex border-b border-l border-slate-100">
                  {/* 使用 7 个刻度代表 1, 5, 10, 15, 20, 25, End */}
                  {[0, 5, 10, 15, 20, 25, 100].map((tick, i) => {
                    // tick 为百分比或对应日期
                    const isLast = i === 6;
                    const daysInMonth = getDaysInMonth(new Date());
                    const leftPos = isLast ? 100 : (dateLabels[i] - 1) / daysInMonth * 100;
                    
                    return (
                      <div 
                        key={i} 
                        className="absolute h-full border-r border-slate-50 pointer-events-none"
                        style={{ left: `${leftPos}%` }}
                      >
                        <span className="text-[10px] text-slate-400 absolute -bottom-8 -left-2 w-12 text-center font-mono whitespace-nowrap">
                          {dateLabels[i]}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                {/* 项目进度条绘图层 */}
                <div className="absolute inset-0 pt-10 space-y-12">
                  {chartData.length > 0 ? chartData.map((item) => (
                    <div key={item.id} className="relative h-4 group">
                      {/* 项目名称：定位在颜色条上方 */}
                      <span 
                        className="absolute -top-6 text-[10px] font-bold text-slate-500 whitespace-nowrap truncate max-w-[200px] md:max-w-[400px]"
                        style={{ left: `${item.start}%` }}
                        title={item.name}
                      >
                        {item.name}
                      </span>
                      <div 
                        className={cn("absolute h-full rounded-full transition-all group-hover:brightness-95 shadow-sm", item.color)}
                        style={{ left: `${item.start}%`, width: `${item.width}%` }}
                      />
                      {item.label && (
                        <span 
                          className="absolute text-[8px] text-slate-300 font-bold uppercase tracking-tighter whitespace-nowrap"
                          style={{ left: `${item.start + item.width + 1}%`, top: '3px' }}
                        >
                          {item.label}
                        </span>
                      )}
                    </div>
                  )) : (
                    <div className="h-full flex items-center justify-center text-slate-300 italic text-sm">
                      本月暂无活跃科研项目数据
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 底部两列：近期活跃 & 迭代日志 */}
      <div className="grid lg:grid-cols-[1fr_400px] gap-10">
        
        {/* 近期活跃 */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold font-headline">近期活跃</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(recentProjects || []).length > 0 ? recentProjects!.map((proj) => (
              <Card key={proj.id} className="overflow-hidden border-2 border-slate-100 shadow-sm bg-white hover:border-indigo-200 transition-all">
                <div className="p-4 space-y-3">
                  <h3 className="font-bold truncate" title={proj.name}>{proj.name}</h3>
                  <div className="aspect-video relative bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                     <Image 
                      src={`https://picsum.photos/seed/${proj.id}/400/225`} 
                      fill 
                      alt="Project placeholder" 
                      className="object-cover opacity-40"
                      data-ai-hint="scientific chart"
                     />
                     <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-full border-[0.5px] border-slate-200 rotate-12 absolute" />
                        <div className="w-full h-full border-[0.5px] border-slate-200 -rotate-12 absolute" />
                     </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
                    {proj.description}
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <MoreHorizontal className="h-4 w-4 text-slate-400" />
                    <div className="flex items-center gap-2">
                      <Edit2 className="h-3 w-3 text-slate-400 hover:text-indigo-600 cursor-pointer" />
                      <Share2 className="h-3 w-3 text-slate-400 hover:text-indigo-600 cursor-pointer" />
                    </div>
                  </div>
                </div>
              </Card>
            )) : (
              <div className="col-span-2 py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                尚未创建项目
              </div>
            )}
          </div>
        </section>

        {/* 迭代日志 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-headline">迭代日志</h2>
            <div className="flex flex-col items-end gap-1">
               <span className="text-[10px] text-indigo-600 font-bold">{format(new Date(), 'yyyy/MM/dd')}</span>
               <span className="text-[8px] text-slate-400">最新更新</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <Card className="bg-white border-2 border-slate-100 shadow-sm p-4 space-y-4">
              <div className="flex items-center gap-2 border-b pb-2 mb-2">
                <FileText className="h-3 w-3 text-slate-400" />
                <span className="text-xs font-bold">系统活动</span>
              </div>
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-bold">同步日志 #{i}</span>
                    <span className="text-[8px] text-slate-400">{format(new Date(), 'yyyy/MM/dd HH:mm')}</span>
                  </div>
                  <p className="text-[8px] text-slate-500 line-clamp-2">
                    科研规划模块已更新，新增了基于真实数据的时间轴打卡功能，优化了 X 轴刻度显示。
                  </p>
                </div>
              ))}
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
