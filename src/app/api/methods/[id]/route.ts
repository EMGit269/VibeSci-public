import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { Method } from '@/lib/types';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { firestore } = initializeFirebase();
    const methodRef = doc(firestore, 'methods', params.id);
    
    const docSnap = await getDoc(methodRef);
    
    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Method not found' }, { status: 404 });
    }

    const method: Method = {
      id: docSnap.id,
      ...docSnap.data()
    } as Method;

    return NextResponse.json(method);
  } catch (error) {
    console.error('Error fetching method:', error);
    return NextResponse.json({ error: 'Failed to fetch method' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { firestore } = initializeFirebase();
    const methodRef = doc(firestore, 'methods', params.id);
    
    // Check if method exists
    const docSnap = await getDoc(methodRef);
    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Method not found' }, { status: 404 });
    }

    const methodData = await req.json();
    
    // Update method
    await updateDoc(methodRef, methodData);
    
    // Get updated method
    const updatedDocSnap = await getDoc(methodRef);
    const updatedMethod: Method = {
      id: updatedDocSnap.id,
      ...updatedDocSnap.data()
    } as Method;

    return NextResponse.json(updatedMethod);
  } catch (error) {
    console.error('Error updating method:', error);
    return NextResponse.json({ error: 'Failed to update method' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { firestore } = initializeFirebase();
    const methodRef = doc(firestore, 'methods', params.id);
    
    // Check if method exists
    const docSnap = await getDoc(methodRef);
    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Method not found' }, { status: 404 });
    }

    // Delete method
    await deleteDoc(methodRef);
    
    return NextResponse.json({ message: 'Method deleted successfully' });
  } catch (error) {
    console.error('Error deleting method:', error);
    return NextResponse.json({ error: 'Failed to delete method' }, { status: 500 });
  }
}