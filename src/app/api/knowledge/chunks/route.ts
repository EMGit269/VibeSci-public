import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { KnowledgeChunk } from '@/lib/types';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

export async function GET(req: NextRequest) {
  try {
    const { firestore } = initializeFirebase();
    const knowledgeChunksRef = collection(firestore, 'knowledgeChunks');
    
    // Check if sourceId is provided in query params
    const sourceId = req.nextUrl.searchParams.get('sourceId');
    
    let querySnapshot;
    if (sourceId) {
      // Get chunks for specific source
      const q = query(knowledgeChunksRef, where('sourceId', '==', sourceId));
      querySnapshot = await getDocs(q);
    } else {
      // Get all chunks
      querySnapshot = await getDocs(knowledgeChunksRef);
    }

    const knowledgeChunks: KnowledgeChunk[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as KnowledgeChunk));

    return NextResponse.json(knowledgeChunks);
  } catch (error) {
    console.error('Error fetching knowledge chunks:', error);
    return NextResponse.json({ error: 'Failed to fetch knowledge chunks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { firestore } = initializeFirebase();
    const knowledgeChunksRef = collection(firestore, 'knowledgeChunks');
    
    const knowledgeChunkData = await req.json();
    
    // Validate required fields
    if (!knowledgeChunkData.sourceId || !knowledgeChunkData.content || knowledgeChunkData.index === undefined) {
      return NextResponse.json({ error: 'Source ID, content, and index are required' }, { status: 400 });
    }

    // Create knowledge chunk with timestamps
    const newKnowledgeChunk = {
      ...knowledgeChunkData,
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(knowledgeChunksRef, newKnowledgeChunk);
    
    return NextResponse.json({
      id: docRef.id,
      ...newKnowledgeChunk
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating knowledge chunk:', error);
    return NextResponse.json({ error: 'Failed to create knowledge chunk' }, { status: 500 });
  }
}