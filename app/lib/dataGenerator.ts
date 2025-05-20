interface Disease {
    id: number;
    name: string;
    questionStart: number;
    questionEnd: number;
  }
  
  interface Question {
    id: number;
    text: string;
  }
  
  interface Choice {
    id: number;
    choice_text: string;
  }
  
  export const generateDummyResponses = (count = 100) => {
    const diseases: Disease[] = [
      { id: 1, name: 'Malaria', questionStart: 97, questionEnd: 106 },
      { id: 2, name: 'Heat Stress', questionStart: 117, questionEnd: 126 },
      { id: 3, name: 'Cholera', questionStart: 107, questionEnd: 116 }
    ];
  
    return Array.from({ length: count }, (_, i) => {
      const disease = diseases[Math.floor(Math.random() * diseases.length)];
      return {
        id: i + 1,
        disease_id: disease.id,
        disease_name: disease.name,
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        answers: {} // Would be populated with actual answers in a real implementation
      };
    });
  };
  
  export const getQuestionsForDisease = (diseaseId: number): Question[] => {
    const questionMap: Record<number, Question[]> = {
      1: Array.from({ length: 10 }, (_, i) => ({
        id: 97 + i,
        text: `Malaria Question ${i + 1}`
      })),
      2: Array.from({ length: 10 }, (_, i) => ({
        id: 117 + i,
        text: `Heat Stress Question ${i + 1}`
      })),
      3: Array.from({ length: 10 }, (_, i) => ({
        id: 107 + i,
        text: `Cholera Question ${i + 1}`
      }))
    };
  
    return questionMap[diseaseId] || [];
  };
  
  export const getAllDiseases = (): Disease[] => {
    return [
      { id: 1, name: 'Malaria', questionStart: 97, questionEnd: 106 },
      { id: 2, name: 'Heat Stress', questionStart: 117, questionEnd: 126 },
      { id: 3, name: 'Cholera', questionStart: 107, questionEnd: 116 }
    ];
  };