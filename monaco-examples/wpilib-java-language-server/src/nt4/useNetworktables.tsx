import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
  memo,
} from "react";
import { NT4_Client, NT4_Topic } from "./NT4";
import { useConfig } from "../contexts/ConfigContext";

// Types for NT4 Context
interface TopicData {
  topic: NT4_Topic;
  value: unknown;
  timestamp: number;
}

interface NT4ContextType {
  client: NT4_Client | null;
  connected: boolean;
  topics: Map<string, NT4_Topic>;
  topicData: Map<string, TopicData>;
}

interface NT4ProviderProps {
  children: ReactNode;
}

// Create NT4 Context
const NT4Context = createContext<NT4ContextType | undefined>(undefined);

// NT4 Provider Component
export const NT4Provider: React.FC<NT4ProviderProps> = memo(({ children }) => {
  const {
    config: { sessionId, serverUrl },
  } = useConfig();
  const [connected, setConnected] = useState<boolean>(false);
  const [topics, setTopics] = useState<Map<string, NT4_Topic>>(new Map());
  const [topicData, setTopicData] = useState<Map<string, TopicData>>(new Map());
  const clientRef = useRef<NT4_Client | null>(null);

  // Initialize NT4 client
  useEffect(() => {
    const client = new NT4_Client(
      serverUrl,
      "frc-challenges",
      sessionId,
      // onTopicAnnounce
      (topic: NT4_Topic) => {
        setTopics((prev) => new Map(prev.set(topic.name, topic)));
      },
      // onTopicUnannounce
      (topic: NT4_Topic) => {
        setTopics((prev) => {
          const newTopics = new Map(prev);
          newTopics.delete(topic.name);
          return newTopics;
        });
      },
      // onNewTopicData
      (topic: NT4_Topic, timestamp_us: number, value: unknown) => {
        // Update topic data with the new value
        setTopicData(
          (prev) =>
            new Map(
              prev.set(topic.name, {
                topic,
                value,
                timestamp: timestamp_us,
              })
            )
        );
        // Also update topics map
        setTopics((prev) => new Map(prev.set(topic.name, topic)));
      },
      // onConnect
      () => {
        setConnected(true);
      },
      // onDisconnect
      () => {
        setConnected(false);
      }
    );

    clientRef.current = client;
    client.connect();
    client.subscribe(["/"], true, true);

    return () => {
      client.disconnect();
    };
  }, [sessionId, sessionId]);

  const contextValue: NT4ContextType = {
    client: clientRef.current,
    connected,
    topics,
    topicData,
  };

  return (
    <NT4Context.Provider value={contextValue}>{children}</NT4Context.Provider>
  );
});

// Custom hook to use NT4 client
export const useNt4Client = (): NT4_Client | null => {
  const context = useContext(NT4Context);
  if (!context) {
    throw new Error("useNt4Client must be used within an NT4Provider");
  }
  return context.client;
};

// Custom hook to get NT4 connection status
export const useNt4Connection = (): boolean => {
  const context = useContext(NT4Context);
  if (!context) {
    throw new Error("useNt4Connection must be used within an NT4Provider");
  }
  return context.connected;
};

// Custom hook to get NT4 topics
export const useNt4Topics = (): Map<string, NT4_Topic> => {
  const context = useContext(NT4Context);
  if (!context) {
    throw new Error("useNt4Topics must be used within an NT4Provider");
  }
  return context.topics;
};

// Custom hook to get NT4 topic data
export const useNt4TopicData = (): Map<string, TopicData> => {
  const context = useContext(NT4Context);
  if (!context) {
    throw new Error("useNt4TopicData must be used within an NT4Provider");
  }
  return context.topicData;
};

/**
 * Hook to get and set a NetworkTables value using NT4
 */
export function useNTValue<T>(
  key: string,
  defaultValue?: T
): [T | undefined, (value: T) => void] {
  const context = useContext(NT4Context);
  if (!context) {
    throw new Error("useNTValue must be used within an NT4Provider");
  }

  const { client, topicData } = context;
  const subscriptionRef = useRef<number | null>(null);

  // Get current value from topic data or use default
  const currentTopicData = topicData.get(key);
  const value = (currentTopicData?.value as T) ?? defaultValue;

  useEffect(() => {
    // Only subscribe if client is available
    if (!client) return;

    // Subscribe to the topic
    subscriptionRef.current = client.subscribe([key], false, false, 0.1);

    return () => {
      if (subscriptionRef.current !== null && client) {
        client.unsubscribe(subscriptionRef.current);
      }
    };
  }, [client, key]);

  const putValue = useCallback(
    (newValue: T) => {
      // Only publish if client is available
      if (!client) return;

      // First publish the topic if not already published
      client.publishTopic(
        key,
        typeof newValue === "string"
          ? "string"
          : typeof newValue === "number"
          ? "double"
          : typeof newValue === "boolean"
          ? "boolean"
          : "json"
      );

      // Then send the value
      client.addSample(key, newValue);
    },
    [client, key]
  );

  return [value, putValue];
}

/**
 * Hook to monitor the NT4 connection status
 */
export function useNTConnection(): boolean {
  return useNt4Connection();
}

/**
 * Hook to get all current NetworkTables keys
 */
export function useNTKeys(): string[] {
  const topics = useNt4Topics();
  return Array.from(topics.keys());
}

/**
 * Hook to check if a key exists in NetworkTables
 */
export function useNTKeyExists(key: string): boolean {
  const topics = useNt4Topics();
  return topics.has(key);
}
