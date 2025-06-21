import { useState, useEffect } from 'react'
import CodeEditor from './components/CodeEditor'
import { loadRobotContainerCode, saveRobotContainerCode, getDefaultRobotContainerCode } from './utils/fileUtils'
import './App.css'

function App() {
  const [code, setCode] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    // Load the initial code
    const loadCode = async () => {
      try {
        // For now, use the default code since we don't have a backend yet
        const initialCode = getDefaultRobotContainerCode()
        setCode(initialCode)
      } catch (error) {
        console.error('Failed to load code:', error)
        setCode(getDefaultRobotContainerCode())
      } finally {
        setIsLoading(false)
      }
    }

    loadCode()
  }, [])

  const handleCodeChange = (newCode: string) => {
    setCode(newCode)
    setSaveStatus('idle')
  }

  const handleSave = async () => {
    setSaveStatus('saving')
    try {
      // For now, just simulate saving since we don't have a backend
      await new Promise(resolve => setTimeout(resolve, 500))
      console.log('Code would be saved:', code)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to save:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }
  }

  if (isLoading) {
    return (
      <div className="app">
        <div className="loading">Loading RobotContainer.java...</div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>FRC Robot Code Editor</h1>
        <div className="header-controls">
          <span className="file-name">RobotContainer.java</span>
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className={`save-button ${saveStatus}`}
          >
            {saveStatus === 'saving' && 'Saving...'}
            {saveStatus === 'saved' && 'Saved!'}
            {saveStatus === 'error' && 'Error!'}
            {saveStatus === 'idle' && 'Save'}
          </button>
        </div>
      </header>
      <main className="app-main">
        <CodeEditor
          initialCode={code}
          onCodeChange={handleCodeChange}
        />
      </main>
    </div>
  )
}

export default App
