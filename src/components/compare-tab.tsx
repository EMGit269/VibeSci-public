'use client';

import type { Task } from "@/lib/types";
import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { compareMethodsAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useUser, useFirestore } from "@/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

type ComparisonResult = {
    overallSummary: string;
    recommendation: string;
    methodEvaluations: {
        methodName: string;
        merits: string;
        tradeoffs: string;
        impacts: string;
        suitability: string;
    }[];
}

export function CompareTab({ task }: { task: Task }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ComparisonResult | null>(null);
    const { toast } = useToast();

    const handleCheckboxChange = (methodId: string, checked: boolean) => {
        setSelectedMethods(prev => 
            checked ? [...prev, methodId] : prev.filter(id => id !== methodId)
        );
    };

    const handleCompare = async () => {
        if (selectedMethods.length < 2) {
            toast({
                title: 'Selection Error',
                description: 'Please select at least two methods to compare.',
                variant: 'destructive'
            });
            return;
        }

        if (!user || !firestore) return;

        setLoading(true);
        setResult(null);

        try {
            // Fetch necessary context for AI comparison from Firestore on the client
            const methodsContext = [];
            for (const mid of selectedMethods) {
                const method = task.methods?.find(m => m.id === mid);
                if (method) {
                    // Try to get latest code snippet for this method context
                    const snippetsRef = collection(firestore, 'users', user.uid, 'projects', task.projectId, 'tasks', task.id, 'methods', mid, 'codeSnippets');
                    const q = query(snippetsRef, orderBy('version', 'desc'), limit(1));
                    const qSnap = await getDocs(q);
                    const latestCode = !qSnap.empty ? qSnap.docs[0].data().code : undefined;

                    methodsContext.push({
                        name: method.name,
                        description: method.description,
                        codeSnippet: latestCode
                    });
                }
            }

            const response = await compareMethodsAction({
                taskName: task.name,
                problemDescription: task.problemDescription,
                methods: methodsContext
            });

            if (response.success && response.data) {
                setResult(response.data);
            } else {
                throw new Error(response.error || 'Comparison failed');
            }
        } catch (e: any) {
            toast({
                title: 'Comparison Failed',
                description: e.message || 'AI could not complete the comparison.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Compare Solution Methods</CardTitle>
                <CardDescription>Select at least two methods to get an AI-powered comparison of their tradeoffs, merits, and suitability.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {task.methods?.map(method => (
                            <div key={method.id} className="flex items-center space-x-2 p-4 border rounded-lg has-[:checked]:bg-primary/10 has-[:checked]:border-primary transition-colors">
                                <Checkbox 
                                    id={`method-${method.id}`}
                                    onCheckedChange={(checked) => handleCheckboxChange(method.id, !!checked)}
                                    checked={selectedMethods.includes(method.id)}
                                />
                                <Label htmlFor={`method-${method.id}`} className="flex-1 cursor-pointer">
                                    <span className="font-semibold block">{method.name}</span>
                                    <span className="text-sm text-muted-foreground line-clamp-2">{method.description}</span>
                                </Label>
                            </div>
                        ))}
                    </div>
                    <Button onClick={handleCompare} disabled={loading || selectedMethods.length < 2}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Compare Methods
                    </Button>

                    {loading && (
                        <div className="text-center py-10">
                            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                            <p className="mt-2 text-muted-foreground">AI is analyzing the methods...</p>
                        </div>
                    )}

                    {result && (
                        <div className="space-y-6 pt-6">
                            <Card className="bg-background">
                                <CardHeader>
                                    <CardTitle className="font-headline text-2xl">Overall Summary</CardTitle>
                                </CardHeader>
                                <CardContent><p className="whitespace-pre-wrap">{result.overallSummary}</p></CardContent>
                            </Card>
                             <Card className="bg-accent/10 border-accent">
                                <CardHeader>
                                    <CardTitle className="font-headline text-2xl text-accent-foreground">Recommendation</CardTitle>
                                </CardHeader>
                                <CardContent><p className="whitespace-pre-wrap">{result.recommendation}</p></CardContent>
                            </Card>
                            <div>
                                <h3 className="font-headline text-2xl mb-4">Detailed Evaluations</h3>
                                <div className="space-y-4">
                                {result.methodEvaluations.map(evalItem => (
                                    <Card key={evalItem.methodName}>
                                        <CardHeader>
                                            <CardTitle className="font-headline">{evalItem.methodName}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div>
                                                <h4 className="font-semibold mb-1">Merits</h4>
                                                <p className="text-muted-foreground whitespace-pre-wrap">{evalItem.merits}</p>
                                            </div>
                                             <div>
                                                <h4 className="font-semibold mb-1">Tradeoffs</h4>
                                                <p className="text-muted-foreground whitespace-pre-wrap">{evalItem.tradeoffs}</p>
                                            </div>
                                             <div>
                                                <h4 className="font-semibold mb-1">Impacts</h4>
                                                <p className="text-muted-foreground whitespace-pre-wrap">{evalItem.impacts}</p>
                                            </div>
                                             <div>
                                                <h4 className="font-semibold mb-1">Suitability</h4>
                                                <p className="text-muted-foreground whitespace-pre-wrap">{evalItem.suitability}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
