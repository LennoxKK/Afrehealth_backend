'use client';

import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  LineElement, 
  PointElement, 
  ArcElement, 
  Title, 
  Tooltip, 
  Legend,
  Filler,
  BubbleController,
  ScatterController,
  BarController,
  LineController,
  PieController,
  DoughnutController,
  RadarController,
  PolarAreaController
} from 'chart.js';
import { 
  Bar, 
  Line, 
  Pie,
  Scatter,
  Bubble,
  Doughnut,
  Radar,
  PolarArea
} from 'react-chartjs-2';
import { ChartData } from '../../types';
import zoomPlugin from 'chartjs-plugin-zoom';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Box, Typography } from '@mui/material';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin,
  annotationPlugin,
  BubbleController,
  ScatterController,
  BarController,
  LineController,
  PieController,
  DoughnutController,
  RadarController,
  PolarAreaController
);

interface CorrelationChartProps {
  chartType: string;
  data: ChartData;
  options?: any;
  height?: string | number;
  width?: string | number;
}

export const CorrelationChart = ({ 
  chartType, 
  data, 
  options = {}, 
  height = '100%',
  width = '100%'
}: CorrelationChartProps) => {
  const shouldSimplifyLegend = data.labels.length === 1 && data.questionTexts.length === 1;

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 10,
          boxHeight: 10,
          padding: 20,
          font: { size: 12 },
          // Filter legend items
          filter: (legendItem: any, chartData: any) => {
            const dataset = chartData.datasets[legendItem.datasetIndex];
            // Only show legend items for datasets associated with selected diseases (in data.labels)
            const isAssociatedWithSelectedDisease = data.labels.includes(dataset.disease);
            if (!isAssociatedWithSelectedDisease) return false;

            // Ensure unique labels (e.g., only one "Yes" and one "No")
            const seenLabels = chartData.datasets
              .slice(0, legendItem.datasetIndex)
              .map((d: any) => d.label);
            return !seenLabels.includes(legendItem.text);
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const value = context.raw || 0;
            const question = data.questionTexts[context.dataIndex] || '';
            const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value} (${percentage}%) (${question})`;
          }
        }
      },
      zoom: {
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: 'xy',
        },
        pan: { enabled: true, mode: 'xy' }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Diseases',
          font: { weight: 'bold' }
        }
      },
      y: {
        title: {
          display: true,
          text: 'Responses',
          font: { weight: 'bold' }
        },
        beginAtZero: true
      }
    },
    ...options
  };

  if (shouldSimplifyLegend) {
    baseOptions.plugins.legend = {
      display: true,
      labels: {
        filter: (item: any, chart: any) => {
          return !item.text || chart.legend.legendItems.findIndex(
            (i: any) => i.text === item.text) === item.index;
        }
      }
    };
  }

  const renderChart = () => {
    switch (chartType.toLowerCase()) {
      case 'bar':
        return <Bar data={data} options={baseOptions} height={height} width={width} />;
      case 'line':
        return <Line data={data} options={baseOptions} height={height} width={width} />;
      case 'pie':
        return <Pie data={data} options={baseOptions} height={height} width={width} />;
      case 'scatter':
        return <Scatter data={data} options={baseOptions} height={height} width={width} />;
      case 'bubble':
        return <Bubble data={data} options={baseOptions} height={height} width={width} />;
      case 'doughnut':
        return <Doughnut data={data} options={baseOptions} height={height} width={width} />;
      case 'radar':
        return <Radar data={data} options={baseOptions} height={height} width={width} />;
      case 'polar':
        return <PolarArea data={data} options={baseOptions} height={height} width={width} />;
      default:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="error">
              Invalid chart type: {chartType}. Please select a valid chart type (bar, line, pie, etc.).
            </Typography>
          </Box>
        );
    }
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {renderChart()}
    </Box>
  );
};