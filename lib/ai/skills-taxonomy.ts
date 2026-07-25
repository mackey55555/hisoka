/**
 * 非認知能力ラベル体系 & 行動ルーブリック（単一の真実源 / SSOT）
 * ------------------------------------------------------------------
 * 課題整理_非認知能力の実装.md の §5-1・§8 に基づく T1 の成果物。
 *
 * 設計思想（研究エビデンスより, 同MD §3・§4）:
 *   × 「Big Five 特性スコアを代理回答で当てる」= 妥当性が弱い（実テキストで r≈0.27）
 *   ○ 「観察可能な行動のエビデンスを抽出し、ルーブリックに照らして段階＋根拠で示す」
 *
 * このファイルは "定義" のみを持つ（ロジックは持たない）。
 * 分析エンジン(T2)・マネージャー画面(T4)・自己理解の壁打ち(T5) はすべてここを参照する。
 *
 * ラベルの骨格 = OECD SSES（5領域×3スキル=15スキル, Big Five に対応）。
 * 表示名は LP の親しみやすい日本語を被せる（学術的裏付けと製品の言葉を両立）。
 */

/** Big Five の因子（OECD SSES 各領域が対応する） */
export type BigFiveFactor =
  | 'conscientiousness' // 誠実性
  | 'emotional_stability' // 情緒安定性
  | 'agreeableness' // 協調性
  | 'openness' // 開放性
  | 'extraversion'; // 外向性

/** SSES の5領域 */
export interface SkillDomain {
  id: string;
  /** 領域名（日本語） */
  name: string;
  /** 対応する Big Five 因子 */
  bigFive: BigFiveFactor;
  /** 領域の説明 */
  description: string;
}

/** ルーブリックの1段階（行動アンカー方式：観察可能な行動で定義する） */
export interface SkillRubricLevel {
  level: 1 | 2 | 3;
  /** 段階ラベル */
  label: '芽生え' | '発揮' | '牽引';
  /** この段階に当たる、テキストから観察可能な行動の記述 */
  descriptor: string;
}

/** 非認知能力スキル（15個） */
export interface NonCognitiveSkill {
  /** 一意なID（英小文字スネーク） */
  id: string;
  /** 所属する領域ID */
  domainId: string;
  /** OECD SSES の原語スキル名（トレーサビリティ用） */
  ssesName: string;
  /** LP寄せの日本語表示名（UI・本人向けに使う言葉） */
  displayName: string;
  /** このスキルが指すもの（1〜2文の定義） */
  definition: string;
  /** 3段階の行動ルーブリック（芽生え→発揮→牽引） */
  rubric: [SkillRubricLevel, SkillRubricLevel, SkillRubricLevel];
  /** エビデンス抽出のガイド：この行動が書かれていれば根拠になりうる例 */
  evidenceHints: string[];
}

/** ============================================================
 *  5 領域（OECD SSES）
 *  ============================================================ */
export const SKILL_DOMAINS: SkillDomain[] = [
  {
    id: 'task_performance',
    name: '課題遂行',
    bigFive: 'conscientiousness',
    description: '目標に向けて粘り強く、責任を持ち、自分を律してやり切る力',
  },
  {
    id: 'emotional_regulation',
    name: '情動制御',
    bigFive: 'emotional_stability',
    description: 'ストレスや不安に向き合い、気持ちを立て直し、前向きさを保つ力',
  },
  {
    id: 'collaboration',
    name: '協働',
    bigFive: 'agreeableness',
    description: '相手の気持ちを汲み、信頼し、仲間と支え合う力',
  },
  {
    id: 'open_mindedness',
    name: '開放性',
    bigFive: 'openness',
    description: '好奇心を持って学び、違いを受け入れ、工夫を生み出す力',
  },
  {
    id: 'engaging_with_others',
    name: '他者への関与',
    bigFive: 'extraversion',
    description: '人とつながり、自分の考えを伝え、場を活気づける力',
  },
];

/** ============================================================
 *  15 スキル（各領域 × 3）
 *  ============================================================ */
