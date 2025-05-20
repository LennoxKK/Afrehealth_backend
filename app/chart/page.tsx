'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Box, Typography, TextField, Button, Grid, Paper, CircularProgress, Alert,
  Fade, Grow, Slide, Zoom, useMediaQuery, Theme, MenuItem, Select, InputLabel, FormControl,
  Chip, Tooltip, IconButton
} from '@mui/material';
import { motion } from 'framer-motion';
import { useTheme } from '@mui/material/styles';
import { CorrelationChart } from '../components/charts/correlationChart';
import Sidebar from '../components/Sidebar';
import debounce from 'lodash/debounce';
import { InfoOutlined, BarChartOutlined, LineStyleOutlined, PieChartOutlined, BubbleChartOutlined } from '@mui/icons-material';

// Simple fuzzy matching function (Levenshtein distance)
const getLevenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = Array(b.length + 1).fill(0).map(() => Array(a.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  return matrix[b.length][a.length];
};

// Color manipulation utilities
const lightenColor = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, ((num >> 16) + amt));
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return `#${(0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1).padStart(6, '0')}`;
};

const darkenColor = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, ((num >> 16) - amt));
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return `#${(0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1).padStart(6, '0')}`;
};

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
    question?: string;
  }[];
  questionTexts: string[];
}

interface ExtractedInfo {
  diseases: string[];
  variables: string[];
  chartType: string;
}

const chartTypeOptions = [
  { value: 'bar', label: 'Bar', icon: <BarChartOutlined /> },
  { value: 'line', label: 'Line', icon: <LineStyleOutlined /> },
  { value: 'pie', label: 'Pie', icon: <PieChartOutlined /> },
  { value: 'bubble', label: 'Bubble', icon: <BubbleChartOutlined /> },
];

