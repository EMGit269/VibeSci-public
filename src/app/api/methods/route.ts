import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseServer } from '@/firebase/server';
import { Method } from '@/lib/types';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

export async function GET(req: NextRequest) {
  try {
    const { firestore } = await initializeFirebaseServer();
    const methodsRef = collection(firestore, 'methods');
    
    // Check if taskId is provided in query params
    const taskId = req.nextUrl.searchParams.get('taskId');
    
    let querySnapshot;
    if (taskId) {
      // Get methods for specific task
      const q = query(methodsRef, where('taskId', '==', taskId));
      querySnapshot = await getDocs(q);
    } else {
      // Get all methods
      querySnapshot = await getDocs(methodsRef);
    }

    const methods: Method[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Method));

    return NextResponse.json(methods);
  } catch (error) {
    console.error('Error fetching methods:', error);
    return NextResponse.json({ error: 'Failed to fetch methods' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { firestore } = await initializeFirebaseServer();
    const methodsRef = collection(firestore, 'methods');
    
    const methodData = await req.json();
    
    // Validate required fields
    if (!methodData.taskId || !methodData.name || !methodData.description) {
      return NextResponse.json({ error: 'Task ID, name, and description are required' }, { status: 400 });
    }

    // Create method
    const newMethod = {
      ...methodData
    };

    const docRef = await addDoc(methodsRef, newMethod);
    
    return NextResponse.json({
      id: docRef.id,
      ...newMethod
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating method:', error);
    return NextResponse.json({ error: 'Failed to create method' }, { status: 500 });
  }
}