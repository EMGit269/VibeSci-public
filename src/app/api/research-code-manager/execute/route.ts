import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { script, args } = body;

    if (!script) {
      return NextResponse.json(
        { success: false, error: 'Missing script name' },
        { status: 400 }
      );
    }

    const projectsPath = path.join(process.cwd(), 'projects', 'research-code-manager', 'scripts', script);

    return new Promise((resolve) => {
      const pythonProcess = spawn('python', [projectsPath, ...args], {
        shell: true,
        env: { ...process.env }
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(NextResponse.json({
            success: true,
            data: stdout
          }));
        } else {
          resolve(NextResponse.json({
            success: false,
            error: stderr || `Script exited with code ${code}`
          }));
        }
      });

      pythonProcess.on('error', (error) => {
        resolve(NextResponse.json({
          success: false,
          error: error.message
        }));
      });

      setTimeout(() => {
        pythonProcess.kill();
        resolve(NextResponse.json({
          success: false,
          error: 'Script execution timed out'
        }));
      }, 60000);
    });
  } catch (error) {
    console.error('Research Code Manager API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to execute script' },
      { status: 500 }
    );
  }
}