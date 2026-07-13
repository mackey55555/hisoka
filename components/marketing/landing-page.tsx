import Link from 'next/link';
import Image from 'next/image';
import { Button } from '../ui/button';

/**
 * 未ログインのトップページ（ランディングページ）。
 *
 * コンセプト: 「密かにやっていることが、その人の才能になる」。
 * 点数では測れない“非認知能力”(仲間をつくる/場を和ませる/気を利かせる 等)を
 * 見つけて伸ばす。ファーストビューは共創の広場のイラスト(public/hero.png)。
 *
 * 純粋な Server Component（インタラクションなし）。
 */
export function LandingPage() {
  return (
    <div className="min-h-screen bg-background [word-break:auto-phrase]">
      {/* ① ヒーロー(イラスト・共創の広場) */}
      <section className="relative overflow-hidden">
        {/* 背景イラスト */}
        <div className="absolute inset-0">
          <Image
            src="/hero.png"
            alt="いろんなチームで学び合う人々。ひとりの手元に、才能が見つかる淡い光が灯る。"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          {/* 可読性スクリム(左上を明るく) */}
          <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/35 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/55 to-transparent" />
        </div>

        {/* ヘッダー(透過) */}
        <div className="relative z-10 container mx-auto px-4 py-5 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-wide text-text-primary">
            Hisoka
          </Link>
          <Link href="/login">
            <Button variant="primary" className="px-5 py-2 text-sm">
              ログイン
            </Button>
          </Link>
        </div>

        {/* コピー(左上寄せ) */}
        <div className="relative z-10 container mx-auto px-4 pt-10 pb-28 md:pt-16 md:pb-44">
          <div className="max-w-2xl">
            <p className="text-sm font-medium tracking-[0.2em] text-primary mb-4">
              非認知能力を、見つけて伸ばす
            </p>
            <h1 className="text-3xl md:text-5xl font-bold leading-[1.28] text-text-primary">
              <span className="md:whitespace-nowrap">その“密かな”がんばりが、</span>
              <br />
              あなたの才能。
            </h1>
            <p className="mt-6 text-base md:text-lg text-text-primary/80 leading-relaxed">
              仲間をつくる力、場を和ませる会話、気を利かせる心づかい——数字には出ないけれど、
              いろんなチームで学ぶうちに、あなたの中で密かに育っている力があります。
              密かは、それを見つけて、伸ばす。
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link href="/login">
                <Button variant="primary" className="px-8 py-3 text-base w-full sm:w-auto">
                  無料で試す
                </Button>
              </Link>
              <Link href="#about">
                <Button variant="secondary" className="px-8 py-3 text-base w-full sm:w-auto">
                  サービスを知る
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ② 共感（経営者の本音を突く） */}
      <section className="bg-surface border-y border-border">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-text-primary text-balance">
            メンバーのこと、“数字”でしか知らないかもしれません。
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
            {[
              {
                title: '実際に何をやっているか、届いていない',
                body: '見ているのは目標の達成率ばかり。現場の動きや工夫は、経営層にほとんど届いていない。',
              },
              {
                title: 'がんばりが、数字に出ない',
                body: '本当はめちゃくちゃ頑張っている人、深く考えている人がいる。でもその姿は数字には表れない。',
              },
              {
                title: '地道に支える人ほど、報われない',
                body: '評価が定量に偏り、チームを陰で支える人の貢献が拾われないまま埋もれていく。',
              },
              {
                title: '数字だけで、本当にいいのか',
                body: 'AIが業務をこなす時代。“達成率”だけで人を見ることに、違和感はありませんか。',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-border bg-background p-6"
              >
                <h3 className="font-bold text-text-primary">{item.title}</h3>
                <p className="mt-2 text-text-secondary leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ③ 思想（非認知能力） */}
      <section id="about" className="relative overflow-hidden container mx-auto px-4 py-20 md:py-28">
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold leading-snug text-text-primary">
            テストでは、
            <span className="text-primary">測れない</span>。
          </h2>
          <p className="mt-8 text-lg text-text-secondary leading-relaxed">
            点数になる力の多くは、これからAIが担っていきます。でも——
            仲間をつくる、場を和ませる、気を利かせる、自分の役割を掴む。
          </p>
          <p className="mt-6 text-xl md:text-2xl font-bold text-text-primary leading-relaxed text-balance">
            そういう“非認知能力”は、人と関わり学び合う中で密かに育つ。
          </p>
          <p className="mt-8 text-lg text-text-secondary leading-relaxed">
            たとえばチームスポーツを続けた人が、自然と気が利くように。
            密かは、日々の記録からその力を見つけ、言葉にし、伸ばします。
            見つけて伸ばすほど、人生はもっと豊かになる。
          </p>
        </div>
      </section>

      {/* ④ 解決の仕組み（プロダクトの中身） */}
      <section className="bg-surface border-y border-border">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-text-primary text-balance">
              日々の“活動”と“振り返り”が、定性的な価値になる。
            </h2>
          </div>

          {/* フロー */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3 text-sm md:text-base">
            {['目標を立てる', '活動を記録する', '振り返る', 'AIが伴走・言語化'].map(
              (step, i, arr) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="rounded-full border border-primary/40 bg-background px-4 py-2 font-medium text-primary">
                    {step}
                  </span>
                  {i < arr.length - 1 && (
                    <span className="text-primary/50" aria-hidden>
                      →
                    </span>
                  )}
                </div>
              )
            )}
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            {[
              {
                title: '届く',
                body: '現場の活動と思考が、経営・上司にそのまま見える。数字の裏側が初めて伝わる。',
              },
              {
                title: '続く',
                body: 'AIが問いを投げ、振り返りを習慣化。記録が途切れず、変化が積み上がる。',
              },
              {
                title: '支える',
                body: 'トレーナー（上司・人事）が状況を把握し、一人ひとりに的確に伴走できる。',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-border bg-background p-6 text-center"
              >
                <h3 className="text-lg font-bold text-primary">{item.title}</h3>
                <p className="mt-3 text-text-secondary leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ④-2 AI機能（実装に基づく） */}
      <section className="container mx-auto px-4 py-20 md:py-28">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-medium tracking-widest text-primary mb-3">
            AIがやること
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary">
            記録が、毎月“気づき”に変わる。
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {[
            {
              title: 'AI月次診断',
              tag: '全プラン',
              body: '毎月の活動記録と振り返りから、パーソナリティ特性・感情の傾向・その月の要約をAIが自動で生成します。',
            },
            {
              title: 'AI質問サジェスト',
              tag: 'Starter〜',
              body: '診断結果をもとに、面談でそのまま使える問いをAIが提案。トレーナーの1on1を支えます。',
            },
            {
              title: 'AI振り返りサポート',
              tag: 'Starter〜',
              body: 'トレーニーがAIと対話しながら振り返りを深め、書ききれなかった気づきを言葉にできます。',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-surface p-7"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-primary">{f.title}</h3>
                <span className="shrink-0 rounded-full bg-accent/25 px-3 py-1 text-xs font-medium text-text-secondary">
                  {f.tag}
                </span>
              </div>
              <p className="mt-3 text-text-secondary leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ④-3 体験メニュー（やってみて気づく） */}
      <section className="bg-surface border-y border-border">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-sm font-medium tracking-widest text-primary mb-3">
              体験から、自己理解を深める
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-text-primary">
              やってみて、気づく。
            </h2>
            <p className="mt-5 text-text-secondary leading-relaxed">
              密かの取り組みは、机の上の研修ではありません。会議も、イベント準備も、スポーツも——
              まずやってみる。その体験の中で自然に出る“あなたらしい動き”を、AIと一緒に振り返る。
              点数にならない力（非認知能力）に気づき、自分が何のためにそこにいるのかにフォーカスして、
              自己理解を深めていきます。
            </p>
          </div>

          <div className="mt-14 space-y-12 md:space-y-16 max-w-5xl mx-auto">
            {[
              {
                img: '/scene-meeting.png',
                tag: 'まとめる / 巻き込む / 場を動かす',
                title: 'アイデアを、囲む。',
                body:
                  'ホワイトボードを囲んで意見を出し合う。話をまとめる人、人を巻き込む人、そっと論点を整える人——自分がチームで“何を担っているか”が見えてくる。',
              },
              {
                img: '/scene-sports.png',
                tag: '気を利かせる / 声をかける / 立ち位置',
                title: 'チームで、動く。',
                body:
                  'ボールを追い、声をかけ合い、とっさに人を活かす。勝ち負けの数字には残らない“チームでの気の利かせ方”や、自分の立ち位置が、自然と表れる。',
              },
              {
                img: '/scene-event.png',
                tag: '段取り / 先回り / 縁の下',
                title: 'みんなで、つくる。',
                body:
                  '飾り付け、設営、運搬、段取り——役割を分け合ってイベントを準備する。誰が先回りし、誰が場を整え、誰が黙々と支えるか。数字に出ない“貢献のかたち”が見えてくる。',
              },
              {
                img: '/scene-bbq.png',
                tag: '場を和ませる / 気を配る / もてなす',
                title: '囲んで、ほぐれる。',
                body:
                  '焼く人、取り分ける人、飲み物を配る人、話に花を咲かせる人——肩の力が抜けた場でこそ、人を和ませる力やさりげない気配りといった“素のあなた”が表れる。',
              },
            ].map((s, i) => (
              <div key={s.img} className="grid md:grid-cols-2 gap-6 md:gap-10 items-center">
                <div
                  className={`relative aspect-[3/2] overflow-hidden rounded-2xl border border-border ${
                    i % 2 === 1 ? 'md:order-2' : ''
                  }`}
                >
                  <Image
                    src={s.img}
                    alt={s.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 45vw"
                    className="object-cover"
                  />
                </div>
                <div className={i % 2 === 1 ? 'md:order-1' : ''}>
                  <p className="text-sm font-medium text-primary">{s.tag}</p>
                  <h3 className="mt-2 text-xl md:text-2xl font-bold text-text-primary">
                    {s.title}
                  </h3>
                  <p className="mt-4 text-text-secondary leading-relaxed">{s.body}</p>
                  <p className="mt-4 text-sm text-text-secondary/80">
                    → 体験のあと、AIと振り返って言葉にする。
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ⑤ 独自価値（定性評価 → 才能発見へ） */}
      <section className="relative overflow-hidden container mx-auto px-4 py-20 md:py-28">
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold leading-snug text-text-primary text-balance">
            定量では拾えなかった人が、ここで<span className="text-primary">見つかる</span>。
          </h2>
          <p className="mt-8 text-lg text-text-secondary leading-relaxed">
            黙々と支える人、人一倍考える人、チームの空気をつくる人——
            数字に出ない貢献を、AIが活動記録から拾い上げて言語化します。
          </p>
          <p className="mt-6 text-lg text-text-secondary leading-relaxed">
            そして続けるほど、
            <span className="font-bold text-text-primary">
              本人も気づいていない強み・個性・伸びしろ
            </span>
            が見えてくる。
          </p>
          <div className="mt-10 inline-flex flex-wrap justify-center gap-3">
            {['公平な評価', '適材適所', 'キャリア面談の土台'].map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-accent/30 px-5 py-2 text-sm font-medium text-text-primary"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ⑥ こんな経営者に */}
      <section className="bg-primary text-white">
        <div className="container mx-auto px-4 py-16 md:py-24 text-center">
          <h2 className="text-2xl md:text-3xl font-bold">
            人を、数字だけで見たくない経営者へ。
          </h2>
          <p className="mt-6 text-lg text-white/85 max-w-2xl mx-auto leading-relaxed">
            効率や達成率は、もちろん大事。でもそれ以上に、
            「人の温かさ・人らしさ」に投資したいと考えるあなたに、
            Hisokaは寄り添います。
          </p>
        </div>
      </section>

      {/* ⑦ 2つの使い方 */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          <div className="rounded-2xl border border-border bg-surface p-8">
            <h3 className="text-xl font-bold text-primary">組織で使う</h3>
            <p className="mt-4 text-text-secondary leading-relaxed">
              トレーナー（上司・人事）×トレーニー（社員）で、
              定量だけでなく定性まで見える育成を仕組み化。
              現場のがんばりが、経営にちゃんと届く組織へ。
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-8">
            <h3 className="text-xl font-bold text-primary">個人で使う</h3>
            <p className="mt-4 text-text-secondary leading-relaxed">
              自分の活動と振り返りを積み重ねると、
              AIが頑張りの中から得意を見つけてくれる。
              自分らしい強みと、進むべき道が見えてくる。
            </p>
          </div>
        </div>
      </section>

      {/* ⑧ 最後のCTA */}
      <section className="relative overflow-hidden bg-surface border-t border-border">
        <div className="relative z-10 container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl md:text-4xl font-bold text-text-primary text-balance">
            数字の向こうにいる“人”を、見にいこう。
          </h2>
          <div className="mt-10">
            <Link href="/login">
              <Button variant="primary" className="px-10 py-3 text-base">
                無料で始める
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-background border-t border-border">
        <div className="container mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-text-secondary">
          <span className="font-bold text-primary">Hisoka</span>
          <span>© {2026} Hisoka</span>
        </div>
      </footer>
    </div>
  );
}
