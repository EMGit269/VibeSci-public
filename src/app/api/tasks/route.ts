import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseServer } from '@/firebase/server';
import { Task } from '@/lib/types';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

export async function GET(req: NextRequest) {
  try {
    const { firestore } = await initializeFirebaseServer();
    const tasksRef = collection(firestore, 'tasks');
    
    // Check if projectId is provided in query params
    const projectId = req.nextUrl.searchParams.get('projectId');
    
    let querySnapshot;
    if (projectId) {
      // Get tasks for specific project
      const q = query(tasksRef, where('projectId', '==', projectId));
      querySnapshot = await getDocs(q);
    } else {
      // Get all tasks
      querySnapshot = await getDocs(tasksRef);
    }

    const tasks: Task[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Task));

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { firestore } = await initializeFirebaseServer();
    const tasksRef = collection(firestore, 'tasks');
    
    const taskData = await req.json();
    
    // Validate required fields
    if (!taskData.projectId || !taskData.name || !taskData.problemDescription) {
      return NextResponse.json({ error: 'Project ID, name, and problem description are required' }, { status: 400 });
    }

    // Create task
    const newTask = {
      ...taskData
    };

    const docRef = await addDoc(tasksRef, newTask);
    
    return NextResponse.json({
      id: docRef.id,
      ...newTask
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
