import * as FSYS from '../../frontend/wailsjs/go/main/App'
import * as FSYSTYPES from '../../frontend/wailsjs/go/models'
// File Storage Service for Excalidraw drawings
// This is a sample implementation using localStorage that can be easily replaced with a real API

export interface ExcalidrawFile {
  id?: string;
  userId: string;
  name: string;
  data?: string; // Serialized Excalidraw data
  thumbnail?: string; // Base64 thumbnail
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;

  inStorage?: string;
}

export interface SaveFileRequest {
  id?: string;
  name?: string;
  userId: string;
  data?: string;
  thumbnail?: string;
  isPublic?: boolean;
}

export type StorageBackend = {
  listFiles: (userId?: string) => Promise<Record<string, ExcalidrawFile>>;
  getFile: (fileId: string) => Promise<ExcalidrawFile | null>;
  saveFile: (request: SaveFileRequest) => Promise<ExcalidrawFile>;
  deleteFile: (fileId: string) => Promise<void>;
  isAvailable: () => Promise<boolean>;
}

export type Storage = {
  getUserFiles: (userId?: string) => Promise<Record<string, ExcalidrawFile>>;
  getFile: (fileId: string) => Promise<ExcalidrawFile | null>;
  saveFile: (request: SaveFileRequest) => Promise<ExcalidrawFile>;
  deleteFile: (fileId: string) => Promise<void>;
  duplicateFile: (fileId: string, newName?: string) => Promise<ExcalidrawFile>;
  exportToCloud?: (fileId: string) => Promise<{ shareUrl: string }>;
  importFromUrl?: (url: string) => Promise<ExcalidrawFile>;
}

class UserdataStorage implements StorageBackend {
  public listFiles = async (userId?: string): Promise<Record<string, ExcalidrawFile>> => {
    const files = await FSYS.ListFiles();

    let out = files.map((file: FSYSTYPES.main.ExcalidrawFile) => (
      file as ExcalidrawFile
    ));

    return out.reduce((acc, file) => {
      acc[file.id] = {
        ...file,
        inStorage: 'wails',
      };
      return acc;
    }, {});

  }
  
  public getFile = async (fileId: string): Promise<ExcalidrawFile | null> => {
    const file = await FSYS.GetFile(fileId);
    if (!file) return null;

    return {
      ...file,
      inStorage: 'wails',
    };
  }

  public saveFile = async (request: SaveFileRequest): Promise<ExcalidrawFile> => {
    if (!request.id || request.id === null || request.id === undefined || request.id === '') {
      request.id = Math.random().toString(36);
    }

    const file: FSYSTYPES.main.ExcalidrawFile = {
      id: request.id,
      userId: request.userId,
      name: request.name || 'Untitled',
      data: request.data || '',
      thumbnail: request.thumbnail || '',
      createdAt: "",
      updatedAt: "",
      isPublic: request.isPublic || false,
      inStorage: 'wails',
    };

    await FSYS.SaveFile(file);

    return {
      ...file,
    };
  }

  public deleteFile = async (fileId: string): Promise<void> => {
    return FSYS.DeleteFile(fileId);
  }
  
  public isAvailable = async (): Promise<boolean> => {
    return import.meta.env.MODE === 'wails';
  }
}

class LocalStorage implements StorageBackend {
  public isAvailable = async (): Promise<boolean> => (true);

  public listFiles = async (userId?: string): Promise<Record<string, ExcalidrawFile>> => {
    const filesJson = localStorage.getItem('excalidraw_files');
    const files: Record<string, ExcalidrawFile> = filesJson ? JSON.parse(filesJson) : {};

    return files;
  }

  public getFile = async (fileId: string): Promise<ExcalidrawFile | null> => {
    const files = await this.listFiles();
    return files[fileId] ? {
      ...files[fileId],
      inStorage: 'local',
    } : null;
  }

  public saveFile = async (request: SaveFileRequest): Promise<ExcalidrawFile> => {
    const files = await this.listFiles();
    const now = new Date().toISOString();

    const newFile: ExcalidrawFile = {
      id: request.id,
      name: request.name,
      data: request.data,
      thumbnail: request.thumbnail,
      createdAt: files[request.id]?.createdAt || now,
      updatedAt: now,
      userId: request.userId,
      isPublic: request.isPublic || false,
      inStorage: 'local',
    };

    files[newFile.id] = newFile;
    localStorage.setItem('excalidraw_files', JSON.stringify(files));

    return newFile;
  }

