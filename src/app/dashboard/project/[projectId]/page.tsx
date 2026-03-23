
'use client';

import { CreateTaskDialog } from "@/components/create-task-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { use } from "react";

export default function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);

  return (
    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-full min-h-[400px]">
      <Card className="w-full max-w-lg border-0 shadow-none bg-transparent">
        <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 text-primary p-4 rounded-full w-fit mb-4">
                <FileText className="h-10 w-10" />
            </div>
            <CardTitle className="font-headline text-3xl">Ready to Research?</CardTitle>
            <CardDescription className="text-md mt-2">
              Select an existing task from the sidebar or define a new research milestone to get started.
            </CardDescription>
        </CardHeader>
        <CardContent className="text-center pt-4">
            <CreateTaskDialog projectId={projectId} />
        </CardContent>
      </Card>
    </div>
  );
}
