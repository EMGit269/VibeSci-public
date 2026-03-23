import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { KnowledgeSource } from '@/lib/types';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { firestore } = initializeFirebase();
    const knowledgeSourceRef = doc(firestore, 'knowledgeSources', params.id);
    
    const docSnap = await getDoc(knowledgeSourceRef);
    
    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Knowledge source not found' }, { status: 404 });
    }

    const knowledgeSource: KnowledgeSource = {
      id: docSnap.id,
      ...docSnap.data()
    } as KnowledgeSource;

    return NextResponse.json(knowledgeSource);
  } catch (error) {
    console.error('Error fetching knowledge source:', error);
    return NextResponse.json({ error: 'Failed to fetch knowledge source' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { firestore } = initializeFirebase();
    const knowledgeSourceRef = doc(firestore, 'knowledgeSources', params.id);
    
    // Check if knowledge source exists
    const docSnap = await getDoc(knowledgeSourceRef);
    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Knowledge source not found' }, { status: 404 });
    }

    const knowledgeSourceData = await req.json();
    
    // Update knowledge source
    await updateDoc(knowledgeSourceRef, knowledgeSourceData);
    
    // Get updated knowledge source
    const updatedDocSnap = await getDoc(knowledgeSourceRef);
    const updatedKnowledgeSource: KnowledgeSource = {
      id: updatedDocSnap.id,
      ...updatedDocSnap.data()
    } as KnowledgeSource;

    return NextResponse.json(updatedKnowledgeSource);
  } catch (error) {
    console.error('Error updating knowledge source:', error);
    return NextResponse.json({ error: 'Failed to update knowledge source' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { firestore } = initializeFirebase();
    const knowledgeSourceRef = doc(firestore, 'knowledgeSources', params.id);
    
    // Check if knowledge source exists
    const docSnap = await getDoc(knowledgeSourceRef);
    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Knowledge source not found' }, { status: 404 });
    }

    // Delete knowledge source
    await deleteDoc(knowledgeSourceRef);
    
    return NextResponse.json({ message: 'Knowledge source deleted successfully' });
  } catch (error) {
    console.error('Error deleting knowledge source:', error);
    return NextResponse.json({ error: 'Failed to delete knowledge source' }, { status: 500 });
  }
}