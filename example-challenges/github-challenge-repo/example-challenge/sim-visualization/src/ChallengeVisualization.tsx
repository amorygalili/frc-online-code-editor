import { useNTKeys } from 'frc-challenge-site';

/**
 * Challenge-specific visualization componsent.
 * This component has access to NT4 and HALSim data through the context providers
 * from frc-challenge-site.
 * 
 * Customize this component to create your challenge's unique visualization.
 */
export default function ChallengeVisualization() {
  const ntKeys = useNTKeys();
  return (
    <div style={{ 
      padding: '20px', 
      textAlign: 'center',
      borderRadius: '8px',
      margin: '10px'
    }}>
      <h2>Hello!</h2>
      <p>Challenge visualization will be displayed here.</p>
      <p>You can access NetworkTables data and HAL simulation data to create interactive visualizations.</p>
      <p>Available NT Keys: {JSON.stringify(ntKeys)}</p>
      
      {/* Add your custom visualization components here */}
      <div style={{ 
        marginTop: '20px',
        padding: '10px',
        borderRadius: '4px',
        border: '1px solid #ddd'
      }}>
        <p>Replace this placeholder with your challenge-specific visualization components.</p>
      </div>
    </div>
  )
}
