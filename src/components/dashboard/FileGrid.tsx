import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MoreVertical, Eye, Copy, Trash2, Share2, ExternalLink, Disc, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type ExcalidrawFile } from '@/services/storage.service';
import { time } from 'console';

interface FileGridProps {
  files: ExcalidrawFile[];
  viewMode: 'grid' | 'list';
  onOpenFile: (fileId: string) => void;
  onDeleteFile: (fileId: string) => void;
  onDuplicateFile: (fileId: string) => void;
}

export function FileGrid({ 
  files, 
  viewMode, 
  onOpenFile, 
  onDeleteFile, 
  onDuplicateFile 
}: FileGridProps) {
  const formatFileDate = (dateString: string) => {
    const date2 = new Date(Date.parse(dateString));
    date2.setHours(date2.getHours() + 2);
    return formatDistanceToNow(new Date(date2), { addSuffix: true  });
  };

  const getFileThumbnail = (file: ExcalidrawFile) => {
    // For now, return a placeholder. In a real implementation, this would 
    // generate or retrieve actual thumbnails from the Excalidraw data
    return file.thumbnail || generatePlaceholderThumbnail(file.name);
  };

  const generatePlaceholderThumbnail = (fileName: string) => {
    // Generate a simple color based on filename for consistency
    const colors = [
      'from-blue-400 to-blue-600',
      'from-green-400 to-green-600', 
      'from-purple-400 to-purple-600',
      'from-red-400 to-red-600',
      'from-yellow-400 to-yellow-600',
      'from-indigo-400 to-indigo-600'
    ];
    const colorIndex = fileName.length % colors.length;
    return colors[colorIndex];
  };

  if (viewMode === 'list') {
    return (
      <div className="space-y-2">
        {files.map((file) => (
          <Card key={file.id} className="hover:bg-accent/50 transition-creative">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getFileThumbnail(file)} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white text-sm font-medium">
                      {file.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm truncate">{file.name}</h3>
                      {file.isPublic ? (
                        <Badge variant="secondary" className="text-xs">
                          <Share2 className="w-3 h-3 mr-1" />
                          Public
                        </Badge>
                      ) : <></>}
                      <Badge variant={file.inStorage === "local" ? "destructive" : "secondary"} className="text-xs">
                          {file.inStorage === "local" ? <Disc className="w-3 h-3 mr-1" /> : <Cloud className="w-3 h-3 mr-1" />}
                          {file.inStorage === "local" ? "Local" : "Cloud"} Storage
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {}
                      Modified {formatFileDate(file.updatedAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenFile(file.id)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Open
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onOpenFile(file.id)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Open
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicateFile(file.id)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => onDeleteFile(file.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {files.map((file) => (
        <Card key={file.id} className="group hover:shadow-creative transition-creative cursor-pointer">
          <CardContent className="p-0">
            {/* Thumbnail */}
            <div 
              className={`h-40 rounded-t-lg bg-gradient-to-br ${getFileThumbnail(file)} relative overflow-hidden`}
              onClick={() => onOpenFile(file.id)}
            >
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button variant="secondary" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  Open
                </Button>
              </div>
              
              {/* Public badge */}
              {file.isPublic ? (
                <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
                  <Share2 className="w-3 h-3 mr-1" />
                  Public
                </Badge>
              ) : <></>}
              <Badge variant={file.inStorage === "local" ? "destructive" : "secondary"} className="absolute top-2 right-2 bg-primary text-primary-foreground">
                  {file.inStorage === "local" ? <Disc className="w-3 h-3 mr-1" /> : <Cloud className="w-3 h-3 mr-1" />}
                  {file.inStorage === "local" ? "Local" : "Cloud"} Storage
              </Badge>
            </div>

            {/* File info */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-sm truncate mr-2 flex-1">
                  {file.name}
                </h3>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onOpenFile(file.id)}>
                      <Eye className="w-4 h-4 mr-2" />
                      Open
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicateFile(file.id)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDeleteFile(file.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Modified {formatFileDate(file.updatedAt)}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}