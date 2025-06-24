/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from "vscode";
import getKeybindingsServiceOverride from "@codingame/monaco-vscode-keybindings-service-override";
import {
  RegisteredFileSystemProvider,
  RegisteredMemoryFile,
  registerFileSystemOverlay,
} from "@codingame/monaco-vscode-files-service-override";
// this is required syntax highlighting
import "@codingame/monaco-vscode-java-default-extension";
import { LogLevel } from "@codingame/monaco-vscode-api";
import {
  MonacoEditorLanguageClientWrapper,
  type WrapperConfig,
} from "monaco-editor-wrapper";
import { configureDefaultWorkerFactory } from "monaco-editor-wrapper/workers/workerLoaders";
import { eclipseJdtLsConfig } from "./config.js";
import { FileService, loadWorkspaceFiles } from "./fileService";
import type { IStoredWorkspace } from "@codingame/monaco-vscode-configuration-service-override";
import { createModelReference } from "@codingame/monaco-vscode-api/monaco";

export const createDefaultWorkspaceContent = (workspacePath: string) => {
  return JSON.stringify(
    <IStoredWorkspace>{
      folders: [
        {
          path: workspacePath,
        },
      ],
    },
    null,
    2
  );
};

export const runEclipseJdtLsClient = async () => {
  const fileSystemProvider = new RegisteredFileSystemProvider(false);
  const workspaceFileUri = vscode.Uri.file(
    `/home/jdtls/workspace.code-workspace`
  );
  fileSystemProvider.registerFile(
    new RegisteredMemoryFile(
      workspaceFileUri,
      createDefaultWorkspaceContent(eclipseJdtLsConfig.basePath)
    )
  );
  registerFileSystemOverlay(1, fileSystemProvider);

  await loadWorkspaceFiles(fileSystemProvider);

  const wrapperConfig: WrapperConfig = {
    $type: "extended",
    htmlContainer: document.getElementById("monaco-editor-root")!,
    logLevel: LogLevel.Debug,
    vscodeApiConfig: {
      serviceOverrides: {
        ...getKeybindingsServiceOverride(),
      },
      userConfiguration: {
        json: JSON.stringify({
          "workbench.colorTheme": "Default Dark Modern",
          "editor.guides.bracketPairsHorizontal": "active",
          "editor.wordBasedSuggestions": "off",
          "editor.experimental.asyncTokenization": true,
        }),
      },
    },
    editorAppConfig: {
      monacoWorkerFactory: configureDefaultWorkerFactory,
    },
    languageClientConfigs: {
      configs: {
        java: {
          connection: {
            options: {
              $type: "WebSocketUrl",
              url: "ws://localhost:30003/jdtls",
            },
          },
          clientOptions: {
            documentSelector: ["java"],
            workspaceFolder: {
              index: 0,
              name: "workspace",
              uri: vscode.Uri.file(eclipseJdtLsConfig.basePath),
            },
          },
        },
      },
    },
  };

  const wrapper = new MonacoEditorLanguageClientWrapper();

  try {
    document
      .querySelector("#button-start")
      ?.addEventListener("click", async () => {
        await wrapper.init(wrapperConfig);
        await wrapper.start();
        console.log("Language server started...");
      });
    document
      .querySelector("#button-dispose")
      ?.addEventListener("click", async () => {
        await wrapper.dispose();
      });

    document
      .querySelector("#button-browse-files")
      ?.addEventListener("click", async () => {
        try {
          const fileBrowser = document.getElementById("file-browser");
          const fileList = document.getElementById("file-list");

          if (!fileBrowser || !fileList) return;

          // Toggle visibility
          if (fileBrowser.style.display === "none") {
            console.log("Loading file list...");

            // Clear existing list
            fileList.innerHTML = "";

            // Load files
            const javaFiles = await FileService.getJavaFiles();

            if (javaFiles.length === 0) {
              fileList.innerHTML = "<li>No Java files found in workspace</li>";
            } else {
              javaFiles.forEach((file) => {
                const li = document.createElement("li");
                li.style.cursor = "pointer";
                li.style.padding = "2px 0";
                li.textContent = file.path;

                li.addEventListener("click", async () => {
                  try {
                    console.log(`Loading file: ${file.path}`);

                    // Create a unique URI for this file to avoid conflicts
                    const uri = vscode.Uri.file(
                      `${eclipseJdtLsConfig.basePath}/${file.path}`
                    );

                    const ref = await createModelReference(uri);

                    wrapper.getEditor()?.setModel(ref.object.textEditorModel);

                    const doc = await vscode.workspace.openTextDocument(uri);
                    await vscode.window.showTextDocument(doc, {
                      preserveFocus: false,
                      preview: true,
                      viewColumn: vscode.ViewColumn.Active,
                    });
                  } catch (error) {
                    console.error(`Failed to open file ${file.path}:`, error);
                    alert(
                      `Failed to open file: ${
                        error instanceof Error ? error.message : String(error)
                      }`
                    );
                  }
                });

                fileList.appendChild(li);
              });
            }

            fileBrowser.style.display = "block";
          } else {
            fileBrowser.style.display = "none";
          }
        } catch (error) {
          console.error("Failed to browse files:", error);
          alert(
            `Failed to browse files: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      });

    // WPILib projects functionality
    document
      .querySelector("#button-wpilib-projects")
      ?.addEventListener("click", async () => {
        try {
          const projectsDiv = document.getElementById("wpilib-projects");
          const projectList = document.getElementById("project-list");

          if (!projectsDiv || !projectList) return;

          // Toggle visibility
          if (projectsDiv.style.display === "none") {
            console.log("Loading WPILib projects...");

            // Clear existing list
            projectList.innerHTML = "";

            // Load projects
            const projects = await FileService.listWPILibProjects();

            if (projects.length === 0) {
              projectList.innerHTML = "<li>No WPILib projects found</li>";
            } else {
              projects.forEach((project) => {
                const li = document.createElement("li");
                li.innerHTML = `<strong>${project.name}</strong> (Team: ${project.teamNumber}, Year: ${project.projectYear})`;
                li.style.cursor = "pointer";
                li.style.padding = "5px";
                li.style.borderBottom = "1px solid #eee";

                li.addEventListener("click", async () => {
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
                });

                li.addEventListener("mouseenter", () => {
                  li.style.backgroundColor = "#f0f0f0";
                });
                li.addEventListener("mouseleave", () => {
                  li.style.backgroundColor = "";
                });

                projectList.appendChild(li);
              });
            }

            projectsDiv.style.display = "block";
          } else {
            projectsDiv.style.display = "none";
          }
        } catch (error) {
          console.error("Failed to load WPILib projects:", error);
          alert(
            `Failed to load WPILib projects: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      });

    // Generate Robot Project functionality
    document
      .querySelector("#button-generate-project")
      ?.addEventListener("click", async () => {
        try {
          const generationDiv = document.getElementById("project-generation");
          if (!generationDiv) return;

          // Toggle visibility
          if (generationDiv.style.display === "none") {
            generationDiv.style.display = "block";
          } else {
            generationDiv.style.display = "none";
          }
        } catch (error) {
          console.error("Failed to show project generation form:", error);
        }
      });

    // Handle project generation form submission
    document
      .querySelector("#generate-form")
      ?.addEventListener("submit", async (event) => {
        event.preventDefault();

        try {
          const form = event.target as HTMLFormElement;
          const formData = new FormData(form);

          const options = {
            name: formData.get("projectName") as string,
            teamNumber: parseInt(formData.get("teamNumber") as string) || undefined,
            packageName: formData.get("packageName") as string || undefined,
          };

          if (!options.name) {
            alert("Project name is required");
            return;
          }

          const statusDiv = document.getElementById("generation-status");
          if (statusDiv) {
            statusDiv.textContent = "Generating project...";
            statusDiv.style.color = "blue";
          }

          console.log("Generating WPILib project with options:", options);
          const result = await FileService.generateWPILibProject(options);

          if (statusDiv) {
            if (result.success) {
              statusDiv.textContent = `Project '${result.projectName}' generated successfully!`;
              statusDiv.style.color = "green";

              // Clear the form
              form.reset();

              // Optionally hide the form after successful generation
              setTimeout(() => {
                const generationDiv = document.getElementById("project-generation");
                if (generationDiv) {
                  generationDiv.style.display = "none";
                }
              }, 2000);
            } else {
              statusDiv.textContent = `Failed to generate project: ${result.message}`;
              statusDiv.style.color = "red";
            }
          }
        } catch (error) {
          console.error("Failed to generate project:", error);
          const statusDiv = document.getElementById("generation-status");
          if (statusDiv) {
            statusDiv.textContent = `Error: ${
              error instanceof Error ? error.message : String(error)
            }`;
            statusDiv.style.color = "red";
          }
        }
      });

  } catch (e) {
    console.error(e);
  }
};