export const NON_COGNITIVE_SKILLS: NonCognitiveSkill[] = [
  // --- 課題遂行 (Task performance / 誠実性) ---
  {
    id: 'persistence',
    domainId: 'task_performance',
    ssesName: 'Persistence',
    displayName: 'やり抜く力',
    definition: '困難や停滞があっても、目標に向けてこつこつ努力を続けられる力。',
    rubric: [
      { level: 1, label: '芽生え', descriptor: '取り組みを始め、短期間なら継続できている' },
      { level: 2, label: '発揮', descriptor: 'うまくいかない時も投げ出さず、工夫しながら継続している' },
      { level: 3, label: '牽引', descriptor: '長期の目標を粘り強くやり切り、その姿勢が周囲の継続も後押ししている' },
    ],
    evidenceHints: ['毎日/毎週続けた', '諦めずにやり直した', '停滞しても取り組みを変えて続けた'],
  },
  {
    id: 'responsibility',
    domainId: 'task_performance',
    ssesName: 'Responsibility',
    displayName: '責任を果たす力',
    definition: '自分の役割や約束を理解し、最後までやり遂げる力。',
    rubric: [
      { level: 1, label: '芽生え', descriptor: '与えられた役割・締切を意識している' },
      { level: 2, label: '発揮', descriptor: '約束や締切を安定して守り、任された仕事をやり遂げている' },
      { level: 3, label: '牽引', descriptor: '自分の担当を超えて全体の責任を引き受け、抜け漏れを補っている' },
    ],
    evidenceHints: ['締切を守った', '任された役割をやり切った', '自分の担当として引き受けた'],
  },
  {
    id: 'self_control',
    domainId: 'task_performance',
    ssesName: 'Self-control',
    displayName: '自分を律する力',
    definition: '衝動や誘惑を抑え、優先順位に沿って行動を選べる力。',
    rubric: [
      { level: 1, label: '芽生え', descriptor: 'やるべきことと後回しにすべきことを区別しようとしている' },
      { level: 2, label: '発揮', descriptor: '誘惑や気の緩みを抑え、計画に沿って落ち着いて進めている' },
      { level: 3, label: '牽引', descriptor: '難所でも感情や衝動に流されず、優先順位を保って周囲の乱れも整えている' },
    ],
    evidenceHints: ['誘惑を我慢した', '優先順位を決めて進めた', '計画通りに自制して取り組んだ'],
  },

  // --- 情動制御 (Emotional regulation / 情緒安定性) ---
  {
    id: 'stress_resistance',
    domainId: 'emotional_regulation',
    ssesName: 'Stress resistance',
    displayName: '立て直す力',
    definition: 'プレッシャーや不安に向き合い、落ち着きを取り戻して前に進める力。',
    rubric: [
      { level: 1, label: '芽生え', descriptor: '不安やプレッシャーを自覚し、言葉にできている' },
      { level: 2, label: '発揮', descriptor: 'ストレスがかかっても落ち着きを取り戻し、行動を続けている' },
      { level: 3, label: '牽引', descriptor: '強い重圧の中でも冷静さを保ち、周囲の不安もやわらげている' },
    ],
    evidenceHints: ['緊張したが乗り越えた', '落ち込んだが立て直した', 'プレッシャーの中で対応した'],
  },
  {
    id: 'optimism',
    domainId: 'emotional_regulation',
    ssesName: 'Optimism',
    displayName: '前を向く力',
    definition: '困難の中でも良い面や次の一歩を見いだし、希望を保てる力。',
    rubric: [
      { level: 1, label: '芽生え', descriptor: 'うまくいかない時も前向きな見方をしようとしている' },
      { level: 2, label: '発揮', descriptor: '失敗を学びと捉え、次にどうするかを前向きに考えている' },
      { level: 3, label: '牽引', descriptor: '逆境でも希望を持ち続け、その前向きさがチームの空気を明るくしている' },
    ],
    evidenceHints: ['失敗を学びに変えた', '次はこうしようと考えた', '前向きに捉え直した'],
  },
  {
    id: 'emotional_control',
    domainId: 'emotional_regulation',
    ssesName: 'Emotional control',
    displayName: '気持ちを整える力',
    definition: '感情の高ぶりや苛立ちを自覚し、適切に扱える力。',
    rubric: [
      { level: 1, label: '芽生え', descriptor: '自分の感情の動きに気づけている' },
      { level: 2, label: '発揮', descriptor: '苛立ちや動揺を自覚し、落ち着いて対応できている' },
      { level: 3, label: '牽引', descriptor: '感情が揺れる場面でも安定して振る舞い、場の緊張を和らげている' },
    ],
    evidenceHints: ['苛立ちを抑えた', '感情的にならず対応した', '気持ちを切り替えた'],
  },

  // --- 協働 (Collaboration / 協調性) ---
  {
    id: 'empathy',
    domainId: 'collaboration',
    ssesName: 'Empathy',
    displayName: '気を利かせる力',
    definition: '相手の気持ちや状況を汲み取り、先回りして配慮できる力。',
    rubric: [
      { level: 1, label: '芽生え', descriptor: '相手の気持ちや状況に関心を向けている' },
      { level: 2, label: '発揮', descriptor: '相手の様子を察し、求められる前に配慮や手助けをしている' },
      { level: 3, label: '牽引', descriptor: '多様な立場の人の事情を汲み、場全体に目配りして支えている' },
    ],
    evidenceHints: ['相手の様子に気づいて動いた', '困っている人を手助けした', '先回りして配慮した'],
  },
  {
    id: 'trust',
    domainId: 'collaboration',
    ssesName: 'Trust',
    displayName: '人を信じて任せる力',
    definition: '相手を信頼し、任せたり頼ったりして協力関係を築ける力。',
    rubric: [
      { level: 1, label: '芽生え', descriptor: '人に頼る/任せることを受け入れつつある' },
      { level: 2, label: '発揮', descriptor: '相手を信頼して仕事を任せ、また自分も安心して頼れている' },
      { level: 3, label: '牽引', descriptor: '信頼を軸に役割を委ね合い、任せ合える関係をチームに広げている' },
    ],
    evidenceHints: ['相手に任せた', '人を頼った', '信頼して協力した'],
  },
  {
    id: 'cooperation',
    domainId: 'collaboration',
    ssesName: 'Cooperation',
    displayName: '仲間と支え合う力',
    definition: '共通の目標に向けて役割を分担し、協力して進められる力。',
    rubric: [
      { level: 1, label: '芽生え', descriptor: 'チームの一員として関わろうとしている' },
      { level: 2, label: '発揮', descriptor: '役割を分担し、他のメンバーと協力して物事を前に進めている' },
      { level: 3, label: '牽引', descriptor: 'チームを越えて協力を引き出し、支え合いの流れをつくっている' },
    ],
    evidenceHints: ['協力して進めた', '役割を分担した', '他の人と一緒に取り組んだ'],
  },

  // --- 開放性 (Open-mindedness / 開放性) ---
  {
    id: 'curiosity',
    domainId: 'open_mindedness',
    ssesName: 'Curiosity',
    displayName: '学び取る力',
    definition: '新しいことに関心を持ち、自ら調べ学び吸収できる力。',
    rubric: [
      { level: 1, label: '芽生え', descriptor: '新しいことに興味を示している' },
      { level: 2, label: '発揮', descriptor: '自ら調べ・学び、得たことを取り入れている' },
      { level: 3, label: '牽引', descriptor: '深く探究し、学んだことを周囲にも共有して学びを広げている' },
    ],
    evidenceHints: ['自分で調べた', '新しいことを学んだ', '知りたくて深掘りした'],
  },
  {
    id: 'tolerance',
    domainId: 'open_mindedness',
    ssesName: 'Tolerance',
    displayName: '違いを受け入れる力',
    definition: '自分と異なる意見や価値観を否定せず受け止められる力。',
    rubric: [
      { level: 1, label: '芽生え', descriptor: '自分と違う考えがあることを認めている' },
      { level: 2, label: '発揮', descriptor: '異なる意見を否定せず受け止め、取り入れようとしている' },
      { level: 3, label: '牽引', descriptor: '多様な立場を尊重し、違いを活かして議論や協働を前に進めている' },
    ],
    evidenceHints: ['違う意見を受け止めた', '自分と異なる考えを尊重した', '多様な見方を取り入れた'],
  },
  {
    id: 'creativity',
    domainId: 'open_mindedness',
    ssesName: 'Creativity',
    displayName: '工夫する力',
    definition: '既存のやり方にとらわれず、新しい発想や改善を生み出せる力。',
    rubric: [
      { level: 1, label: '芽生え', descriptor: 'やり方を変えてみる発想が出ている' },
      { level: 2, label: '発揮', descriptor: '自分なりの工夫やアイデアを試し、改善につなげている' },
      { level: 3, label: '牽引', descriptor: '新しい発想で仕組みや流れを変え、周囲の工夫も引き出している' },
    ],
    evidenceHints: ['工夫して改善した', '新しいやり方を試した', 'アイデアを出した'],
  },

  // --- 他者への関与 (Engaging with others / 外向性) ---
  {
    id: 'sociability',
    domainId: 'engaging_with_others',
    ssesName: 'Sociability',
    displayName: '仲間をつくる力',
    definition: '人に自分から関わり、関係やつながりを広げられる力。',
    rubric: [
      { level: 1, label: '芽生え', descriptor: '自分から人に関わろうとしている' },
      { level: 2, label: '発揮', descriptor: '積極的に人と関わり、関係やつながりを築いている' },
      { level: 3, label: '牽引', descriptor: '人と人をつなぎ、チームを越えたつながりを広げている' },
    ],
    evidenceHints: ['自分から話しかけた', '人と関係を築いた', '人をつないだ'],
  },
  {
    id: 'assertiveness',
    domainId: 'engaging_with_others',
    ssesName: 'Assertiveness',
    displayName: '考えを伝えて巻き込む力',
    definition: '自分の意見や役割を臆せず伝え、人を動かせる力。',
    rubric: [
      { level: 1, label: '芽生え', descriptor: '自分の考えを言葉にしようとしている' },
      { level: 2, label: '発揮', descriptor: '自分の意見や提案をはっきり伝え、行動につなげている' },
      { level: 3, label: '牽引', descriptor: '方向性を示して人を巻き込み、周囲を動かしている' },
    ],
    evidenceHints: ['自分の意見を伝えた', '提案した', '人を巻き込んで動かした'],
  },
  {
    id: 'energy',
    domainId: 'engaging_with_others',
    ssesName: 'Energy',
    displayName: '場を活気づける力',
    definition: '前向きな活力で、場の雰囲気を明るく和ませられる力。',
    rubric: [
      { level: 1, label: '芽生え', descriptor: '前向きな気持ちで場に関わっている' },
      { level: 2, label: '発揮', descriptor: '活力を持って動き、場の雰囲気を明るくしている' },
      { level: 3, label: '牽引', descriptor: '活気を生み出し、周囲のやる気や場の空気を引き上げている' },
    ],
    evidenceHints: ['場を和ませた', '雰囲気を明るくした', '元気にみんなを引っ張った'],
  },
];

