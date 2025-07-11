import React, { useState, useEffect, useCallback } from 'react';
import { Excalidraw, MainMenu, WelcomeScreen } from '@excalidraw/excalidraw';
import "@excalidraw/excalidraw/index.css";
import { ArrowLeft, Save, Share2, Download, FileText, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { type Storage, type ExcalidrawFile } from '@/services/storage.service';
import { useToast } from '@/hooks/use-toast';
import { AppState, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { set } from 'date-fns';
import { useAuth } from 'react-oidc-context';

interface ExcalidrawEditorProps {
  fileId?: string;
  onBack: () => void;
  storageService: Storage
  userId?: string;
}

export function ExcalidrawEditor({ fileId, onBack, storageService, userId }: ExcalidrawEditorProps) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [currentFile, setCurrentFile] = useState<ExcalidrawFile | null>(null);
  const [fileName, setFileName] = useState('Untitled Drawing');
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { toast } = useToast();

  // Load file if fileId is provided
  useEffect(() => {
    if (fileId && excalidrawAPI) {
      loadFile();
    }
  }, [fileId, excalidrawAPI]);

  // Auto-save every 30 seconds if there are changes
  useEffect(() => {
    if (hasUnsavedChanges && currentFile) {
      const autoSaveInterval = setInterval(() => {
        handleSave(false); // Silent save
      }, 30000);

      return () => clearInterval(autoSaveInterval);
    }
  }, [hasUnsavedChanges, currentFile]);

  const loadFile = async () => {
    if (!fileId) return;

    try {
      const file = await storageService.getFile(fileId);
      if (file) {
        setCurrentFile(file);
        
        setFileName(file.name);
        setIsPublic(file.isPublic);

        const parsed = JSON.parse(file.data);
        
        parsed.appState.width = window.innerWidth;
        parsed.appState.height = window.innerHeight;

        excalidrawAPI.updateScene({
          appState: parsed.appState,
          elements: parsed.elements,
          collaborators: parsed.appState?.collaborators,
          captureUpdate: undefined,
        });
      }
    } catch (error) {
      toast({
        title: "Error loading file",
        description: "Could not load the drawing. Please try again. Error: " + error,
        variant: "destructive",
      });
    }
  };

  const handleSave = async (showToast = true) => {
    if (!excalidrawAPI) return;

    setIsSaving(true);
    
    try {
  
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
    
      const drawingData = {
        type: "excalidraw",
        version: 2,
        source: "https://excalidraw.com",
        elements,
        appState: {
          ...appState,
          // Remove non-serializable properties
          collaborators: undefined,
          isLoading: false,
        }
      };

      const dataString = JSON.stringify(drawingData);
      const file = await storageService.saveFile({
        id: currentFile?.id || undefined,
        userId: userId,
        name: fileName,
        data: dataString,
        isPublic,
      });
      setCurrentFile(file);
      setHasUnsavedChanges(false);
      setHasUnsavedChanges(false);

      if (showToast) {
        toast({
          title: "Drawing saved",
          description: "Your drawing has been saved successfully.",
        });
      }
    
      setHasUnsavedChanges(false);
    } catch (error) {
      toast({
        title: "Error saving file",
        description: "Could not save your drawing. Please try again.",
        variant: "destructive",
      });
    } finally {
    
      setIsSaving(false);
      setHasUnsavedChanges(false);
    }
  
  };

    const getOut = async () => {
      if (hasUnsavedChanges) {
        await handleSave();
      }
      onBack();
    }

  const handleExport = () => {
    if (!excalidrawAPI) return;

    try {
    //   // Export as PNG
    //   excalidrawAPI.exportToBlob({
    //     mimeType: 'image/png',
    //     quality: 1,
    //   }).then((blob: Blob) => {
    //     const url = URL.createObjectURL(blob);
    //     const link = document.createElement('a');
    //     link.href = url;
    //     link.download = `${fileName}.png`;
    //     link.click();
    //     URL.revokeObjectURL(url);

    //     toast({
    //       title: "Drawing exported",
    //       description: "Your drawing has been downloaded as PNG.",
    //     });
    //   });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not export your drawing. Please try again.",
        variant: "destructive",
      });
    }
  };

  // const handleShare = async () => {
  //   if (!currentFile) {
  //     await handleSave();
  //     return;
  //   }

  //   try {
  //     const shareData = await storageService.exportToCloud(currentFile.id);
      
  //     // Copy to clipboard
  //     await navigator.clipboard.writeText(shareData.shareUrl);
      
  //     toast({
  //       title: "Share link copied",
  //       description: "The share link has been copied to your clipboard.",
  //     });
  //   } catch (error) {
  //     toast({
  //       title: "Sharing failed",
  //       description: "Could not generate share link. Please try again.",
  //       variant: "destructive",
  //     });
  //   }
  // };

  const handleFileNameChange = (newName: string) => {
    setFileName(newName);
    setHasUnsavedChanges(true);
  };

  const handlePublicToggle = (newIsPublic: boolean) => {
    setIsPublic(newIsPublic);
    setHasUnsavedChanges(true);
  };

  const handleSceneChange = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-canvas">
      {/* Toolbar */}
      <div className="bg-toolbar text-toolbar-foreground border-b border-border shadow-toolbar">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={getOut} className="text-toolbar-foreground hover:bg-toolbar-foreground/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <Input
                value={fileName}
                onChange={(e) => handleFileNameChange(e.target.value)}
                className="bg-transparent border-none text-toolbar-foreground placeholder:text-toolbar-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 font-medium"
                placeholder="Enter drawing name..."
              />
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="text-xs">
                  Unsaved
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-toolbar-foreground hover:bg-toolbar-foreground/10">
                  <Settings className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Drawing Settings</DialogTitle>
                  <DialogDescription>
                    Configure your drawing settings and privacy options.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Public Drawing</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow others to view this drawing
                      </p>
                    </div>
                    <Switch
                      checked={isPublic}
                      onCheckedChange={handlePublicToggle}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => alert('Share functionality is not implemented yet.')}
              className="text-toolbar-foreground hover:bg-toolbar-foreground/10"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              className="text-toolbar-foreground hover:bg-toolbar-foreground/10"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>

            <Button
              onClick={() => handleSave()}
              disabled={isSaving}
              size="sm"
              className="bg-primary hover:bg-primary/90"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Excalidraw Canvas */}
      <div className="flex-1 h-full w-full">
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          onChange={handleSceneChange}
          theme="dark"

          viewModeEnabled={false}
          gridModeEnabled={false}
          zenModeEnabled={false}
          objectsSnapModeEnabled={false}
        />
        {/* <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          onChange={handleSceneChange}
          theme="light"
          viewModeEnabled={false}
          gridModeEnabled={false}
          zenModeEnabled={false}
          objectsSnapModeEnabled={false}
        >
          <MainMenu>
            <MainMenu.DefaultItems.ClearCanvas />
            <MainMenu.DefaultItems.Export />
            <MainMenu.DefaultItems.SaveAsImage />
            <MainMenu.DefaultItems.Help />
          </MainMenu>
          <WelcomeScreen>
            <WelcomeScreen.Hints.MenuHint />
            <WelcomeScreen.Hints.ToolbarHint />
          </WelcomeScreen>
        </Excalidraw> */}
      </div>
    </div>
  );
}