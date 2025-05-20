export interface Disease {
    disease_id: number;
    disease_name: string;
  }
  
  export interface Question {
    id: number;
    disease_id: number;
    question_text: string;
    order: number;
  }
  
  export interface Choice {
    id: number;
    choice_text: string;
  }
  
  export interface Response {
    responder_id: number;
    disease_id: number;
    question_id: number;
    choice_id: number;
  }
  
  export interface ChartData {
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
  
  export interface ExtractedInfo {
    diseases: string[];
    variables: string[];
    chartType: string;
  }