import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseServer } from '@/firebase/server';
import { ChatSession } from '@/lib/types';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { firestore } = await initializeFirebaseServer();
    const chatSessionRef = doc(firestore, 'chatSessions', params.id);
    
    const docSnap = await getDoc(chatSessionRef);
    
    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
    }

    const chatSession: ChatSession = {
      id: docSnap.id,
      ...docSnap.data()
    } as ChatSession;

    return NextResponse.json(chatSession);
  } catch (error) {
    console.error('Error fetching chat session:', error);
    return NextResponse.json({ error: 'Failed to fetch chat session' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { firestore } = await initializeFirebaseServer();
    const chatSessionRef = doc(firestore, 'chatSessions', params.id);
    
    // Check if chat session exists
    const docSnap = await getDoc(chatSessionRef);
    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
    }

    const chatSessionData = await req.json();
    
    // Update chat session with updated timestamp
    const updatedChatSessionData = {
      ...chatSessionData,
      updatedAt: new Date().toISOString()
    };

    // Update chat session
    await updateDoc(chatSessionRef, updatedChatSessionData);
    
    // Get updated chat session
    const updatedDocSnap = await getDoc(chatSessionRef);
    const updatedChatSession: ChatSession = {
      id: updatedDocSnap.id,
      ...updatedDocSnap.data()
    } as ChatSession;

    return NextResponse.json(updatedChatSession);
  } catch (error) {
    console.error('Error updating chat session:', error);
    return NextResponse.json({ error: 'Failed to update chat session' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { firestore } = await initializeFirebaseServer();
    const chatSessionRef = doc(firestore, 'chatSessions', params.id);
    
    // Check if chat session exists
    const docSnap = await getDoc(chatSessionRef);
    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
    }

    // Delete chat session
    await deleteDoc(chatSessionRef);
    
    return NextResponse.json({ message: 'Chat session deleted successfully' });
  } catch (error) {
    console.error('Error deleting chat session:', error);
    return NextResponse.json({ error: 'Failed to delete chat session' }, { status: 500 });
  }
}