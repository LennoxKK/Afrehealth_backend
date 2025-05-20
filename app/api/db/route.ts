import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'lavarel'
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  try {
    const conn = await mysql.createConnection(DB_CONFIG);
    
    let data;
    switch(action) {
      case 'getDiseases':
        [data] = await conn.execute('SELECT * FROM diseases WHERE is_active = 1');
        break;
      case 'getQuestions':
        const diseaseId = searchParams.get('diseaseId');
        [data] = await conn.execute(
          'SELECT * FROM questions WHERE disease_id = ? AND is_active = 1 ORDER BY `order`',
          [diseaseId]
        );
        break;
      case 'getResponses':
        const diseaseIds = JSON.parse(searchParams.get('diseaseIds') || '[]');
        const questionIds = JSON.parse(searchParams.get('questionIds') || '[]');

        if (!Array.isArray(diseaseIds) || diseaseIds.length === 0 || !Array.isArray(questionIds) || questionIds.length === 0) {
          return NextResponse.json({ error: 'Invalid or empty diseaseIds or questionIds' }, { status: 400 });
        }

        const diseasePlaceholders = diseaseIds.map(() => '?').join(', ');
        const questionPlaceholders = questionIds.map(() => '?').join(', ');

        const query = `
          SELECT r.responder_id, r.disease_id, r.question_id, r.choice_id 
          FROM responses r
          WHERE r.disease_id IN (${diseasePlaceholders}) AND r.question_id IN (${questionPlaceholders})
        `;
        const params = [...diseaseIds, ...questionIds];
        [data] = await conn.execute(query, params);
        break;
      case 'getChoices': // New action to fetch choices for a question
        const questionId = searchParams.get('questionId');
        if (!questionId) {
          return NextResponse.json({ error: 'Missing questionId' }, { status: 400 });
        }
        [data] = await conn.execute(
          'SELECT id, choice_text FROM choices WHERE question_id = ? ORDER BY choice_order',
          [questionId]
        );
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    await conn.end();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Database operation failed' },
      { status: 500 }
    );
  }
}