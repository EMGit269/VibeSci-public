import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { Task } from '@/lib/types';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { firestore } = initializeFirebase();
    const taskRef = doc(firestore, 'tasks', params.id);
    
    const docSnap = await getDoc(taskRef);
    
    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task: Task = {
      id: docSnap.id,
      ...docSnap.data()
    } as Task;

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { firestore } = initializeFirebase();
    const taskRef = doc(firestore, 'tasks', params.id);
    
    // Check if task exists
    const docSnap = await getDoc(taskRef);
    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const taskData = await req.json();
    
    // Update task
    await updateDoc(taskRef, taskData);
    
    // Get updated task
    const updatedDocSnap = await getDoc(taskRef);
    const updatedTask: Task = {
      id: updatedDocSnap.id,
      ...updatedDocSnap.data()
    } as Task;

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { firestore } = initializeFirebase();
    const taskRef = doc(firestore, 'tasks', params.id);
    
    // Check if task exists
    const docSnap = await getDoc(taskRef);
    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Delete task
    await deleteDoc(taskRef);
    
    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}