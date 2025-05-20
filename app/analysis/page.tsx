'use client';

import { useState, useEffect } from 'react';
import { 
  Box, Typography, FormControl, InputLabel, Select, 
  MenuItem, Button, Grid, Paper, CircularProgress,
  Chip, Stack, Checkbox, ListItemText, OutlinedInput,
  Alert
} from '@mui/material';
import {CorrelationChart} from '../components/charts/correlationChart';
import Sidebar from '../components/Sidebar';

// Interface definitions remain unchanged
interface Disease {
  disease_id: number;
  disease_name: string;
}

interface Question {
  id: number;
  disease_id: number;
  question_text: string;
  order: number;
}

interface Choice {
  id: number;
  choice_text: string;
}

interface Response {
  responder_id: number;
  disease_id: number;
  question_id: number;
  choice_id: number;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
  }[];
  questionTexts: string[];
}

export default function AnalysisPage() {
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [selectedDiseases, setSelectedDiseases] = useState<number[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
  const [choices, setChoices] = useState<{ [questionId: number]: Choice[] }>({});
  const [chartType, setChartType] = useState<string>('bar');
  const [chartData, setChartData] = useState<ChartData>({
    labels: [],
    datasets: [],
    questionTexts: []
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Base color palette for questions
  const baseQuestionColors = [
    { base: '#FF6384', light: 'rgba(255, 99, 132, 0.5)', dark: 'rgba(255, 99, 132, 0.9)' }, // Red
    { base: '#36A2EB', light: 'rgba(54, 162, 235, 0.5)', dark: 'rgba(54, 162, 235, 0.9)' }, // Blue
    { base: '#FFCE56', light: 'rgba(255, 206, 86, 0.5)', dark: 'rgba(255, 206, 86, 0.9)' }, // Yellow
    { base: '#4BC0C0', light: 'rgba(75, 192, 192, 0.5)', dark: 'rgba(75, 192, 192, 0.9)' }, // Teal
    { base: '#9966FF', light: 'rgba(153, 102, 255, 0.5)', dark: 'rgba(153, 102, 255, 0.9)' }, // Purple
    { base: '#FF9F40', light: 'rgba(255, 159, 64, 0.5)', dark: 'rgba(255, 159, 64, 0.9)' }  // Orange
  ];

  // Assign colors to questions and their choices
  const getChoiceColor = (questionIndex: number, choiceIndex: number) => {
    const colorSet = baseQuestionColors[questionIndex % baseQuestionColors.length];
    // Alternate between light and dark shades for choices
    return choiceIndex % 2 === 0 ? colorSet.light : colorSet.dark;
  };

  // Fetch data from API (unchanged)
  const fetchFromAPI = async (action: string, params: Record<string, any> = {}) => {
    try {
      const query = new URLSearchParams({ action, ...params }).toString();
      const response = await fetch(`/api/db?${query}`);
      if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  };

  // Load initial diseases (unchanged)
  useEffect(() => {
    const loadDiseases = async () => {
      try {
        const data = await fetchFromAPI('getDiseases');
        setDiseases(data);
      } catch (err) {
        setError('Failed to load diseases. Please try again.');
        console.error(err);
      }
    };
    loadDiseases();
  }, []);

  // Load questions when diseases are selected (unchanged)
  useEffect(() => {
    const loadQuestions = async () => {
      if (selectedDiseases.length === 0) {
        setQuestions([]);
        setChoices({});
        return;
      }
      
      try {
        const allQuestions: Question[] = [];
        for (const diseaseId of selectedDiseases) {
          const data = await fetchFromAPI('getQuestions', { diseaseId });
          allQuestions.push(...data);
        }
        setQuestions(allQuestions);
        setSelectedQuestions([]);
      } catch (err) {
        setError('Failed to load questions. Please try again.');
        console.error(err);
      }
    };
    loadQuestions();
  }, [selectedDiseases]);

  // Load choices for selected questions (unchanged)
  useEffect(() => {
    const loadChoices = async () => {
      const newChoices: { [questionId: number]: Choice[] } = {};
      try {
        for (const questionId of selectedQuestions) {
          const data = await fetchFromAPI('getChoices', { questionId });
          newChoices[questionId] = data;
        }
        setChoices(newChoices);
      } catch (err) {
        setError('Failed to load choices for selected questions.');
        console.error(err);
      }
    };
    loadChoices();
  }, [selectedQuestions]);

  // Generate chart data (unchanged)
  const generateChartData = async () => {
    setError(null);
    if (selectedDiseases.length === 0 || selectedQuestions.length === 0) {
      setChartData({
        labels: [],
        datasets: [],
        questionTexts: []
      });
      setError('Please select at least one disease and one question.');
      return;
    }
    
    setLoading(true);
    
    try {
      const responses: Response[] = await fetchFromAPI('getResponses', {
        diseaseIds: JSON.stringify(selectedDiseases),
        questionIds: JSON.stringify(selectedQuestions)
      });

      if (!responses || responses.length === 0) {
        throw new Error('No responses found for the selected criteria.');
      }

      const analysis = analyzeResponses(responses);
      setChartData(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate chart data.');
      setChartData({
        labels: [],
        datasets: [],
        questionTexts: []
      });
    } finally {
      setLoading(false);
    }
  };

  // Enhanced response analysis with updated color assignment
  const analyzeResponses = (responses: Response[]) => {
    // Map questions to their indices for consistent color assignment
    const questionIndexMap = new Map<number, number>();
    selectedQuestions.forEach((qId, index) => questionIndexMap.set(qId, index));

    // Get all unique choices for the selected questions
    const allChoices = selectedQuestions.flatMap((questionId, qIndex) => {
      return (choices[questionId] || []).map((choice, choiceIndex) => ({
        ...choice,
        questionId,
        color: getChoiceColor(qIndex, choiceIndex),
        questionText: questions.find(q => q.id === questionId)?.question_text || `Q${questionId}`
      }));
    });

    // Create labels - disease names
    const labels = selectedDiseases.map(diseaseId => {
      return diseases.find(d => d.disease_id === diseaseId)?.disease_name || `Disease ${diseaseId}`;
    });

    // Prepare datasets - one per choice
    const datasets = allChoices.map((choice) => {
      const data = selectedDiseases.map(diseaseId => {
        return responses.filter(r => 
          r.disease_id === diseaseId && 
          r.question_id === choice.questionId && 
          r.choice_id === choice.id
        ).length;
      });

      return {
        label: `${choice.questionText.substring(0, 10)}...: ${choice.choice_text}`,
        data,
        backgroundColor: choice.color,
        borderColor: choice.color.replace('0.5', '0.9').replace('0.9', '1.0'), // Use darker border
        borderWidth: 1
      };
    });

    return {
      labels,
      datasets,
      questionTexts: selectedQuestions.map(qId => {
        const q = questions.find(q => q.id === qId);
        return q?.question_text.substring(0, 30) + (q?.question_text.length > 30 ? '...' : '') || '';
      })
    };
  };

  // Render remains unchanged
  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Disease Comparison Analysis
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Select Diseases</InputLabel>
                <Select
                  multiple
                  value={selectedDiseases}
                  onChange={(e) => setSelectedDiseases(e.target.value as number[])}
                  input={<OutlinedInput label="Select Diseases" />}
                  renderValue={(selected) => (
                    <Stack gap={1} direction="row" flexWrap="wrap">
                      {selected.map((value) => (
                        <Chip 
                          key={value} 
                          label={diseases.find(d => d.disease_id === value)?.disease_name || `Disease ${value}`}
                        />
                      ))}
                    </Stack>
                  )}
                >
                  {diseases.map((disease) => (
                    <MenuItem key={disease.disease_id} value={disease.disease_id}>
                      <Checkbox checked={selectedDiseases.includes(disease.disease_id)} />
                      <ListItemText primary={disease.disease_name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Select Questions</InputLabel>
                <Select
                  multiple
                  value={selectedQuestions}
                  onChange={(e) => setSelectedQuestions(e.target.value as number[])}
                  input={<OutlinedInput label="Select Questions" />}
                  renderValue={(selected) => (
                    <Stack gap={1} direction="row" flexWrap="wrap">
                      {selected.map((value) => (
                        <Chip 
                          key={value} 
                          label={questions.find(q => q.id === value)?.question_text.substring(0, 20) + '...'} 
                        />
                      ))}
                    </Stack>
                  )}
                >
                  {questions.map((question) => (
                    <MenuItem key={question.id} value={question.id}>
                      <Checkbox checked={selectedQuestions.includes(question.id)} />
                      <ListItemText 
                        primary={question.question_text.substring(0, 30) + (question.question_text.length > 30 ? '...' : '')} 
                        secondary={`Disease: ${diseases.find(d => d.disease_id === question.disease_id)?.disease_name}`}
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3 }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Chart Type</InputLabel>
                  <Select
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value)}
                    label="Chart Type"
                  >
                    <MenuItem value="bar">Bar Chart</MenuItem>
                    <MenuItem value="line">Line Chart</MenuItem>
                    <MenuItem value="pie">Pie Chart</MenuItem>
                    <MenuItem value="doughnut">Doughnut Chart</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Button 
                  variant="contained" 
                  onClick={generateChartData}
                  disabled={loading || selectedDiseases.length === 0 || selectedQuestions.length === 0}
                  fullWidth
                  sx={{ height: '56px' }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Generate Comparison'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Paper>
        
        {chartData.labels.length > 0 && chartData.datasets.length > 0 ? (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Analyzing: {chartData.questionTexts.join(', ')}
            </Typography>
            <Box sx={{ height: '500px' }}>
              <CorrelationChart 
                chartType={chartType} 
                data={chartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                    },
                    title: {
                      display: true,
                      text: 'Disease Comparison by Choices',
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          const label = context.dataset.label || '';
                          const value = context.raw || 0;
                          return `${label}: ${value} responses`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Number of Responses'
                      }
                    },
                    x: {
                      title: {
                        display: true,
                        text: 'Diseases'
                      }
                    }
                  }
                }} 
              />
            </Box>
          </Paper>
        ) : (
          !loading && (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography>No chart data available. Select diseases and questions to analyze.</Typography>
            </Paper>
          )
        )}
      </Box>
    </Box>
  );
}