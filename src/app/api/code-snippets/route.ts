import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { CodeSnippet } from '@/lib/types';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

export async function GET(req: NextRequest) {
  try {
    const { firestore } = initializeFirebase();
    const codeSnippetsRef = collection(firestore, 'codeSnippets');
    
    // Check if methodId is provided in query params
    const methodId = req.nextUrl.searchParams.get('methodId');
    
    let querySnapshot;
    if (methodId) {
      // Get code snippets for specific method
      const q = query(codeSnippetsRef, where('methodId', '==', methodId));
      querySnapshot = await getDocs(q);
    } else {
      // Get all code snippets
      querySnapshot = await getDocs(codeSnippetsRef);
    }

    const codeSnippets: CodeSnippet[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as CodeSnippet));

    return NextResponse.json(codeSnippets);
  } catch (error) {
    console.error('Error fetching code snippets:', error);
    return NextResponse.json({ error: 'Failed to fetch code snippets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { firestore } = initializeFirebase();
    const codeSnippetsRef = collection(firestore, 'codeSnippets');
    
    const codeSnippetData = await req.json();
    
    // Validate required fields
    if (!codeSnippetData.methodId || !codeSnippetData.version || !codeSnippetData.purpose || !codeSnippetData.code || !codeSnippetData.notesAndTradeoffs) {
      return NextResponse.json({ error: 'Method ID, version, purpose, code, and notes are required' }, { status: 400 });
    }

    // Create code snippet with timestamps
    const newCodeSnippet = {
      ...codeSnippetData,
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(codeSnippetsRef, newCodeSnippet);
    
    return NextResponse.json({
      id: docRef.id,
      ...newCodeSnippet
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating code snippet:', error);
    return NextResponse.json({ error: 'Failed to create code snippet' }, { status: 500 });
  }
}