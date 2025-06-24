/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import React, { useState, useEffect } from 'react';
import { FileService, type WPILibProject } from '../fileService';

interface ProjectBrowserProps {
  onClose: () => void;
}

export const ProjectBrowser: React.FC<ProjectBrowserProps> = ({ onClose }) => {
  const [projects, setProjects] = useState<WPILibProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log("Loading WPILib projects...");
        const projectList = await FileService.listWPILibProjects();
        setProjects(projectList);
        
        if (projectList.length === 0) {
          setError("No WPILib projects found");
        }
      } catch (err) {
        console.error("Failed to load WPILib projects:", err);
        setError(`Failed to load WPILib projects: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  const handleProjectClick = async (project: WPILibProject) => {
    try {
      console.log(`Loading project: ${project.name}`);
      // TODO: Load project files into editor
      // For now, just show the project info
      alert(`Selected project: ${project.name}\nPath: ${project.path}`);
    } catch (error) {
      console.error(`Failed to load project ${project.name}:`, error);
      alert(
        `Failed to load project: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  return (
    <div className="project-browser">
      <div className="project-browser-header">
        <h4>WPILib Robot Projects:</h4>
        <button onClick={onClose} className="close-button">×</button>
      </div>
      
      <div className="project-browser-content">
        {loading && <div className="loading">Loading projects...</div>}
        
        {error && <div className="error">{error}</div>}
        
        {!loading && !error && projects.length > 0 && (
          <ul className="project-list">
            {projects.map((project, index) => (
              <li 
                key={index}
                className="project-item"
                onClick={() => handleProjectClick(project)}
              >
                <div className="project-name">
                  <strong>{project.name}</strong>
                </div>
                <div className="project-details">
                  Team: {project.teamNumber}, Year: {project.projectYear}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
