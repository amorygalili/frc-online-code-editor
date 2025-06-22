import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { registerJavaLanguageService } from '../services/javaLanguageService';

interface CodeEditorProps {
  initialCode?: string;
  onCodeChange?: (code: string) => void;
  readOnly?: boolean;
}

// Global flag to prevent multiple registrations
let javaLanguageServiceRegistered = false;

const CodeEditor: React.FC<CodeEditorProps> = ({
  initialCode = '', 
  onCodeChange,
  readOnly = false 
}) => {
  const [code, setCode] = useState(initialCode);

  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  const handleEditorChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    if (onCodeChange) {
      onCodeChange(newCode);
    }
  };

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    console.log('🎯 Editor mounted!');
    console.log('📄 Editor model language:', editor.getModel()?.getLanguageId());
    console.log('🔧 Available languages:', monaco.languages.getLanguages().map(l => l.id));

    // Ensure the model is set to Java language
    const model = editor.getModel();
    if (model && model.getLanguageId() !== 'java') {
      console.log('⚠️ Model language is not Java, setting it...');
      monaco.editor.setModelLanguage(model, 'java');
      console.log('✅ Model language set to:', model.getLanguageId());
    }

    // Ensure dark theme is set
    monaco.editor.setTheme('vs-dark');

    // Register the Java language service for enhanced IntelliSense (only once)
    if (!javaLanguageServiceRegistered) {
      registerJavaLanguageService({
        projectRoot: '../RobotProject',
        classpath: [
          'edu.wpi.first.wpilibj2',
          'edu.wpi.first.wpilibj',
          'frc.robot'
        ]
      });
      javaLanguageServiceRegistered = true;
    }

    // Set editor options
    editor.updateOptions({
      fontSize: 14,
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
      wordWrap: 'on',
      lineNumbers: 'on',
      folding: true,
      foldingStrategy: 'indentation',
      showFoldingControls: 'always',
      bracketPairColorization: { enabled: true },
      // Enable more aggressive autocompletion
      quickSuggestions: {
        other: 'on',
        comments: 'on',
        strings: 'on'
      },
      quickSuggestionsDelay: 0,
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnCommitCharacter: true,
      acceptSuggestionOnEnter: 'on',
      wordBasedSuggestions: 'off', // Disable word-based suggestions to prioritize our custom ones
      suggest: {
        showMethods: true,
        showFunctions: true,
        showConstructors: true,
        showFields: true,
        showVariables: true,
        showClasses: true,
        showStructs: true,
        showInterfaces: true,
        showModules: true,
        showProperties: true,
        showEvents: true,
        showOperators: true,
        showUnits: true,
        showValues: true,
        showConstants: true,
        showEnums: true,
        showEnumMembers: true,
        showKeywords: true,
        showColors: true,
        showFiles: true,
        showReferences: true,
        showFolders: true,
        showTypeParameters: true,
        showSnippets: true,
        filterGraceful: false,
        snippetsPreventQuickSuggestions: false
      }
    });

    // Add event listeners to debug completion triggers
    editor.onDidChangeModelContent((e) => {
      console.log('📝 Content changed:', e);
      const position = editor.getPosition();
      if (position) {
        const model = editor.getModel();
        if (model) {
          const lineContent = model.getLineContent(position.lineNumber);
          const charBefore = lineContent.charAt(position.column - 2);
          console.log('🔤 Character before cursor:', charBefore);
          console.log('📍 Current position:', position);
        }
      }
    });

    // Test manual completion trigger
    setTimeout(() => {
      console.log('🧪 Testing manual completion trigger...');
      editor.trigger('test', 'editor.action.triggerSuggest', {});
    }, 1000);

    // Test typing simulation
    setTimeout(() => {
      console.log('🤖 Simulating typing...');
      editor.setValue('public class Test {\n  public void method() {\n    System.\n  }\n}');
      editor.setPosition({ lineNumber: 3, column: 12 });

      // Check model language
      const model = editor.getModel();
      if (model) {
        console.log('📄 Model language after setValue:', model.getLanguageId());
        // Force set language to java if it's not already
        if (model.getLanguageId() !== 'java') {
          console.log('🔧 Setting model language to java...');
          monaco.editor.setModelLanguage(model, 'java');
          console.log('📄 Model language after setModelLanguage:', model.getLanguageId());
        }
      }

      // Try multiple trigger methods
      setTimeout(() => {
        console.log('🎯 Triggering completion with editor.action.triggerSuggest...');
        editor.trigger('test', 'editor.action.triggerSuggest', {});
      }, 100);

      setTimeout(() => {
        console.log('🎯 Triggering completion with Ctrl+Space...');
        editor.trigger('test', 'editor.action.quickCommand', {});
      }, 200);
    }, 2000);

    // Add key binding for manual completion trigger
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
      console.log('🎯 Manual completion triggered via Ctrl+Space');
      editor.trigger('manual', 'editor.action.triggerSuggest', {});
    });

    // Add key binding for testing
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyT, () => {
      console.log('🧪 Test key pressed - checking completion provider');
      const model = editor.getModel();
      if (model) {
        console.log('📄 Current model language:', model.getLanguageId());
        const position = editor.getPosition();
        if (position) {
          console.log('📍 Current position:', position);
          editor.trigger('test', 'editor.action.triggerSuggest', {});
        }
      }
    });
  };

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Editor
        height="100%"
        defaultLanguage="java"
        value={code}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          theme: 'vs-dark',
          fontSize: 14,
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          wordWrap: 'on',
          lineNumbers: 'on',
          folding: true,
          bracketPairColorization: { enabled: true }
        }}
      />
    </div>
  );
};

export default CodeEditor;
