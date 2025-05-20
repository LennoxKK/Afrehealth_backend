import { Alert } from '@mui/material';
import { Slide } from '@mui/material';

interface ErrorAlertProps {
  error: string | null;
}

export const ErrorAlert = ({ error }: ErrorAlertProps) => {
  return (
    <Slide direction="down" in={!!error} mountOnEnter unmountOnExit>
      <Alert 
        severity="error" 
        sx={{ 
          mb: 3, 
          borderRadius: 2, 
          boxShadow: 1,
          animation: 'shake 0.5s ease-in-out'
        }}
      >
        {error?.split('\n').map((line, index) => <div key={index}>{line}</div>)}
      </Alert>
    </Slide>
  );
};