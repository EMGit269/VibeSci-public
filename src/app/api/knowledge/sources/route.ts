import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { KnowledgeSource } from '@/lib/types';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

export async function GET(req: NextRequest) {
  try {
    const { firestore } = initializeFirebase();
    const knowledgeSourcesRef = collection(firestore, 'knowledgeSources');
    
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
    const { firestore } = initializeFirebase();
    const knowledgeSourcesRef = collection(firestore, 'knowledgeSources');
    
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