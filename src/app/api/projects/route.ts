'use server';

import { NextRequest } from 'next/server';
import { initializeFirebaseServer } from '@/firebase/server';
import { Project } from '@/lib/types';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { createSuccessResponse, createErrorResponse, HTTP_STATUS } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const { firestore } = await initializeFirebaseServer();
    const projectsRef = collection(firestore, 'projects');
    
    // Get all projects
    const querySnapshot = await getDocs(projectsRef);
    const projects: Project[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Project));

    return createSuccessResponse(projects, HTTP_STATUS.OK);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return createErrorResponse('Failed to fetch projects', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { firestore } = await initializeFirebaseServer();
    const projectsRef = collection(firestore, 'projects');
    
    const projectData = await req.json();
    
    // Validate required fields
    if (!projectData.name || !projectData.description) {
      return createErrorResponse('Name and description are required', HTTP_STATUS.BAD_REQUEST);
    }

    // Create project with timestamps
    const newProject = {
      ...projectData,
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(projectsRef, newProject);
    
    return createSuccessResponse({
      id: docRef.id,
      ...newProject
    }, HTTP_STATUS.CREATED);
  } catch (error) {
    console.error('Error creating project:', error);
    return createErrorResponse('Failed to create project', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}