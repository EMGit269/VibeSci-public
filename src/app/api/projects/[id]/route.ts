'use server';

import { NextRequest } from 'next/server';
import { initializeFirebaseServer } from '@/firebase/server';
import { Project } from '@/lib/types';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { createSuccessResponse, createErrorResponse, HTTP_STATUS } from '@/lib/api-response';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { firestore } = await initializeFirebaseServer();
    const projectRef = doc(firestore, 'projects', params.id);
    
    const docSnap = await getDoc(projectRef);
    
    if (!docSnap.exists()) {
      return createErrorResponse('Project not found', HTTP_STATUS.NOT_FOUND);
    }

    const project: Project = {
      id: docSnap.id,
      ...docSnap.data()
    } as Project;

    return createSuccessResponse(project, HTTP_STATUS.OK);
  } catch (error) {
    console.error('Error fetching project:', error);
    return createErrorResponse('Failed to fetch project', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { firestore } = await initializeFirebaseServer();
    const projectRef = doc(firestore, 'projects', params.id);
    
    // Check if project exists
    const docSnap = await getDoc(projectRef);
    if (!docSnap.exists()) {
      return createErrorResponse('Project not found', HTTP_STATUS.NOT_FOUND);
    }

    const projectData = await req.json();
    
    // Update project
    await updateDoc(projectRef, projectData);
    
    // Get updated project
    const updatedDocSnap = await getDoc(projectRef);
    const updatedProject: Project = {
      id: updatedDocSnap.id,
      ...updatedDocSnap.data()
    } as Project;

    return createSuccessResponse(updatedProject, HTTP_STATUS.OK);
  } catch (error) {
    console.error('Error updating project:', error);
    return createErrorResponse('Failed to update project', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { firestore } = await initializeFirebaseServer();
    const projectRef = doc(firestore, 'projects', params.id);
    
    // Check if project exists
    const docSnap = await getDoc(projectRef);
    if (!docSnap.exists()) {
      return createErrorResponse('Project not found', HTTP_STATUS.NOT_FOUND);
    }

    // Delete project
    await deleteDoc(projectRef);
    
    return createSuccessResponse({ message: 'Project deleted successfully' }, HTTP_STATUS.OK);
  } catch (error) {
    console.error('Error deleting project:', error);
    return createErrorResponse('Failed to delete project', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}