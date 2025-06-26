import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Badge,
} from '@mui/material';
import {
  Build,
  NetworkCheck,
} from '@mui/icons-material';
import { BuildConsole } from './BuildConsole';
import { NetworkTablesViewer } from './NetworkTablesViewer';
import { useBuild } from '../contexts/BuildContext';
import { useNTConnection, useNTKeys } from '../nt4/useNetworktables';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`output-tabs-tabpanel-${index}`}
      aria-labelledby={`output-tabs-tab-${index}`}
      style={{ height: '100%', display: value === index ? 'flex' : 'none', flexDirection: 'column' }}
      {...other}
    >
      {value === index && children}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `output-tabs-tab-${index}`,
    'aria-controls': `output-tabs-tabpanel-${index}`,
  };
}

export const OutputTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const { buildOutput, buildStatus } = useBuild();
  const ntConnected = useNTConnection();
  const ntKeys = useNTKeys();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Count unread build messages (you could implement a more sophisticated system)
  const buildMessageCount = buildOutput.length;
  const hasActiveBuild = buildStatus === 'running';

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Tab Headers */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="output tabs"
          sx={{
            minHeight: 40,
            '& .MuiTab-root': {
              minHeight: 40,
              textTransform: 'none',
              fontSize: '0.875rem',
            },
          }}
        >
          <Tab
            icon={<Build fontSize="small" />}
            label={
              <Badge
                badgeContent={hasActiveBuild ? '●' : 0}
                color="primary"
                variant="dot"
                invisible={!hasActiveBuild}
              >
                Build Console
              </Badge>
            }
            iconPosition="start"
            {...a11yProps(0)}
          />
          <Tab
            icon={<NetworkCheck fontSize="small" />}
            label={
              <Badge
                badgeContent={ntKeys.length}
                color="secondary"
                max={999}
                invisible={!ntConnected || ntKeys.length === 0}
              >
                NetworkTables
              </Badge>
            }
            iconPosition="start"
            {...a11yProps(1)}
          />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <TabPanel value={activeTab} index={0}>
          <BuildConsole />
        </TabPanel>
        <TabPanel value={activeTab} index={1}>
          <NetworkTablesViewer />
        </TabPanel>
      </Box>
    </Box>
  );
};

export default OutputTabs;
