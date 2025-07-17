# NT4 NetworkTables Integration

This directory contains the NT4 NetworkTables integration for the WPILib Monaco Editor. It provides a React context-based approach to interact with NetworkTables using the NT4 protocol.

## Files

- `NT4.ts` - Core NT4 client implementation
- `useNetworktables.tsx` - React hooks and context provider for NT4 integration

## Usage

### 1. Setup the NT4Provider

Wrap your application with the `NT4Provider` to provide NT4 client access to all child components:

```tsx
import { NT4Provider } from './nt4/useNetworktables';

function App() {
  return (
    <NT4Provider serverAddress="localhost" appName="MyApp">
      <YourAppContent />
    </NT4Provider>
  );
}
```

### 2. Use NT4 Hooks

#### Get NT4 Client Instance

```tsx
import { useNt4Client } from './nt4/useNetworktables';

function MyComponent() {
  const client = useNt4Client();
  
  // Use client methods directly
  client.publishTopic('/my/topic', 'string');
  client.addSample('/my/topic', 'Hello World');
}
```

#### Monitor Connection Status

```tsx
import { useNTConnection } from './nt4/useNetworktables';

function ConnectionStatus() {
  const connected = useNTConnection();
  
  return (
    <div>
      Status: {connected ? 'Connected' : 'Disconnected'}
    </div>
  );
}
```

#### Get and Set NetworkTables Values

```tsx
import { useNTValue } from './nt4/useNetworktables';

function ValueComponent() {
  const [value, setValue] = useNTValue<string>('/my/key', 'default');
  
  return (
    <div>
      <p>Current value: {value}</p>
      <button onClick={() => setValue('New Value')}>
        Update Value
      </button>
    </div>
  );
}
```

#### Get All Available Keys

```tsx
import { useNTKeys } from './nt4/useNetworktables';

function KeysList() {
  const keys = useNTKeys();
  
  return (
    <ul>
      {keys.map(key => (
        <li key={key}>{key}</li>
      ))}
    </ul>
  );
}
```

#### Check if Key Exists

```tsx
import { useNTKeyExists } from './nt4/useNetworktables';

function KeyChecker() {
  const exists = useNTKeyExists('/my/key');
  
  return (
    <div>
      Key exists: {exists ? 'Yes' : 'No'}
    </div>
  );
}
```

### 3. Advanced Usage

#### Access Topic Data

```tsx
import { useNt4TopicData } from './nt4/useNetworktables';

function TopicDataComponent() {
  const topicData = useNt4TopicData();
  
  // Get specific topic data
  const myTopicData = topicData.get('/my/topic');
  
  return (
    <div>
      {myTopicData && (
        <div>
          <p>Value: {myTopicData.value}</p>
          <p>Timestamp: {myTopicData.timestamp}</p>
          <p>Topic Type: {myTopicData.topic.type}</p>
        </div>
      )}
    </div>
  );
}
```

## Error Handling

All hooks will throw an error if used outside of an `NT4Provider`:

```tsx
// This will throw an error
function BadComponent() {
  const client = useNt4Client(); // Error: useNt4Client must be used within an NT4Provider
  return <div>This won't work</div>;
}

// This is correct
function GoodComponent() {
  return (
    <NT4Provider serverAddress="localhost">
      <ComponentThatUsesNT4 />
    </NT4Provider>
  );
}
```

## Configuration

The `NT4Provider` accepts the following props:

- `serverAddress` (required): The address of the NT4 server (e.g., "localhost", "10.0.0.2")
- `appName` (optional): Name identifier for this client (default: "WPILib-Monaco-Editor")
- `children` (required): React components that will have access to NT4 context

## Example

See `components/NetworkTablesDemo.tsx` for a complete example of how to use the NT4 integration.
