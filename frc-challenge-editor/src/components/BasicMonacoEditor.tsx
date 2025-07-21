// import React, { useRef, useEffect } from 'react';
// import * as monaco from 'monaco-editor';
// import { MonacoLanguageClient, CloseAction, ErrorAction, MonacoServices, MessageTransports } from 'monaco-languageclient';
// import { toSocket, WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc';

// interface BasicMonacoEditorProps {
//   value?: string;
//   language?: string;
//   onChange?: (value: string) => void;
//   serverUrl?: string;
// }

// export const BasicMonacoEditor: React.FC<BasicMonacoEditorProps> = ({
//   value = '',
//   language = 'java',
//   onChange,
//   serverUrl
// }) => {
//   const editorRef = useRef<HTMLDivElement>(null);
//   const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
//   const languageClientRef = useRef<MonacoLanguageClient | null>(null);

//   useEffect(() => {
//     if (!editorRef.current) return;

//     // Create Monaco editor
//     const editor = monaco.editor.create(editorRef.current, {
//       value,
//       language,
//       theme: 'vs-dark',
//       automaticLayout: true,
//       minimap: { enabled: false },
//       scrollBeyondLastLine: false,
//       fontSize: 14,
//       tabSize: 2,
//       insertSpaces: true,
//     });

//     monacoEditorRef.current = editor;

//     // Set up change listener
//     const disposable = editor.onDidChangeModelContent(() => {
//       const currentValue = editor.getValue();
//       onChange?.(currentValue);
//     });

//     // Set up language client if server URL provided
//     if (serverUrl) {
//       setupLanguageClient(serverUrl);
//     }

//     return () => {
//       disposable.dispose();
//       languageClientRef.current?.stop();
//       editor.dispose();
//     };
//   }, []);

//   const setupLanguageClient = async (wsUrl: string) => {
//     try {
//       // Install Monaco language client services
//       MonacoServices.install();

//       // Create WebSocket connection
//       const webSocket = new WebSocket(wsUrl);
//       const socket = toSocket(webSocket);
//       const reader = new WebSocketMessageReader(socket);
//       const writer = new WebSocketMessageWriter(socket);
//       const languageClient = new MonacoLanguageClient({
//         name: 'Java Language Client',
//         clientOptions: {
//           documentSelector: [{ scheme: 'file', language: 'java' }],
//           errorHandler: {
//             error: () => ({ action: ErrorAction.Continue }),
//             closed: () => ({ action: CloseAction.DoNotRestart })
//           }
//         },
//         messageTransports: { reader, writer } as MessageTransports
//       });

//       languageClientRef.current = languageClient;
//       await languageClient.start();
//     } catch (error) {
//       console.error('Failed to setup language client:', error);
//     }
//   };

//   return (
//     <div 
//       ref={editorRef} 
//       style={{ 
//         width: '100%', 
//         height: '100%', 
//         minHeight: '400px' 
//       }} 
//     />
//   );
// };
