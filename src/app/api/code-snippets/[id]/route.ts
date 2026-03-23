import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { CodeSnippet } from '@/lib/types';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { firestore } = initializeFirebase();
    const codeSnippetRef = doc(firestore, 'codeSnippets', params.id);
    
    const docSnap = await getDoc(codeSnippetRef);
    
    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Code snippet not found' }, { status: 404 });
    }

    const codeSnippet: CodeSnippet = {
      id: docSnap.id,
      ...docSnap.data()
    } as CodeSnippet;

    return NextResponse.json(codeSnippet);
  } catch (error) {
    console.error('Error fetching code snippet:', error);
    return NextResponse.json({ error: 'Failed to fetch code snippet' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { firestore } = initializeFirebase();
    const codeSnippetRef = doc(firestore, 'codeSnippets', params.id);
    
    // Check if code snippet exists
    const docSnap = await getDoc(codeSnippetRef);
    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Code snippet not found' }, { status: 404 });
    }

    const codeSnippetData = await req.json();
    
    // Update code snippet
    await updateDoc(codeSnippetRef, codeSnippetData);
    
    // Get updated code snippet
    const updatedDocSnap = await getDoc(codeSnippetRef);
    const updatedCodeSnippet: CodeSnippet = {
      id: updatedDocSnap.id,
      ...updatedDocSnap.data()
    } as CodeSnippet;

    return NextResponse.json(updatedCodeSnippet);
  } catch (error) {
    console.error('Error updating code snippet:', error);
    return NextResponse.json({ error: 'Failed to update code snippet' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { firestore } = initializeFirebase();
    const codeSnippetRef = doc(firestore, 'codeSnippets', params.id);
    
    // Check if code snippet exists
    const docSnap = await getDoc(codeSnippetRef);
    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Code snippet not found' }, { status: 404 });
    }

    // Delete code snippet
    await deleteDoc(codeSnippetRef);
    
    return NextResponse.json({ message: 'Code snippet deleted successfully' });
  } catch (error) {
    console.error('Error deleting code snippet:', error);
    return NextResponse.json({ error: 'Failed to delete code snippet' }, { status: 500 });
  }
}