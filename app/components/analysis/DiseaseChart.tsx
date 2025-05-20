import { Box, Typography, Paper, Tabs, Tab } from '@mui/material';
import { Zoom } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import { ChartData } from '../../types';
import CorrelationChart from '../charts/correlationChart';
import { useState } from 'react';

interface DiseaseChartProps {
  chartData: ChartData;
  chartType: string;
}

export const DiseaseChart = ({ chartData, chartType }: DiseaseChartProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [tabValue, setTabValue] = useState(0);

  const chartTypes = [
    { label: 'Bar', value: 'bar' },
    { label: 'Line', value: 'line' },
    { label: 'Pie', value: 'pie' },
    { label: 'Scatter', value: 'scatter' },
    { label: 'Radar', value: 'radar' },
    { label: 'Polar', value: 'polar' }
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Zoom in={chartData.labels.length > 0} style={{ transitionDelay: '300ms' }}>
      <Paper 
        sx={{ 
          p: 3, 
          borderRadius: 3, 
          boxShadow: theme.shadows[4], 
          bgcolor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: theme.shadows[6]
          }
        }}
      >
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 600, 
            color: theme.palette.text.primary, 
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <span style={{ background: theme.palette.info.main, width: 4, height: 24, borderRadius: 2 }}></span>
          Disease Comparison
        </Typography>

        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="chart type tabs"
          sx={{ mb: 2 }}
        >
          {chartTypes.map((type, index) => (
            <Tab 
              key={type.value} 
              label={type.label} 
              sx={{ 
                textTransform: 'none',
                fontWeight: tabValue === index ? 600 : 400
              }} 
            />
          ))}
        </Tabs>

        <Box sx={{ 
          height: { xs: '300px', md: '500px' },
          position: 'relative',
          borderRadius: 2,
          overflow: 'hidden'
        }}>
          <CorrelationChart 
            chartType={chartTypes[tabValue].value} 
            data={chartData} 
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: isMobile ? 'bottom' : 'right',
                  labels: {
                    font: { 
                      size: isMobile ? 10 : 12, 
                      family: '"Roboto", sans-serif' 
                    },
                    padding: 20,
                    usePointStyle: true,
                    pointStyle: 'circle',
                    boxWidth: 10,
                    boxHeight: 10
                  },
                },
                title: {
                  display: true,
                  text: 'Disease Response Analysis',
                  font: { 
                    size: isMobile ? 14 : 18, 
                    weight: 'bold', 
                    family: '"Roboto", sans-serif' 
                  },
                  color: theme.palette.text.primary,
                  padding: { top: 10, bottom: 20 },
                },
                tooltip: {
                  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[900],
                  titleFont: { size: 14 },
                  bodyFont: { size: 12 },
                  callbacks: {
                    label: (context) => {
                      const label = context.dataset.label || '';
                      const value = context.raw || 0;
                      return `${label}: ${value} responses`;
                    }
                  }
                },
                zoom: {
                  limits: {
                    x: { min: 0, max: 100 },
                    y: { min: 0, max: 100 }
                  }
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Number of Responses',
                    font: { 
                      size: isMobile ? 12 : 14, 
                      family: '"Roboto", sans-serif' 
                    },
                    color: theme.palette.text.secondary,
                  },
                  grid: { 
                    color: theme.palette.divider,
                    drawBorder: false
                  },
                  ticks: {
                    color: theme.palette.text.secondary
                  }
                },
                x: {
                  title: {
                    display: true,
                    text: 'Diseases',
                    font: { 
                      size: isMobile ? 12 : 14, 
                      family: '"Roboto", sans-serif' 
                    },
                    color: theme.palette.text.secondary,
                  },
                  grid: { 
                    display: false,
                    drawBorder: false
                  },
                  ticks: {
                    color: theme.palette.text.secondary
                  }
                }
              }
            }} 
          />
        </Box>
      </Paper>
    </Zoom>
  );
};