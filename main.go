package main

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/logger"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:dist
var assets embed.FS

//go:embed dist/symbol.png
var icon []byte

var storageDirectory string

func userDataDir() (string, error) {
	if dir := os.Getenv("XDG_DATA_HOME"); dir != "" {
		return dir, nil
	}
	// fall back to something sane on all platforms
	return os.UserConfigDir()
}

func main() {
	// Create an instance of the app structure
	app := NewApp()

	userData, err := userDataDir()
	if err != nil {
		log.Fatal("Failed to get user data directory:", err)
	}

	storageDirectory = filepath.Join(userData, "excaliapp")

	fmt.Println("Storage directory:", storageDirectory)

	if _, err := os.Stat(storageDirectory); os.IsNotExist(err) {
		// Create the directory if it does not exist
		err = os.MkdirAll(storageDirectory, 0755)
		if err != nil {
			log.Fatal("Failed to create storage directory:", err)
		}
	} else if err != nil {
		// Handle other errors (e.g., permission issues)
		log.Fatal("Error checking storage directory:", err)
	}

	// Create application with options
	err = wails.Run(&options.App{
		Title: "excaliapp Desktop",
		// Width:             1024,
		// Height:            768,
		MinWidth:          1920,
		MinHeight:         1080,
		MaxWidth:          5000,
		MaxHeight:         5000,
		DisableResize:     false,
		Fullscreen:        false,
		Frameless:         false,
		StartHidden:       false,
		HideWindowOnClose: false,
		BackgroundColour:  &options.RGBA{R: 255, G: 255, B: 255, A: 255},
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		Menu:             nil,
		Logger:           nil,
		LogLevel:         logger.DEBUG,
		OnStartup:        app.startup,
		OnDomReady:       app.domReady,
		OnBeforeClose:    app.beforeClose,
		OnShutdown:       app.shutdown,
		WindowStartState: options.Normal,
		Bind: []interface{}{
			app,
		},
		// Windows platform specific options
		Windows: &windows.Options{
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
			DisableWindowIcon:    false,
			// DisableFramelessWindowDecorations: false,
			WebviewUserDataPath: "",
			ZoomFactor:          1.0,
		},
		// Mac platform specific options
		Mac: &mac.Options{
			TitleBar: &mac.TitleBar{
				TitlebarAppearsTransparent: true,
				HideTitle:                  false,
				HideTitleBar:               false,
				FullSizeContent:            false,
				UseToolbar:                 false,
				HideToolbarSeparator:       true,
			},
			Appearance:           mac.NSAppearanceNameDarkAqua,
			WebviewIsTransparent: true,
			WindowIsTranslucent:  true,
			About: &mac.AboutInfo{
				Title:   "excaliapp",
				Message: "",
				Icon:    icon,
			},
		},
	})

	if err != nil {
		log.Fatal(err)
	}
}

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called at application startup
func (a *App) startup(ctx context.Context) {
	// Perform your setup here
	a.ctx = ctx
}

// domReady is called after front-end resources have been loaded
func (a App) domReady(ctx context.Context) {
	// Add your action here
}

// beforeClose is called when the application is about to quit,
// either by clicking the window close button or calling runtime.Quit.
// Returning true will cause the application to continue, false will continue shutdown as normal.
func (a *App) beforeClose(ctx context.Context) (prevent bool) {
	return false
}

// shutdown is called at application termination
func (a *App) shutdown(ctx context.Context) {
	// Perform your teardown here
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

type ExcalidrawFile struct {
	Id        string `json:"id"`
	UserId    string `json:"userId"`
	Name      string `json:"name"`
	Data      string `json:"data,omitempty"`
	Thumbnail string `json:"thumbnail,omitempty"` // Base64 thumbnail
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
	IsPublic  bool   `json:"isPublic"`
	InStorage string `json:"inStorage"`
}

func (a *App) ListFiles() ([]ExcalidrawFile, error) {
	list, err := os.ReadDir(storageDirectory)
	if err != nil {
		return nil, fmt.Errorf("failed to read storage directory: %w", err)
	}

	var files []ExcalidrawFile
	for _, entry := range list {
		if strings.HasSuffix(entry.Name(), ".i.json") {
			filePath := filepath.Join(storageDirectory, entry.Name())
			data, err := os.ReadFile(filePath)
			if err != nil {
				return nil, fmt.Errorf("failed to read file %s: %w", entry.Name(), err)
			}

			file := ExcalidrawFile{}
			err = json.Unmarshal(data, &file)
			if err != nil {
				return nil, fmt.Errorf("failed to unmarshal file %s: %w", entry.Name(), err)
			}

			file.InStorage = "local"
			files = append(files, file)
		}
	}

	return files, nil
}

func (a *App) GetFile(id string) (*ExcalidrawFile, error) {
	filePath := filepath.Join(storageDirectory, id+".i.json")
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read file %s: %w", id, err)
	}
	file := &ExcalidrawFile{}
	err = json.Unmarshal(data, file)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal file %s: %w", id, err)
	}
	file.InStorage = "local"

	dataPath := filepath.Join(storageDirectory, id+".excalidraw")
	content, err := os.ReadFile(dataPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read data file %s: %w", id, err)
	}

	file.Data = string(content)

	return file, nil
}

func (a *App) SaveFile(file ExcalidrawFile) error {
	filePath := filepath.Join(storageDirectory, file.Id+".i.json")
	dataPath := filepath.Join(storageDirectory, file.Id+".excalidraw")

	if _, err := os.Stat(filePath); err == nil {
		content, err := os.ReadFile(filePath)
		if err != nil {
			return fmt.Errorf("failed to read existing file %s: %w", filePath, err)
		}

		existingFile := &ExcalidrawFile{}
		err = json.Unmarshal(content, existingFile)
		if err == nil {
			file.CreatedAt = existingFile.CreatedAt // Preserve created date
		}
	}

	// Save actual drawing data
	err := os.WriteFile(dataPath, []byte(file.Data), 0644)
	if err != nil {
		return fmt.Errorf("failed to write data file %s: %w", dataPath, err)
	}

	file.Data = "" // Clear data field to avoid saving it in metadata

	if file.CreatedAt == "" {
		file.CreatedAt = time.Now().Format(time.RFC3339)
	}

	file.UpdatedAt = time.Now().Format(time.RFC3339)

	// Save metadata
	data, err := json.Marshal(file)
	if err != nil {
		return fmt.Errorf("failed to marshal file data: %w", err)
	}
	err = os.WriteFile(filePath, data, 0644)
	if err != nil {
		return fmt.Errorf("failed to write file %s: %w", filePath, err)
	}

	return nil
}

func (a *App) DeleteFile(id string) error {
	filePath := filepath.Join(storageDirectory, id+".i.json")
	dataPath := filepath.Join(storageDirectory, id+".excalidraw")

	// Delete metadata file
	err := os.Remove(filePath)
	if err != nil {
		return fmt.Errorf("failed to delete file %s: %w", filePath, err)
	}

	// Delete actual drawing data
	err = os.Remove(dataPath)
	if err != nil {
		return fmt.Errorf("failed to delete data file %s: %w", dataPath, err)
	}

	return nil
}
