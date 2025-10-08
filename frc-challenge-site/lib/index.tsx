
// API functions that delegate to the global frcChallengeApi object
export async function mountEditor(element: HTMLElement) {
  return (window as any).frcChallengeApi.mountEditor(element);
}

export function setSimVisualization(element: JSX.Element) {
  return (window as any).frcChallengeApi.setSimVisualization(element);
}

export function getSimVisualization() {
  return (window as any).frcChallengeApi.getSimVisualization();
}
