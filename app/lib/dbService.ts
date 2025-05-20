import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'lavarel'
};

interface Disease {
  disease_id: number;
  disease_name: string;
  description: string | null;
  image_path: string | null;
}

interface Question {
  id: number;
  disease_id: number;
  question_text: string;
  order: number;
}

interface Choice {
  id: number;
  question_id: number;
  choice_text: string;
}

interface Response {
  responder_id: number;
  disease_id: number;
  question_id: number;
  choice_id: number;
}

export async function getDiseases(): Promise<Disease[]> {
  const conn = await mysql.createConnection(DB_CONFIG);
  const [rows] = await conn.execute('SELECT * FROM diseases WHERE is_active = 1');
  conn.end();
  return rows as Disease[];
}

export async function getQuestions(diseaseId: number): Promise<Question[]> {
  const conn = await mysql.createConnection(DB_CONFIG);
  const [rows] = await conn.execute(
    'SELECT * FROM questions WHERE disease_id = ? AND is_active = 1 ORDER BY `order`',
    [diseaseId]
  );
  conn.end();
  return rows as Question[];
}

export async function getChoices(questionId: number): Promise<Choice[]> {
  const conn = await mysql.createConnection(DB_CONFIG);
  const [rows] = await conn.execute(
    'SELECT * FROM choices WHERE question_id = ? ORDER BY choice_order',
    [questionId]
  );
  conn.end();
  return rows as Choice[];
}

export async function getResponses(diseaseIds: number[], questionIds: number[]): Promise<Response[]> {
  const conn = await mysql.createConnection(DB_CONFIG);
  const [rows] = await conn.execute(
    `SELECT r.responder_id, r.disease_id, r.question_id, r.choice_id 
     FROM responses r
     WHERE r.disease_id IN (?) AND r.question_id IN (?)`,
    [diseaseIds, questionIds]
  );
  conn.end();
  return rows as Response[];
}

export async function getResponderDetails(responderIds: number[]): Promise<any[]> {
  const conn = await mysql.createConnection(DB_CONFIG);
  const [rows] = await conn.execute(
    'SELECT id, responder_name, latitude, longitude FROM responders WHERE id IN (?)',
    [responderIds]
  );
  conn.end();
  return rows as any[];
}