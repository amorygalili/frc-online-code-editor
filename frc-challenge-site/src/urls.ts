export function isALBEndpoint(serverUrl: string): boolean {
  return (
    serverUrl.includes("amazonaws.com") ||
    serverUrl.includes("elb.amazonaws.com") ||
    serverUrl.includes("cloudfront.net") ||
    (!serverUrl.includes("localhost") && !serverUrl.includes("127.0.0.1"))
  );
}


export type ServiceType = 'main' | 'nt' | 'halsim' | 'jdtls';

export function getServicePort(serviceType: ServiceType): number {
  switch (serviceType) {
    case 'main':
      return 30003;
    case 'nt':
      return 30004;
    case 'halsim':
      return 30005;
    case 'jdtls':
      return 30006;
    default:
      return 30003;
  }
}

function getProtocol(isALB: boolean, isWebsocketUrl: boolean): string {
  if (isWebsocketUrl) {
    return isALB ? 'wss' : 'ws';
  } else {
    return isALB ? 'https' : 'http';
  }
}

export function getServiceUrl(serverUrl: string, sessionId: string, serviceType: ServiceType, isWebsocketUrl = false): string {
  const isALB = isALBEndpoint(serverUrl);
  const port = getServicePort(serviceType);
  const protocol = getProtocol(isALB, isWebsocketUrl);

  if (isALB) {
    return `${protocol}://${serverUrl}/session/${sessionId}/${serviceType}`;
  } else {
    return `${protocol}://${serverUrl}:${port}/session/${sessionId}/${serviceType}`;
  }
}