  public deleteFile = async (fileId: string): Promise<void> => {
    const files = await this.listFiles();
    if (!files[fileId]) throw new Error('File not found');

    delete files[fileId];
    localStorage.setItem('excalidraw_files', JSON.stringify(files));
  }
}

class ApiStorage implements StorageBackend {
  private AUTH_KEY: string;
  
  constructor(key: string = '') {
    this.AUTH_KEY = key;
  }

  public setAuthKey = (key: string) => {
    this.AUTH_KEY = key;
  }

  public isAvailable = async (): Promise<boolean> => {
    if (!this.AUTH_KEY || this.AUTH_KEY.trim().length < 10) {
      console.warn('API storage is not available: AUTH_KEY is empty');
      return false;
    }

    return true;

    const response = await fetch('/api/health/',
      {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.AUTH_KEY}`,
        }
      }
    );

    if (!response.ok) {
      console.warn('API storage is not available: ' + response.statusText);
      return false;
    }

    return true;
  }

  public async listFiles(userId?: string): Promise<Record<string, ExcalidrawFile>> {
    // Mock API call to fetch files
    const response = await fetch(
      '/api/drawings/',
      {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.AUTH_KEY}`,
        }
      }
    );
    if (!response.ok) {
      throw new Error('Failed to fetch files from API');
    }
    
    return await response.json();
  }

  public async getFile(fileId: string): Promise<ExcalidrawFile | null> {
    const response = await fetch(`/api/drawings/${fileId}/`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.AUTH_KEY}`,
        }
      }
    );
    if (!response.ok) return null;

    const file: ExcalidrawFile = await response.json();
    return {
      ...file,
      inStorage: 'api',
    };
  }

  public async saveFile(request: SaveFileRequest): Promise<ExcalidrawFile> {
    const now = new Date().toISOString();

    let newFile: ExcalidrawFile = {
      id: request.id,
      name: request.name,
      data: request.data,
      thumbnail: request.thumbnail,
      createdAt: now,
      updatedAt: now,
      userId: request.userId,
      isPublic: request.isPublic || false,
      inStorage: 'api',
    };

    const response = await fetch('/api/drawings/', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.AUTH_KEY}`,
      },
      body: JSON.stringify(newFile),
    });
    
    if (!response.ok) throw new Error('Failed to save file: ' + await response.text());
    
    return await response.json();
  }

  public async deleteFile(fileId: string): Promise<void> {
    const response = await fetch(`/api/drawings/${fileId}`, { 
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.AUTH_KEY}`,
      }
    });
    if (!response.ok) throw new Error('Failed to delete file');
  }
}

export class StorageService implements Storage {
  private storage: StorageBackend | null = null;

  constructor(key: string) {
    if (import.meta.env.MODE === 'wails') {
      this.storage = new UserdataStorage();
      return;
    }

    if (import.meta.env.MODE !== 'browser') {
      this.storage = new ApiStorage(key);
      return;
    }

    this.storage = new LocalStorage();
  }

  public setAuthKey = (key: string) => {
    if (this.storage instanceof ApiStorage) {
      this.storage.setAuthKey(key);
    }
  }

  async getUserFiles(userId?: string): Promise<Record<string, ExcalidrawFile>> {
    return await this.storage.listFiles(null);
  }

  async getFile(fileId: string): Promise<ExcalidrawFile | null> {
    return this.storage.getFile(fileId);
  }

  async saveFile(request: SaveFileRequest): Promise<ExcalidrawFile> {
    if (!request.id || request.id === null || request.id === undefined || request.id === '') {
      request.id = Math.random().toString(36);
    }

    return this.storage.saveFile(request);
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.storage.deleteFile(fileId);
  }

  async duplicateFile(fileId: string, newName?: string): Promise<ExcalidrawFile> {
    const originalFile = await this.getFile(fileId);
    if (!originalFile) throw new Error('File not found');

    return this.saveFile({
      ...originalFile,
      name: newName || `${originalFile.name} (Copy)`,
      id: undefined, // Generate new ID
    });
  }
}
