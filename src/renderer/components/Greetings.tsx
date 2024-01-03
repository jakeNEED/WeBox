import * as React from 'react';
import SwipeableViews from 'react-swipeable-views';
import { useTheme } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { ThemeProvider, createTheme } from '@mui/material/styles'; // 导入ThemeProvider
import SoundManger from './soundManger/SoundManger';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import PhotoSizeSelectActualIcon from '@mui/icons-material/PhotoSizeSelectActual';
import MissedVideoCallIcon from '@mui/icons-material/MissedVideoCall';
import ImageManager from './ImageManager/ImageManager';
interface TabPanelProps {
  children?: React.ReactNode;
  dir?: string;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`full-width-tabpanel-${index}`}
      aria-labelledby={`full-width-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `full-width-tab-${index}`,
    'aria-controls': `full-width-tabpanel-${index}`,
  };
}

export default function FullWidthTabs() {
  const theme = useTheme();
  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const handleChangeIndex = (index: number) => {
    setValue(index);
  };

  const appTheme = createTheme({ // 创建你的主题
    palette: {
      mode: 'dark', // 配置 dark mode
    },
  });
  return (
    <ThemeProvider theme={appTheme}>
      <Box sx={{ bgcolor: 'background.paper', width: 800 }}>
        <AppBar position="static">
          <Tabs
            value={value}
            onChange={handleChange}
            indicatorColor="secondary"
            textColor="inherit"
            variant="fullWidth"
            aria-label="full width tabs example"
            style={{ height: "70px)", width:"800px", backgroundColor: '#14161D' }} // 设置高度
          >
            <Tab icon={<GraphicEqIcon />} label="音频" {...a11yProps(0)} />
            <Tab icon={<PhotoSizeSelectActualIcon />} label="图片" {...a11yProps(1)} />
            <Tab icon={<MissedVideoCallIcon />} label="视频" {...a11yProps(2)} />
          </Tabs>
        </AppBar>
        <SwipeableViews
          axis={theme.direction === 'rtl' ? 'x-reverse' : 'x'}
          index={value}
          onChangeIndex={handleChangeIndex}
          style={{ height: "calc(100vh - 72px)", backgroundColor: '#13161F' }} // 设置高度
        >
          <TabPanel value={value} index={0} dir={theme.direction}>
            <SoundManger />
          </TabPanel>
          <TabPanel value={value} index={1} dir={theme.direction}>
            <ImageManager />
          </TabPanel>
          <TabPanel value={value} index={2} dir={theme.direction}>
            未开发，等待中
          </TabPanel>
        </SwipeableViews>
      </Box>
    </ThemeProvider>
  );
}