/** ============================================================
 *  出力コントラクト（T2 の分析エンジンが返す想定の型）
 *  ------------------------------------------------------------
 *  「特性スコアを断定」しない。エビデンスが無ければ level=null（=判定しない）。
 *  必ず引用テキスト(evidence)と信頼度(confidence)を添える（MD §5-2, G5）。
 *  ============================================================ */
export interface SkillEvidence {
  /** 対象スキルID */
  skillId: string;
  /** 判定した段階。根拠が乏しい/該当なしは null（=判定しない） */
  level: 1 | 2 | 3 | null;
  /** 判定の信頼度（0.0〜1.0）。低い場合は表示側で弱める */
  confidence: number;
  /** 根拠となった本人テキストの引用（原文からそのまま抜き出す, 0件可） */
  quotes: string[];
  /** なぜその段階と判断したかの短い説明（推定であり評価確定ではない前提） */
  rationale: string;
}

/** ============================================================
 *  CASEL SEL（本人向けの「自己理解を深める」軸 / MD §8-2）
 *  スキルの可視化(SSES)とは別に、壁打ち(T5)の成長フレームとして使う。
 *  ============================================================ */
export interface CaselCompetency {
  id: string;
  name: string;
  description: string;
}

export const CASEL_COMPETENCIES: CaselCompetency[] = [
  { id: 'self_awareness', name: '自己理解', description: '自分の感情・思考・価値観と、それが行動に及ぼす影響を理解する' },
  { id: 'self_management', name: '自己管理', description: '感情・思考・行動を調整する（ストレス対処・衝動制御・目標設定）' },
  { id: 'social_awareness', name: '社会的気づき', description: '他者への共感、多様な視点・背景の理解' },
  { id: 'relationship_skills', name: '対人関係スキル', description: 'コミュニケーション・傾聴・協働・対立解消' },
  { id: 'responsible_decision_making', name: '責任ある意思決定', description: '自他の幸福を考えた倫理的な判断' },
];

/** ============================================================
 *  参照ヘルパー（定義の引き当て用。ロジックはT2以降で持つ）
 *  ============================================================ */
export const SKILL_BY_ID: Record<string, NonCognitiveSkill> = Object.fromEntries(
  NON_COGNITIVE_SKILLS.map((s) => [s.id, s]),
);

export const DOMAIN_BY_ID: Record<string, SkillDomain> = Object.fromEntries(
  SKILL_DOMAINS.map((d) => [d.id, d]),
);

/** 指定領域に属するスキル一覧を返す */
export function skillsInDomain(domainId: string): NonCognitiveSkill[] {
  return NON_COGNITIVE_SKILLS.filter((s) => s.domainId === domainId);
}

/**
 * 壁打ち(振り返りサポート)等で使う、領域別スキル表示名のヒント文。
 * 例: 「課題遂行=やり抜く力/責任を果たす力/…、情動制御=…」
 * 製品の言葉で「力」を名づけられるようにするための語彙。
 */
export const SKILL_HINTS_BY_DOMAIN: string = SKILL_DOMAINS.map(
  (d) => `${d.name}=${skillsInDomain(d.id).map((s) => s.displayName).join('/')}`,
).join('、');
