/**
 * パーソナリティパーサー動作確認テストスクリプト
 *
 * 実行方法: npx tsx scripts/test-personality-parser.ts
 */

import { parsePersonalityResponse, calcAllTraitScores } from '../lib/ai/personality-parser';
import { REVERSE_ITEMS, TRAIT_QUESTIONS } from '../lib/ai/constants';

// テスト用のAI応答サンプル（実際のAI出力を模したもの）
const sampleResponse = `
1. SCORE: 3
2. SCORE: 4
3. SCORE: 3
4. SCORE: 2
5. SCORE: 4
6. SCORE: 2
7. SCORE: 3
8. SCORE: 3
9. SCORE: 4
10. SCORE: 2
11. SCORE: 4
12. SCORE: 2
13. SCORE: 4
14. SCORE: 2
15. SCORE: 5
16. SCORE: 1
17. SCORE: 4
18. SCORE: 1
19. SCORE: 5
20. SCORE: 4
21. SCORE: 4
22. SCORE: 2
23. SCORE: 4
24. SCORE: 2
25. SCORE: 4
26. SCORE: 2
27. SCORE: 5
28. SCORE: 1
29. SCORE: 4
30. SCORE: 4
31. SCORE: 2
32. SCORE: 4
33. SCORE: 2
34. SCORE: 4
35. SCORE: 3
36. SCORE: 2
37. SCORE: 2
38. SCORE: 3
39. SCORE: 4
40. SCORE: 2
41. SCORE: 4
42. SCORE: 2
43. SCORE: 4
44. SCORE: 1
45. SCORE: 4
46. SCORE: 2
47. SCORE: 4
48. SCORE: 3
49. SCORE: 4
50. SCORE: 4
51. SCORE: 1
52. SCORE: 1
53. SCORE: 1
54. SCORE: 5
55. SCORE: 4
56. SCORE: 4
57. SCORE: 5
58. SCORE: 4
59. SCORE: 5
60. SCORE: 4

TRAITS:
誠実さ・謙虚さ (Honesty-Humility): HIGH
情緒性 (Emotionality): LOW
外向性 (Extraversion): HIGH
協調性 (Agreeableness): HIGH
誠実性 (Conscientiousness): HIGH
開放性 (Openness to Experience): HIGH
好奇心（Curiosity ※Opennessのサブ因子）: HIGH
`;

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

// --- テスト1: スコア抽出 ---
console.log('\n=== テスト1: 60問のスコア抽出 ===');
const result = parsePersonalityResponse(sampleResponse);
assert(Object.keys(result.scores).length === 60, '60問のスコアが抽出される');
assert(result.scores[1] === 3, 'Q1のスコアが3');
assert(result.scores[60] === 4, 'Q60のスコアが4');

// --- テスト2: 特性のHIGH/LOW抽出 ---
console.log('\n=== テスト2: 特性のHIGH/LOW抽出 ===');
assert(result.traits['honesty_humility'] === 'HIGH', '誠実さ・謙虚さがHIGH');
assert(result.traits['emotionality'] === 'LOW', '情緒性がLOW');
assert(result.traits['extraversion'] === 'HIGH', '外向性がHIGH');
assert(result.traits['agreeableness'] === 'HIGH', '協調性がHIGH');
assert(result.traits['conscientiousness'] === 'HIGH', '誠実性がHIGH');
assert(result.traits['openness'] === 'HIGH', '開放性がHIGH');
assert(result.traits['curiosity'] === 'HIGH', '好奇心がHIGH');

// --- テスト3: 逆転項目の反転処理 ---
console.log('\n=== テスト3: 逆転項目の反転処理 ===');
const allTraits = calcAllTraitScores(result.scores, result.traits);

// 外向性: Q1-Q10
// Q1=3, Q2=4(→2), Q3=3, Q4=2(→4), Q5=4, Q6=2(→4), Q7=3, Q8=3(→3はreverse対象外…Q8は逆転)
// REVERSE_ITEMS for extraversion: 2, 4, 6, 8, 10
// Q1=3, Q2=4→2, Q3=3, Q4=2→4, Q5=4, Q6=2→4, Q7=3, Q8=3→3, Q9=4, Q10=2→4
// sum = 3+2+3+4+4+4+3+3+4+4 = 34, avg = 3.4
assert(allTraits['extraversion'].score === 3.4, `外向性スコアが3.4 (実際: ${allTraits['extraversion'].score})`);

// 誠実さ・謙虚さ: Q51-Q53 (すべて逆転項目)
// Q51=1→5, Q52=1→5, Q53=1→5, avg = 5.0
assert(allTraits['honesty_humility'].score === 5.0, `誠実さ・謙虚さスコアが5.0 (実際: ${allTraits['honesty_humility'].score})`);

// 情緒性: Q31-Q40
// REVERSE_ITEMS: 32, 34, 39
// Q31=2, Q32=4→2, Q33=2, Q34=4→2, Q35=3, Q36=2, Q37=2, Q38=3, Q39=4→2, Q40=2
// sum = 2+2+2+2+3+2+2+3+2+2 = 22, avg = 2.2
assert(allTraits['emotionality'].score === 2.2, `情緒性スコアが2.2 (実際: ${allTraits['emotionality'].score})`);

// 好奇心: Q54-Q60 (逆転項目なし)
// Q54=5, Q55=4, Q56=4, Q57=5, Q58=4, Q59=5, Q60=4
// sum = 31, avg = 4.4 (31/7 = 4.428... → 4.4)
assert(allTraits['curiosity'].score === 4.4, `好奇心スコアが4.4 (実際: ${allTraits['curiosity'].score})`);

// --- テスト4: 全特性のスコアが妥当な範囲 ---
console.log('\n=== テスト4: 全特性スコアの範囲チェック ===');
for (const [trait, data] of Object.entries(allTraits)) {
  assert(data.score >= 1.0 && data.score <= 5.0, `${trait}: ${data.score} (1.0-5.0の範囲内)`);
  assert(data.level === 'HIGH' || data.level === 'LOW', `${trait}: level=${data.level}`);
}

// --- テスト5: 不正な入力のエラーハンドリング ---
console.log('\n=== テスト5: 不正入力のエラーハンドリング ===');
try {
  parsePersonalityResponse('invalid input');
  assert(false, '不正入力でエラーが投げられるべき');
} catch (e) {
  assert(true, `不正入力でエラー: ${(e as Error).message}`);
}

// --- テスト6: getModel() のインポート確認 ---
console.log('\n=== テスト6: getModel() のインポート確認 ===');
try {
  // 環境変数が設定されていなくてもインポートは成功する
  const { getModel } = require('../lib/ai/model');
  assert(typeof getModel === 'function', 'getModel がエクスポートされている');

  // デフォルト値（google:gemini-2.5-flash-lite）でモデルが返される
  const model = getModel();
  assert(model !== null && model !== undefined, 'getModel() がモデルインスタンスを返す');
} catch (e) {
  // APIキーが未設定の場合でも、モデルオブジェクト自体は作成されるはず
  assert(false, `getModel() でエラー: ${(e as Error).message}`);
}

// --- 結果サマリー ---
console.log('\n=============================');
console.log(`結果: ${passed} passed, ${failed} failed`);
console.log('=============================\n');

if (failed > 0) {
  process.exit(1);
}
