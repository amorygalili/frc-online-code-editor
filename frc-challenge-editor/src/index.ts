// Main exports for frc-challenge-editor package

// Main editor component
export { EditorBody } from './EditorApp';

// Context providers that need to be used by the consuming application
export { EditorProvider, useEditor } from './contexts/EditorContext';
export { BuildProvider, useBuild } from './contexts/BuildContext';
export { HalSimProvider, useDriverStation, useHalSimData } from './contexts/HalSimContext';
export { ConfigProvider, useConfig, buildSessionUrl } from './contexts/ConfigContext';
export { NT4Provider, useNTConnection, useNTKeys, useNTValue } from './nt4/useNetworktables';

// Types that consuming applications might need
export type { AppConfig } from './contexts/ConfigContext';
export type { EditorContextType, OpenFile } from './contexts/EditorContext';
export type { BuildContextType, BuildStatus, BuildOutputMessage } from './types/build';

// Utility functions
export { setFileServiceConfig } from './fileService';
export { eclipseJdtLsConfig } from './config';

// Re-export some commonly used components that might be needed
export { ResizableSplitter } from './components/ResizableSplitter';
export { SimulationView } from './components/SimulationView';
export { SimulationVisualization } from './components/SimulationVisualization';
export { OutputTabs } from './components/BottomPanel';
export { BuildConsole } from './components/BuildConsole';
export { NetworkTablesViewer } from './components/NetworkTablesViewer';
export { HalSimViewer } from './components/HalSimViewer';
export { default as RobotModeSelector } from './components/RobotModeSelector';
export { WPILibEditorWrapper } from './components/WPILibEditorWrapper';
export { FileBrowser } from './components/FileBrowser';
export { BuildControls } from './components/BuildControls';
