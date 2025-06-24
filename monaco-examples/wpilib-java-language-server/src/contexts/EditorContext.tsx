import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { MonacoEditorLanguageClientWrapper } from "monaco-editor-wrapper";
import * as vscode from "vscode";

import { eclipseJdtLsConfig } from "../config";
import { createModelReference } from "@codingame/monaco-vscode-api/monaco";

const editorWrapper = new MonacoEditorLanguageClientWrapper();

// Types
export interface OpenFile {
  path: string;
  name: string;
  uri: vscode.Uri;
  isDirty?: boolean;
}

export interface EditorContextType {
  // Editor wrapper - always available when context is used
  editorWrapper: MonacoEditorLanguageClientWrapper;

  // File management
  openFiles: OpenFile[];
  activeFileIndex: number;

  // File operations
  openFile: (filePath: string) => Promise<void>;
  closeFile: (filePath: string) => void;
  setActiveFile: (filePath: string) => void;

  // Utility functions
  isFileOpen: (filePath: string) => boolean;
  getActiveFile: () => OpenFile | null;
}

// Create context
const EditorContext = createContext<EditorContextType | undefined>(undefined);

// Custom hook to use the context
export const useEditor = (): EditorContextType => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  return context;
};

// Utility function to create OpenFile from file path
const createOpenFile = (filePath: string): OpenFile => {
  const fileName = filePath.split("/").pop() || filePath;
  const uri = vscode.Uri.file(`${eclipseJdtLsConfig.basePath}/${filePath}`);

  return {
    path: filePath,
    name: fileName,
    uri: uri,
  };
};

// Provider component
interface EditorProviderProps {
  children: ReactNode;
}

export const EditorProvider: React.FC<EditorProviderProps> = ({ children }) => {
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(-1);

  // Open a file and add it to tabs
  const openFile = useCallback(
    async (filePath: string): Promise<void> => {
      try {
        // Check if file is already open
        const existingIndex = openFiles.findIndex((f) => f.path === filePath);

        const file = existingIndex >= 0 ? openFiles[existingIndex] : createOpenFile(filePath);

        console.log("OPEN FILE:", file);

        if (existingIndex < 0) {
          // Add to open files and set as active
          const newOpenFiles = [...openFiles, file];
          setOpenFiles(newOpenFiles);
          setActiveFileIndex(newOpenFiles.length - 1);
        } else {
          setActiveFileIndex(existingIndex);
        }

        const ref = await createModelReference(file.uri);
        editorWrapper.getEditor()?.setModel(ref.object.textEditorModel);

        // Load the file content and open it
        const doc = await vscode.workspace.openTextDocument(file.uri);
        await vscode.window.showTextDocument(doc, {
          preserveFocus: false,
          preview: false,
          viewColumn: vscode.ViewColumn.Active,
        });


        console.log(`Opened file in tab: ${filePath}`);
      } catch (error) {
        console.error(`Failed to open file ${filePath}:`, error);
      }
    },
    [openFiles]
  );

  // Close a file
  const closeFile = useCallback(
    (filePath: string) => {
      const fileIndex = openFiles.findIndex((f) => f.path === filePath);
      if (fileIndex === -1) return;

      const newOpenFiles = openFiles.filter((f) => f.path !== filePath);
      setOpenFiles(newOpenFiles);

      // Adjust active file index
      if (fileIndex === activeFileIndex) {
        // Closing the active file
        if (newOpenFiles.length === 0) {
          setActiveFileIndex(-1);
        } else if (fileIndex >= newOpenFiles.length) {
          setActiveFileIndex(newOpenFiles.length - 1);
        }
        // If there are files after the closed one, activeFileIndex stays the same
      } else if (fileIndex < activeFileIndex) {
        // Closing a file before the active one
        setActiveFileIndex(activeFileIndex - 1);
      }
      // If closing a file after the active one, no change needed

      console.log(`Closed file: ${filePath}`);
    },
    [openFiles, activeFileIndex]
  );

  // Set active file by path
  const setActiveFile = useCallback(
    async (filePath: string) => {
      const fileIndex = openFiles.findIndex((f) => f.path === filePath);
      if (fileIndex === -1) {
        // File not open, open it first
        await openFile(filePath);
        return;
      }

      try {
        const file = openFiles[fileIndex];

        const doc = await vscode.workspace.openTextDocument(file.uri);
        await vscode.window.showTextDocument(doc, {
          preserveFocus: false,
          preview: false,
          viewColumn: vscode.ViewColumn.Active,
        });

        setActiveFileIndex(fileIndex);
      } catch (error) {
        console.error(`Failed to set active file ${filePath}:`, error);
      }
    },
    [openFiles, openFile]
  );

  // Check if a file is open
  const isFileOpen = useCallback(
    (filePath: string): boolean => {
      return openFiles.some((f) => f.path === filePath);
    },
    [openFiles]
  );

  // Get the currently active file
  const getActiveFile = useCallback((): OpenFile | null => {
    if (activeFileIndex >= 0 && activeFileIndex < openFiles.length) {
      return openFiles[activeFileIndex];
    }
    return null;
  }, [openFiles, activeFileIndex]);

  const contextValue: EditorContextType = {
    editorWrapper,
    openFiles,
    activeFileIndex,
    openFile,
    closeFile,
    setActiveFile,
    isFileOpen,
    getActiveFile,
  };

  return (
    <EditorContext.Provider value={contextValue}>
      {children}
    </EditorContext.Provider>
  );
};
