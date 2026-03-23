import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseServer } from '@/firebase/server';
import { KnowledgeSource } from '@/lib/types';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

export async function GET(req: NextRequest) {
  try {
    const { firestore } = await initializeFirebaseServer();
    const userId = req.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }
    
    const knowledgeSourcesRef = collection(firestore, 'users', userId, 'knowledgeSources');
    
    // Get all knowledge sources
    const querySnapshot = await getDocs(knowledgeSourcesRef);
    const knowledgeSources: KnowledgeSource[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as KnowledgeSource));

    return NextResponse.json(knowledgeSources);
  } catch (error) {
    console.error('Error fetching knowledge sources:', error);
    return NextResponse.json({ error: 'Failed to fetch knowledge sources' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { firestore } = await initializeFirebaseServer();
    const userId = req.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }
    
    const knowledgeSourcesRef = collection(firestore, 'users', userId, 'knowledgeSources');
    
    const knowledgeSourceData = await req.json();
    
    // Validate required fields
    if (!knowledgeSourceData.fileName || !knowledgeSourceData.fileType || !knowledgeSourceData.totalChunks) {
      return NextResponse.json({ error: 'File name, file type, and total chunks are required' }, { status: 400 });
    }

    // Create knowledge source with timestamps
    const newKnowledgeSource = {
      ...knowledgeSourceData,
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(knowledgeSourcesRef, newKnowledgeSource);
    
    return NextResponse.json({
      id: docRef.id,
      ...newKnowledgeSource
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating knowledge source:', error);
    return NextResponse.json({ error: 'Failed to create knowledge source' }, { status: 500 });
  }
}