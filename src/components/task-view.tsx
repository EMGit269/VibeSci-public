
'use client';

import { useState, useEffect } from 'react';
import type { Task } from '@/lib/types';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MethodsTab } from './methods-tab';
import { CompareTab } from './compare-tab';
import { GitCompareArrows, Wrench } from 'lucide-react';

/**
 * TaskView component
 * Displays detailed information about a specific research task, including methods and comparisons.
 */
export function TaskView({ initialTask }: { initialTask: Task }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-3xl">{initialTask.name}</CardTitle>
            <CardDescription className="text-md pt-1">{initialTask.problemDescription}</CardDescription>
          </CardHeader>
        </Card>
        <div className="h-10 w-[400px] bg-muted animate-pulse rounded-md" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="space-y-1 min-w-0">
            <CardTitle className="font-headline text-3xl block truncate" title={initialTask.name}>{initialTask.name}</CardTitle>
            <CardDescription className="text-md pt-1">{initialTask.problemDescription}</CardDescription>
          </div>
        </CardHeader>
      </Card>
      
      <Tabs defaultValue="methods">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="methods">
              <Wrench className="w-4 h-4 mr-2"/>
              Methods
          </TabsTrigger>
          <TabsTrigger value="compare">
              <GitCompareArrows className="w-4 h-4 mr-2"/>
              Compare Methods
          </TabsTrigger>
        </TabsList>
        <TabsContent value="methods">
            <MethodsTab task={initialTask} />
        </TabsContent>
        <TabsContent value="compare">
            <CompareTab task={initialTask} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
