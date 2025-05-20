import { Typography, Paper } from '@mui/material';
import { Fade } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export const EmptyState = () => {
  const theme = useTheme();

  return (
    <Fade in={true}>
      <Paper 
        sx={{ 
          p: 3, 
          textAlign: 'center', 
          borderRadius: 3, 
          boxShadow: theme.shadows[2], 
          bgcolor: theme.palette.background.paper,
          border: `1px dashed ${theme.palette.divider}`,
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.5 }}>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke={theme.palette.text.secondary} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3.27 6.96L12 12.01l8.73-5.05" stroke={theme.palette.text.secondary} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 22.08V12" stroke={theme.palette.text.secondary} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <Typography 
          variant="body1" 
          sx={{ 
            color: theme.palette.text.secondary, 
            mt: 2,
            maxWidth: '400px'
          }}
        >
          Enter a prompt to analyze disease data and visualize the results
        </Typography>
      </Paper>
    </Fade>
  );
};