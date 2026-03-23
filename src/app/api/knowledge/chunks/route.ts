import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseServer } from '@/firebase/server';
import { KnowledgeChunk } from '@/lib/types';
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';

export async function GET(req: NextRequest) {
  try {
    const { firestore } = await initializeFirebaseServer();
    const userId = req.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }
    
    // Check if sourceId is provided in query params
    const sourceId = req.nextUrl.searchParams.get('sourceId');
    
    if (!sourceId) {
      return NextResponse.json({ error: 'Source ID is required' }, { status: 400 });
    }
    
    // Get chunks for specific source
    const chunksRef = collection(firestore, 'users', userId, 'knowledgeSources', sourceId, 'chunks');
    const q = query(chunksRef, orderBy('index', 'asc'));
    const querySnapshot = await getDocs(q);

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
    const { firestore } = await initializeFirebaseServer();
    const userId = req.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }
    
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

    const chunksRef = collection(firestore, 'users', userId, 'knowledgeSources', knowledgeChunkData.sourceId, 'chunks');
    const docRef = await addDoc(chunksRef, newKnowledgeChunk);
    
    return NextResponse.json({
      id: docRef.id,
      ...newKnowledgeChunk
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating knowledge chunk:', error);
    return NextResponse.json({ error: 'Failed to create knowledge chunk' }, { status: 500 });
  }
}