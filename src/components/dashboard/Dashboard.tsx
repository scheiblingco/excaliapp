import { useState, useEffect } from 'react';
import { Plus, FolderOpen, Search, Grid, List, User as UserIcon, LogOut, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FileGrid } from './FileGrid';
import { type Storage, type ExcalidrawFile } from '@/services/storage.service';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from 'react-oidc-context';
import { User } from 'oidc-client-ts';

interface DashboardProps {
  onOpenEditor: (fileId?: string) => void;
  onLogout: () => void;
  storageService: Storage;
}

export function Dashboard({ onOpenEditor, onLogout, storageService }: DashboardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [files, setFiles] = useState<Record<string, ExcalidrawFile>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const auth = useAuth();

  useEffect(() => {
    loadFiles();
    setUser(auth.user || null);
  }, [ auth.isAuthenticated, auth.isLoading ]);


  const loadFiles = async () => {
    try {
      setIsLoading(true);
      const userFiles = await storageService.getUserFiles();
      setFiles(userFiles);
    } catch (error) {
      toast({
        title: "Error loading files",
        description: "Could not load your drawings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      onLogout();
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await storageService.deleteFile(fileId);
      setFiles(prevFiles => {
        const updatedFiles = { ...prevFiles };
        delete updatedFiles[fileId];
        return updatedFiles;
      });

      toast({
        title: "Drawing deleted",
        description: "Your drawing has been deleted successfully.",
      });
      
    } catch (error) {
      toast({
        title: "Error deleting file",
        description: "Could not delete the drawing. Please try again. " + error,
        variant: "destructive",
      });
    }
  };

  const handleDuplicateFile = async (fileId: string) => {
    try {
      const duplicatedFile = await storageService.duplicateFile(fileId);
      setFiles(prevFiles => ({
        ...prevFiles,
        [duplicatedFile.id]: duplicatedFile,
      }));
      // setFiles([duplicatedFile, ...files]);
      toast({
        title: "Drawing duplicated",
        description: "A copy of your drawing has been created.",
      });
    } catch (error) {
      toast({
        title: "Error duplicating file",
        description: "Could not duplicate the drawing. Please try again.",
        variant: "destructive",
      });
    }
  };

  // const filteredFiles = files.filter(file =>
  //   file.name.toLowerCase().includes(searchQuery.toLowerCase())
  // );
  const filteredFiles = Object.values(files).filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 rounded-lg flex items-center justify-center">
                <img src="/symbol.svg" alt="excaliapp Symbol" className="w-16 h-16" />
              </div>
              <h1 className="text-xl font-semibold">excaliapp</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={() => onOpenEditor()}>
                <Plus className="w-4 h-4 mr-2" />
                New Drawing
              </Button>
              
              <div className="flex items-center gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage alt={user?.profile.name} />
                  <AvatarFallback>
                    {user?.profile?.name.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden sm:block">
                  {user?.profile?.name}
                </span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Drawings</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(files).length}</div>
              <p className="text-xs text-muted-foreground">
                Your drawings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Public Drawings</CardTitle>
              <Share2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.values(files).filter(f => f.isPublic).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Publicly shared drawings {import.meta.env.MODE === 'browser' ? '(not available in browser mode)' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Account</CardTitle>
              <UserIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{import.meta.env.MODE === 'browser' ? 'Local Storage' : import.meta.env.VITE_OIDC_LABEL}</div>
              <p className="text-xs text-muted-foreground">
                Authentication provider
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search your drawings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Files */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <FileGrid
            files={filteredFiles}
            viewMode={viewMode}
            onOpenFile={onOpenEditor}
            onDeleteFile={handleDeleteFile}
            onDuplicateFile={handleDuplicateFile}
          />
        )}

        {!isLoading && filteredFiles.length === 0 && (
          <div className="text-center py-12">
            <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchQuery ? 'No drawings found' : 'No drawings yet'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'Create your first drawing to get started'
              }
            </p>
            {!searchQuery && (
              <Button onClick={() => onOpenEditor()}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Drawing
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}