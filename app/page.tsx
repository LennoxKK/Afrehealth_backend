import { Box, Typography, Button } from '@mui/material';
import Link from 'next/link';

export default function Home() {
  return (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <Typography variant="h3" gutterBottom>
        Disease Survey Analysis Dashboard
      </Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        Analyze survey responses for Malaria, Cholera, and Heat Stress
      </Typography>
      <Button 
        variant="contained" 
        size="large"
        component={Link}
        href="/analysis"
      >
        Start Analyzing
      </Button>
    </Box>
  );
}