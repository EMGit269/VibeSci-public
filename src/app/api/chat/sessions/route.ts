import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { ChatSession } from '@/lib/types';
import { collection, addDoc, getDocs } from 'firebase/firestore';

export async function GET(req: NextRequest) {
  try {
    const { firestore } = initializeFirebase();
    const chatSessionsRef = collection(firestore, 'chatSessions');
    
    // Get all chat sessions
    const querySnapshot = await getDocs(chatSessionsRef);
    const chatSessions: ChatSession[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ChatSession));

    return NextResponse.json(chatSessions);
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch chat sessions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { firestore } = initializeFirebase();
    const chatSessionsRef = collection(firestore, 'chatSessions');
    
    const chatSessionData = await req.json();
    
    // Validate required fields
    if (!chatSessionData.title || !chatSessionData.messages) {
      return NextResponse.json({ error: 'Title and messages are required' }, { status: 400 });
    }

    // Create chat session with timestamps
    const newChatSession = {
      ...chatSessionData,
      updatedAt: new Date().toISOString()
    };

    const docRef = await addDoc(chatSessionsRef, newChatSession);
    
    return NextResponse.json({
      id: docRef.id,
      ...newChatSession
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating chat session:', error);
    return NextResponse.json({ error: 'Failed to create chat session' }, { status: 500 });
  }
}