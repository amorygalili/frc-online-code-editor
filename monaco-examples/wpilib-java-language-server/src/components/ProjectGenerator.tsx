/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import React, { useState } from 'react';
import { FileService, type ProjectGenerationOptions, type ProjectGenerationResult } from '../fileService';

interface ProjectGeneratorProps {
  onClose: () => void;
}

export const ProjectGenerator: React.FC<ProjectGeneratorProps> = ({ onClose }) => {
  const [formData, setFormData] = useState<ProjectGenerationOptions>({
    name: '',
    teamNumber: undefined,
    packageName: '',
  });
  const [status, setStatus] = useState<{
    message: string;
    type: 'info' | 'success' | 'error';
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'teamNumber' ? (value ? parseInt(value) : undefined) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setStatus({
        message: "Project name is required",
        type: 'error'
      });
      return;
    }

    setIsGenerating(true);
    setStatus({
      message: "Generating project...",
      type: 'info'
    });

    try {
      console.log("Generating WPILib project with options:", formData);
      const result: ProjectGenerationResult = await FileService.generateWPILibProject(formData);

      if (result.success) {
        setStatus({
          message: `Project '${result.projectName}' generated successfully!`,
          type: 'success'
        });

        // Clear the form
        setFormData({
          name: '',
          teamNumber: undefined,
          packageName: '',
        });

        // Optionally close the form after successful generation
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setStatus({
          message: `Failed to generate project: ${result.message}`,
          type: 'error'
        });
      }
    } catch (error) {
      console.error("Failed to generate project:", error);
      setStatus({
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
        type: 'error'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      teamNumber: undefined,
      packageName: '',
    });
    setStatus(null);
    onClose();
  };

  return (
    <div className="project-generator">
      <div className="project-generator-header">
        <h4>Generate New Robot Project:</h4>
        <button onClick={onClose} className="close-button">×</button>
      </div>
      
      <div className="project-generator-content">
        <form onSubmit={handleSubmit} className="generation-form">
          <div className="form-group">
            <label htmlFor="name">Project Name:</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              placeholder="MyRobotProject"
              disabled={isGenerating}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="teamNumber">Team Number:</label>
            <input
              type="number"
              id="teamNumber"
              name="teamNumber"
              value={formData.teamNumber || ''}
              onChange={handleInputChange}
              placeholder="0"
              disabled={isGenerating}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="packageName">Package Name:</label>
            <input
              type="text"
              id="packageName"
              name="packageName"
              value={formData.packageName}
              onChange={handleInputChange}
              placeholder="frc.robot"
              disabled={isGenerating}
            />
          </div>
          
          <div className="form-actions">
            <button 
              type="submit" 
              disabled={isGenerating || !formData.name.trim()}
              className="generate-button"
            >
              {isGenerating ? 'Generating...' : 'Generate Project'}
            </button>
            <button 
              type="button" 
              onClick={handleCancel}
              disabled={isGenerating}
              className="cancel-button"
            >
              Cancel
            </button>
          </div>
        </form>
        
        {status && (
          <div className={`status-message ${status.type}`}>
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
};
