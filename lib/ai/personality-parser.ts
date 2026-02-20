import { REVERSE_ITEMS, TRAIT_QUESTIONS, TOTAL_QUESTIONS } from './constants';

export interface PersonalityParseResult {
  scores: Record<number, number>;
  traits: Record<string, 'HIGH' | 'LOW'>;
}

export interface TraitScore {
  score: number;
  level: 'HIGH' | 'LOW';
}

/**
 * 逆転項目のスコアを反転する
 */
function reverseScore(questionNum: number, rawScore: number): number {
  return REVERSE_ITEMS.includes(questionNum) ? 6 - rawScore : rawScore;
}

/**
 * 特性スコアを算出する（逆転処理後の平均）
 */
export function calcTraitScore(trait: string, scores: Record<number, number>): number {
  const questions = TRAIT_QUESTIONS[trait];
  if (!questions) {
    throw new Error(`未知の特性: "${trait}"`);
  }
  const sum = questions.reduce((acc, q) => acc + reverseScore(q, scores[q]), 0);
  return Math.round((sum / questions.length) * 10) / 10;
}

/**
 * AI応答テキストからパーソナリティスコアと特性を抽出する
 */
export function parsePersonalityResponse(text: string): PersonalityParseResult {
  // 60問のスコアを抽出
  const scoreRegex = /(\d+)\.\s*SCORE:\s*(\d)/g;
  const scores: Record<number, number> = {};
  let match;

  while ((match = scoreRegex.exec(text)) !== null) {
    const questionNum = parseInt(match[1], 10);
    const score = parseInt(match[2], 10);
    if (questionNum >= 1 && questionNum <= TOTAL_QUESTIONS && score >= 1 && score <= 5) {
      scores[questionNum] = score;
    }
  }

  if (Object.keys(scores).length !== TOTAL_QUESTIONS) {
    throw new Error(
      `スコアの抽出数が不正です: ${Object.keys(scores).length}問 (期待: ${TOTAL_QUESTIONS}問)`
    );
  }

  // 特性のHIGH/LOWを抽出
  const traitRegex = /(誠実さ|情緒性|外向性|協調性|誠実性|開放性|好奇心).*?(HIGH|LOW)/g;
  const traits: Record<string, 'HIGH' | 'LOW'> = {};
  const traitNameMap: Record<string, string> = {
    '誠実さ': 'honesty_humility',
    '情緒性': 'emotionality',
    '外向性': 'extraversion',
    '協調性': 'agreeableness',
    '誠実性': 'conscientiousness',
    '開放性': 'openness',
    '好奇心': 'curiosity',
  };

  while ((match = traitRegex.exec(text)) !== null) {
    const traitKey = traitNameMap[match[1]];
    if (traitKey) {
      traits[traitKey] = match[2] as 'HIGH' | 'LOW';
    }
  }

  return { scores, traits };
}

/**
 * パース結果から全特性のスコアとレベルを算出する
 */
export function calcAllTraitScores(
  scores: Record<number, number>,
  traits: Record<string, 'HIGH' | 'LOW'>
): Record<string, TraitScore> {
  const result: Record<string, TraitScore> = {};

  for (const trait of Object.keys(TRAIT_QUESTIONS)) {
    result[trait] = {
      score: calcTraitScore(trait, scores),
      level: traits[trait] || (calcTraitScore(trait, scores) >= 3.0 ? 'HIGH' : 'LOW'),
    };
  }

  return result;
}
