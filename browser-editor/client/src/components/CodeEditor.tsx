import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

interface CodeEditorProps {
  initialCode?: string;
  onCodeChange?: (code: string) => void;
  readOnly?: boolean;
}

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
    // Configure Java language features
    monaco.languages.registerCompletionItemProvider('java', {
      provideCompletionItems: (model, position) => {
        // Basic FRC/WPILib autocompletion suggestions
        const suggestions = [
          {
            label: 'CommandXboxController',
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: 'CommandXboxController',
            documentation: 'Xbox controller for command-based robot programming'
          },
          {
            label: 'Command',
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: 'Command',
            documentation: 'Base class for robot commands'
          },
          {
            label: 'Subsystem',
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: 'Subsystem',
            documentation: 'Base class for robot subsystems'
          },
          {
            label: 'Trigger',
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: 'Trigger',
            documentation: 'Represents a condition that can trigger commands'
          },
          {
            label: 'configureBindings',
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: 'configureBindings() {\n\t$0\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Configure button bindings for the robot'
          },
          {
            label: 'getAutonomousCommand',
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: 'getAutonomousCommand() {\n\treturn $0;\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Return the autonomous command'
          }
        ];

        return { suggestions };
      }
    });

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
      bracketPairColorization: { enabled: true }
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
