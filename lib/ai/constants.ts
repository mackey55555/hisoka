/**
 * 逆転項目リスト
 * これらの設問はスコアを 6 - score で反転してから集計する
 */
export const REVERSE_ITEMS = [
  2, 4, 6, 8, 10,       // 外向性
  12, 14, 16, 18,        // 協調性
  22, 24, 26, 28,        // 誠実性
  32, 34, 39,            // 情緒性（Q32追加）
  42, 44, 46,            // 開放性
  51, 52, 53,            // 誠実さ・謙虚さ（Q51-53追加）
];

/**
 * 特性と設問番号の対応
 */
export const TRAIT_QUESTIONS: Record<string, number[]> = {
  extraversion:      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  agreeableness:     [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  conscientiousness: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
  emotionality:      [31, 32, 33, 34, 35, 36, 37, 38, 39, 40],
  openness:          [41, 42, 43, 44, 45, 46, 47, 48, 49, 50],
  honesty_humility:  [51, 52, 53],
  curiosity:         [54, 55, 56, 57, 58, 59, 60],
};

/**
 * 設問の総数
 */
export const TOTAL_QUESTIONS = 60;

/**
 * 分析に必要な最小テキスト長
 */
export const MIN_TEXT_LENGTH = 50;