export default function AnalysisPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const inputRef = useRef<HTMLDivElement>(null);
  
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [choices, setChoices] = useState<{ [questionId: number]: Choice[] }>({});
  const [chartData, setChartData] = useState<ChartData>({
    labels: [],
    datasets: [],
    questionTexts: []
  });
  const [inputText, setInputText] = useState<string>('');
  const [extractedInfo, setExtractedInfo] = useState<ExtractedInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedChartType, setSelectedChartType] = useState<string>('bar');

  const OPENAI_API_KEY = 'a0BIj000001iX7PMAU';
  const OPENAI_BASE_URL = 'https://47v4us7kyypinfb5lcligtc3x40ygqbs.lambda-url.us-east-1.on.aws/v1/';
  const MODEL = 'gpt-4o';

  const colorPalette = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.error.main,
    theme.palette.warning.main,
    theme.palette.info.main,
  ];

  const fetchFromAPI = async (action: string, params: Record<string, any> = {}) => {
    try {
      const query = new URLSearchParams({ action, ...params }).toString();
      const response = await fetch(`/api/db?${query}`);
      if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`API Error (${action}):`, error);
      throw error;
    }
  };

  useEffect(() => {
    const loadDiseasesAndQuestions = async () => {
      try {
        const diseaseData = await fetchFromAPI('getDiseases');
        setDiseases(diseaseData);
        const allQuestions: Question[] = [];
        for (const disease of diseaseData) {
          const questionData = await fetchFromAPI('getQuestions', { diseaseId: disease.disease_id });
          allQuestions.push(...questionData);
        }
        setQuestions(allQuestions);
      } catch (err) {
        setError('Failed to load diseases or questions. Please try again.');
      }
    };
    loadDiseasesAndQuestions();
  }, []);

  useEffect(() => {
    const loadChoices = async () => {
      if (!extractedInfo || extractedInfo.variables.length === 0) {
        setChoices({});
        return;
      }
      const selectedQuestions = questions
        .filter(q => extractedInfo.variables.includes(q.question_text))
        .map(q => q.id);
      const newChoices: { [questionId: number]: Choice[] } = {};
      try {
        for (const questionId of selectedQuestions) {
          const data = await fetchFromAPI('getChoices', { questionId });
          newChoices[questionId] = data && data.length > 0 ? data : [
            { id: 1, choice_text: 'Male' },
            { id: 2, choice_text: 'Female' },
            { id: 3, choice_text: 'Other' }
          ];
        }
        setChoices(newChoices);
      } catch (err) {
        setError('Failed to load choices. Using default options.');
        selectedQuestions.forEach(questionId => {
          newChoices[questionId] = [
            { id: 1, choice_text: 'Male' },
            { id: 2, choice_text: 'Female' },
            { id: 3, choice_text: 'Other' }
          ];
        });
        setChoices(newChoices);
      }
    };
    loadChoices();
  }, [questions, extractedInfo]);

  useEffect(() => {
    if (!extractedInfo || extractedInfo.diseases.length === 0 || extractedInfo.variables.length === 0) {
      setChartData({ labels: [], datasets: [], questionTexts: [] });
      return;
    }

    const generateChartData = async () => {
      setError(null);
      setLoading(true);
      try {
        const selectedDiseases = extractedInfo.diseases
          .map(d => diseases.find(db => db.disease_name.toLowerCase() === d.toLowerCase()))
          .filter(d => d)
          .map(d => d!.disease_id);
        const selectedQuestions = questions
          .filter(q => extractedInfo.variables.includes(q.question_text))
          .map(q => q.id);

        if (selectedDiseases.length === 0 || selectedQuestions.length === 0) {
          throw new Error('No valid diseases or questions selected.');
        }

        const responses: Response[] = await fetchFromAPI('getResponses', {
          diseaseIds: JSON.stringify(selectedDiseases),
          questionIds: JSON.stringify(selectedQuestions)
        });

        const analysis = analyzeResponses(responses, selectedDiseases, selectedQuestions);
        if (analysis.datasets.length === 0) {
          setError('No data available for the selected criteria.');
          setChartData({ labels: [], datasets: [], questionTexts: [] });
          return;
        }
        setChartData(analysis);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate chart.');
        setChartData({ labels: [], datasets: [], questionTexts: [] });
      } finally {
        setLoading(false);
      }
    };

    generateChartData();
  }, [extractedInfo, diseases, questions, choices]);

  const fetchFromOpenAI = async (prompt: string) => {
    try {
      const response = await fetch(`${OPENAI_BASE_URL}chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: 'system',
              content: `Extract:
              - Diseases (e.g., ["Malaria", "Cholera"])
              - Variables (e.g., ["age", "gender", "season", "climate change", "family size", "health facility", "treated last year", "weather conditions", "prevention tips"])
              - Chart type (e.g., bar, line, pie; default bar)
              Return JSON with "diseases", "variables", "chartType". Use empty arrays for missing data. Only include valid diseases (Malaria, Cholera, Heat Stress). Ensure valid JSON. Normalize "climat change" to "climate change". If a variable is invalid, suggest the closest match from the provided examples.`
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) throw new Error('API request failed.');
      const data = await response.json();
      if (!data.choices?.[0]?.message?.content) throw new Error('Invalid API response');
      return JSON.parse(data.choices[0].message.content);
    } catch (error) {
      throw error;
    }
  };

  const mapVariableToQuestion = (disease: string, variable: string, diseaseId: number) => {
    let normalizedVariable = variable.toLowerCase();
    if (normalizedVariable.includes('climat')) {
      normalizedVariable = normalizedVariable.replace('climat', 'climate');
    }
    const diseaseQuestions = questions.filter(q => q.disease_id === diseaseId);

    if (normalizedVariable.includes('age') || normalizedVariable.includes('older')) {
      return diseaseQuestions.find(q => q.question_text.includes('older than 35 years old'))?.question_text || variable;
    } else if (normalizedVariable.includes('gender') || normalizedVariable.includes('male') || normalizedVariable.includes('female')) {
      return diseaseQuestions.find(q => q.question_text.includes('Male or Female'))?.question_text || variable;
    } else if (normalizedVariable.includes('family') || normalizedVariable.includes('four')) {
      return diseaseQuestions.find(q => q.question_text.includes('more than four in my family'))?.question_text || variable;
    } else if (normalizedVariable.includes('season') || normalizedVariable.includes('rainy') || normalizedVariable.includes('dry')) {
      return diseaseQuestions.find(q => q.question_text.includes('rainy season'))?.question_text || variable;
    } else if (normalizedVariable.includes('climate change')) {
      return diseaseQuestions.find(q => q.question_text.includes('climate change'))?.question_text || variable;
    } else if (normalizedVariable.includes('treated') && normalizedVariable.includes('last year')) {
      return diseaseQuestions.find(q => q.question_text.includes('treated') && q.question_text.includes('last year'))?.question_text || variable;
    } else if (normalizedVariable.includes('weather conditions')) {
      return diseaseQuestions.find(q => q.question_text.includes('weather conditions'))?.question_text || variable;
    } else if (normalizedVariable.includes('prevention tips')) {
      return diseaseQuestions.find(q => q.question_text.includes('prevention tips'))?.question_text || variable;
    } else if (normalizedVariable.includes('health facility') || normalizedVariable.includes('location')) {
      return diseaseQuestions.find(q => q.question_text.includes('health facility'))?.question_text || variable;
    }

    let closestMatch: string | null = null;
    let minDistance = Infinity;
    for (const question of diseaseQuestions) {
      const distance = getLevenshteinDistance(normalizedVariable, question.question_text.toLowerCase());
      if (distance < minDistance) {
        minDistance = distance;
        closestMatch = question.question_text;
      }
    }
    return closestMatch && minDistance < 10 ? closestMatch : variable;
  };

  const analyzeResponses = (responses: Response[], selectedDiseases: number[], selectedQuestions: number[]) => {
    const labels = selectedDiseases.map(diseaseId => 
      diseases.find(d => d.disease_id === diseaseId)?.disease_name || `Disease ${diseaseId}`
    );

    const datasets: any[] = [];
    const questionIndexMap = new Map<number, number>();
    selectedQuestions.forEach((qId, index) => questionIndexMap.set(qId, index));

    // Group by question
    selectedQuestions.forEach((questionId, qIndex) => {
      const question = questions.find(q => q.id === questionId);
      const questionText = question?.question_text || `Question ${questionId}`;
      const questionChoices = choices[questionId] || [
        { id: 1, choice_text: 'Male' },
        { id: 2, choice_text: 'Female' },
        { id: 3, choice_text: 'Other' }
      ];

      // Assign a base color to the question from the color palette
      const baseColor = colorPalette[qIndex % colorPalette.length];

      questionChoices.forEach((choice, choiceIndex) => {
        const data = Array(labels.length).fill(0);

        // Calculate response counts for this choice across diseases
        selectedDiseases.forEach((diseaseId, dIndex) => {
          const count = responses.filter(r => 
            r.disease_id === diseaseId && 
            r.question_id === questionId && 
            r.choice_id === choice.id
          ).length;
          data[dIndex] = count;
        });

        // Generate color variations: darker for first choice, lighter for second
        let choiceColor = baseColor;
        if (choiceIndex === 0) {
          choiceColor = darkenColor(baseColor, 20); // Darken by 20%
        } else if (choiceIndex === 1) {
          choiceColor = lightenColor(baseColor, 20); // Lighten by 20%
        } else {
          choiceColor = baseColor; // Use base color for 'Other' or additional choices
        }

        datasets.push({
          label: `${questionText}: ${choice.choice_text}`,
          data,
          backgroundColor: choiceColor,
          borderColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100],
          borderWidth: 1,
          question: questionText
        });
      });
    });

    // Filter out datasets where all data points are 0
    const filteredDatasets = datasets.filter(dataset => 
      dataset.data.some((value: number) => value > 0)
    );

    return {
      labels,
      datasets: filteredDatasets,
      questionTexts: selectedQuestions.map(qId => {
        const q = questions.find(q => q.id === qId);
        return q?.question_text || '';
      })
    };
  };

  const debouncedAnalyzeInput = useCallback(
    debounce(async () => {
      setError(null);
      setExtractedInfo(null);
      setChartData({ labels: [], datasets: [], questionTexts: [] });

      if (!inputText.trim()) {
        setError('Please enter a description.');
        return;
      }

      setLoading(true);
      try {
        const analysis = await fetchFromOpenAI(inputText);
        const { diseases: extractedDiseases, variables: extractedVariables } = analysis;

        const validDiseases = extractedDiseases
          .map(d => diseases.find(db => db.disease_name.toLowerCase() === d.toLowerCase()))
          .filter(d => d)
          .map(d => d!.disease_name);

        if (validDiseases.length === 0) {
          setError('No valid diseases found. Try: Malaria, Cholera, Heat Stress.');
          setLoading(false);
          return;
        }

        const mappedResults: { disease: string; variables: string[] }[] = validDiseases.map(disease => {
          const diseaseId = diseases.find(d => d.disease_name === disease)!.disease_id;
          const diseaseQuestions = questions.filter(q => q.disease_id === diseaseId);
          const mappedVariables = extractedVariables
            .map(v => mapVariableToQuestion(disease, v, diseaseId))
            .filter(v => diseaseQuestions.some(q => q.question_text === v));
          return { disease, variables: mappedVariables };
        });

        const hasValidVariables = mappedResults.some(r => r.variables.length > 0);
        if (!hasValidVariables) {
          setError('No valid variables. Try: age, gender, season, climate change, etc.');
          setLoading(false);
          return;
        }

        setExtractedInfo({
          diseases: validDiseases,
          variables: Array.from(new Set(mappedResults.flatMap(r => r.variables))),
          chartType: selectedChartType,
        });
      } catch (err) {
        const inputLower = inputText.toLowerCase().replace('climat', 'climate');
        const fallbackDiseases = diseases
          .filter(d => inputLower.includes(d.disease_name.toLowerCase()))
          .map(d => d.disease_name);

        if (fallbackDiseases.length === 0) {
          setError('No valid diseases found. Try: Malaria, Cholera, Heat Stress.');
          setLoading(false);
          return;
        }

        let fallbackVariables: string[] = [];
        if (inputLower.includes('age') || inputLower.includes('older')) fallbackVariables.push('age');
        if (inputLower.includes('gender') || inputLower.includes('male') || inputLower.includes('female')) fallbackVariables.push('gender');
        if (inputLower.includes('family') || inputLower.includes('four')) fallbackVariables.push('family size');
        if (inputLower.includes('season') || inputLower.includes('rainy') || inputLower.includes('dry')) fallbackVariables.push('season');
        if (inputLower.includes('climate change')) fallbackVariables.push('climate change');
        if (inputLower.includes('treated') && inputLower.includes('last year')) fallbackVariables.push('treated last year');
        if (inputLower.includes('weather conditions')) fallbackVariables.push('weather conditions');
        if (inputLower.includes('prevention tips')) fallbackVariables.push('prevention tips');
        if (inputLower.includes('health facility') || inputLower.includes('location')) fallbackVariables.push('health facility');

        const mappedResults: { disease: string; variables: string[] }[] = fallbackDiseases.map(disease => {
          const diseaseId = diseases.find(d => d.disease_name === disease)!.disease_id;
          const diseaseQuestions = questions.filter(q => q.disease_id === diseaseId);
          const mappedVariables = fallbackVariables
            .map(v => mapVariableToQuestion(disease, v, diseaseId))
            .filter(v => diseaseQuestions.some(q => q.question_text === v));
          return { disease, variables: mappedVariables };
        });

        const hasValidVariables = mappedResults.some(r => r.variables.length > 0);
        if (!hasValidVariables) {
          setError('No valid variables. Try: age, gender, season, climate change, etc.');
          setLoading(false);
          return;
        }

        setExtractedInfo({
          diseases: fallbackDiseases,
          variables: Array.from(new Set(mappedResults.flatMap(r => r.variables))),
          chartType: selectedChartType,
        });
      } finally {
        setLoading(false);
        setTimeout(() => {
          window.scrollTo({
            top: inputRef.current?.offsetTop ? inputRef.current.offsetTop + 500 : 0,
            behavior: 'smooth'
          });
        }, 300);
      }
    }, 500),
    [inputText, selectedChartType, diseases, questions]
  );

  const handleKeyPress = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      debouncedAnalyzeInput();
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: theme.palette.background.default }}>
      <Sidebar />
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: { xs: 2, md: 4 }, 
          maxWidth: '1400px', 
          mx: 'auto',
          width: '100%'
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700, 
                color: theme.palette.text.primary,
                fontSize: { xs: '1.5rem', md: '2rem' },
              }}
            >
              Disease Analysis Dashboard
            </Typography>
            <Tooltip title="Analyze disease data and visualize relationships">
              <IconButton sx={{ ml: 1 }}>
                <InfoOutlined color="primary" />
              </IconButton>
            </Tooltip>
          </Box>
        </motion.div>

        {error && (
          <Slide direction="down" in={!!error} mountOnEnter unmountOnExit>
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3, 
                borderRadius: 2, 
                boxShadow: theme.shadows[1],
                alignItems: 'center'
              }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          </Slide>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Paper 
            ref={inputRef}
            sx={{ 
              p: 3, 
              mb: 4, 
              borderRadius: 3, 
              boxShadow: theme.shadows[2], 
              bgcolor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
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
              Analyze Disease Data
            </Typography>
            
            <Grid container spacing={2} alignItems="flex-end">
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  variant="outlined"
                  label="Enter analysis prompt"
                  placeholder="e.g., Show relationship between cholera and climate change by gender"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  multiline
                  rows={isMobile ? 2 : 3}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '& fieldset': { borderColor: theme.palette.divider },
                      '&:hover fieldset': { 
                        borderColor: theme.palette.primary.main,
                      },
                      '&.Mui-focused fieldset': { 
                        borderColor: theme.palette.primary.main,
                      },
                    },
                  }}
                />
              </Grid>
              
              <Grid item xs={6} md={2}>
                <FormControl fullWidth variant="outlined" size={isMobile ? 'small' : 'medium'}>
                  <InputLabel>Chart Type</InputLabel>
                  <Select
                    value={selectedChartType}
                    onChange={(e) => setSelectedChartType(e.target.value)}
                    label="Chart Type"
                  >
                    {chartTypeOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {option.icon}
                          {option.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={6} md={2}>
                <Button
                  variant="contained"
                  onClick={debouncedAnalyzeInput}
                  disabled={loading || !inputText.trim()}
                  fullWidth
                  size={isMobile ? 'medium' : 'large'}
                  sx={{
                    height: isMobile ? '40px' : '56px',
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Analyze'
                  )}
                </Button>
              </Grid>
            </Grid>
            
            <Typography 
              variant="caption" 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mt: 1, 
                color: theme.palette.text.secondary 
              }}
            >
              <InfoOutlined sx={{ fontSize: 14, mr: 0.5 }} />
              Press Enter to analyze (Shift + Enter for new line)
            </Typography>
          </Paper>
        </motion.div>

        {extractedInfo && (
          <Grow in={!!extractedInfo} style={{ transformOrigin: '0 0 0' }} {...(extractedInfo ? { timeout: 500 } : {})}>
            <Paper 
              sx={{ 
                p: 3, 
                mb: 4, 
                borderRadius: 3, 
                boxShadow: theme.shadows[2], 
                bgcolor: theme.palette.background.paper,
              }}
            >
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600, 
                  color: theme.palette.text.primary, 
                  mb: 2,
                }}
              >
                Analysis Parameters
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, color: theme.palette.text.secondary }}>
                      Selected Diseases
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {extractedInfo.diseases.map((disease) => (
                        <Chip
                          key={disease}
                          label={disease}
                          size="small"
                          sx={{
                            bgcolor: theme.palette.primary.light,
                            color: theme.palette.primary.contrastText,
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={6}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, color: theme.palette.text.secondary }}>
                      Selected Variables
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {extractedInfo.variables.map((variable) => (
                        <Tooltip key={variable} title={variable} arrow>
                          <Chip
                            label={variable.length > 20 ? `${variable.substring(0, 20)}...` : variable}
                            size="small"
                            sx={{
                              bgcolor: theme.palette.secondary.light,
                              color: theme.palette.secondary.contrastText,
                              maxWidth: '100%',
                            }}
                          />
                        </Tooltip>
                      ))}
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, color: theme.palette.text.secondary }}>
                      Visualization Type
                    </Typography>
                    <Chip
                      label={extractedInfo.chartType.charAt(0).toUpperCase() + extractedInfo.chartType.slice(1)}
                      icon={
                        chartTypeOptions.find(opt => opt.value === extractedInfo.chartType)?.icon || <BarChartOutlined />
                      }
                      sx={{
                        bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[200],
                        color: theme.palette.text.primary,
                      }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grow>
        )}

        {chartData.labels.length > 0 && chartData.datasets.length > 0 ? (
          <Zoom in={chartData.labels.length > 0} style={{ transitionDelay: '300ms' }}>
            <Paper 
              sx={{ 
                p: 3, 
                borderRadius: 3, 
                boxShadow: theme.shadows[2], 
                bgcolor: theme.palette.background.paper,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 600, 
                    color: theme.palette.text.primary,
                  }}
                >
                  Disease Comparison
                </Typography>
                {extractedInfo?.chartType && (
                  <Chip
                    label={`${extractedInfo.chartType.charAt(0).toUpperCase() + extractedInfo.chartType.slice(1)} Chart`}
                    size="small"
                    sx={{
                      bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[200],
                    }}
                  />
                )}
              </Box>
              
              <Box sx={{ 
                height: isMobile ? '300px' : isTablet ? '400px' : '500px',
                position: 'relative',
                borderRadius: 2,
                overflow: 'hidden'
              }}>
                <CorrelationChart 
                  chartType={extractedInfo?.chartType || 'bar'} 
                  data={chartData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                      duration: 1000,
                      easing: 'easeOutQuart'
                    },
                    plugins: {
                      legend: {
                        position: isMobile ? 'bottom' : 'right',
                        labels: {
                          font: { size: isMobile ? 10 : 12 },
                          padding: 20,
                          usePointStyle: true,
                        },
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
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Number of Responses',
                          font: { size: isMobile ? 12 : 14 },
                        },
                        grid: { color: theme.palette.divider },
                      },
                      x: {
                        title: {
                          display: true,
                          text: 'Diseases',
                          font: { size: isMobile ? 12 : 14 },
                        },
                        grid: { display: false },
                      }
                    }
                  }} 
                />
              </Box>
            </Paper>
          </Zoom>
        ) : (
          !loading && !extractedInfo && (
            <Fade in={!loading && !extractedInfo}>
              <Paper 
                sx={{ 
                  p: 3, 
                  textAlign: 'center', 
                  borderRadius: 3, 
                  boxShadow: theme.shadows[1], 
                  bgcolor: theme.palette.background.paper,
                  border: `1px dashed ${theme.palette.divider}`,
                  minHeight: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Box sx={{ opacity: 0.5, mb: 2 }}>
                  <BarChartOutlined sx={{ fontSize: 64 }} color="disabled" />
                </Box>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: theme.palette.text.secondary, 
                    maxWidth: '400px'
                  }}
                >
                  Enter a prompt to analyze disease data and visualize the results
                </Typography>
              </Paper>
            </Fade>
          )
        )}
      </Box>
    </Box>
  );
}