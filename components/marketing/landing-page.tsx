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
          <div className="flex items-center gap-4 sm:gap-5">
            <Link
              href="/pricing"
              className="text-sm font-medium text-text-primary hover:text-primary transition-colors"
            >
              料金プラン
            </Link>
            <Link href="/login">
              <Button variant="primary" className="px-5 py-2 text-sm">
                ログイン
              </Button>
            </Link>
          </div>
        </div>

        {/* コピー(左上寄せ) */}
        <div className="relative z-10 container mx-auto px-4 pt-10 pb-28 md:pt-16 md:pb-44">
          <div className="max-w-2xl">
            <p className="text-sm font-medium tracking-[0.2em] text-primary mb-4 before:content-[''] before:mr-3 before:inline-block before:h-px before:w-6 before:align-middle before:bg-primary">
              メンバーの“密かなスキル”を見える化する組織開発SaaS
            </p>
            <h1 className="text-3xl md:text-5xl font-bold leading-[1.28] text-text-primary">
              数字に表れない、
              <br />
              <span className="md:whitespace-nowrap">“密かな”スキルを見える化。</span>
            </h1>
            <p className="mt-6 text-base md:text-lg text-text-primary/80 leading-relaxed">
              目標・活動・振り返りのテキストから、AIがメンバーの非認知能力（数字に表れない力）を推測。
              マネージャーはメンバーを深く知り、本人も自分の強みに気づいていきます。
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
                className="rounded-xl border border-border bg-background p-6 shadow-sm transition-shadow hover:shadow-md"
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
        <div className="deco-orb" style={{ width: 300, height: 300, background: '#8B9D83', opacity: 0.22, top: -60, left: -40 }} aria-hidden />
        <div className="deco-orb" style={{ width: 260, height: 260, background: '#C9B8A5', opacity: 0.28, bottom: -50, right: -30 }} aria-hidden />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="mb-6 flex items-center justify-center gap-2" aria-hidden>
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-primary/40" />
            <span className="h-1.5 w-1.5 rotate-45 bg-accent" />
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-primary/40" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold leading-snug text-text-primary">
            テストでは、
            <span className="marker">測れない</span>。
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
          </p>
        </div>
      </section>

      {/* ④ 解決の仕組み（プロダクトの中身） */}
      <section className="bg-surface border-y border-border">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-sm font-medium tracking-widest text-primary mb-3 before:content-[''] before:mr-3 before:inline-block before:h-px before:w-6 before:align-middle before:bg-primary">
              見える化の仕組み
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-text-primary text-balance">
              メンバーのテキストから、“密かなスキル”を<span className="marker">見極める</span>。
            </h2>
            <p className="mt-5 text-text-secondary leading-relaxed">
              メンバーが書く「目標・活動・振り返り」から、AIが非認知能力（数字に表れない力）を推測して見える化。面談や評価では見えなかったメンバーの姿と強みを、マネージャーが見極められます。
            </p>
          </div>

          {/* フロー */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3 text-sm md:text-base">
            {['目標を立てる', '活動を記録する', '振り返る', 'AIが非認知能力を推測'].map(
              (step, i, arr) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-background px-4 py-2 font-medium text-primary">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                      {i + 1}
                    </span>
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
                title: '見える',
                body: '現場の活動と思考が、経営・上司にそのまま見える。数字の裏側が、初めて伝わる。',
              },
              {
                title: '見極める',
                body: '数字に表れない非認知能力を、AIが推測。誰がどんな強みを持つのかを見極められる。',
              },
              {
                title: '自分も知る',
                body: '本人もAIとの壁打ちで自己理解が深まり、伸ばすべき目標とスキルが見えてくる。',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-border bg-background p-6 shadow-sm transition-shadow hover:shadow-md text-center"
              >
                <h3 className="text-lg font-bold text-primary">{item.title}</h3>
                <p className="mt-3 text-text-secondary leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link href="/login">
              <Button variant="primary" className="px-10 py-3 text-base">
                無料で試す
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ④-2 AI機能（実装に基づく） */}
      <section className="container mx-auto px-4 py-20 md:py-28">
        <div className="text-center max-w-2xl mx-auto">
          <div className="mb-6 flex items-center justify-center gap-2" aria-hidden>
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-primary/40" />
            <span className="h-1.5 w-1.5 rotate-45 bg-accent" />
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-primary/40" />
          </div>
          <p className="text-sm font-medium tracking-widest text-primary mb-3 before:content-[''] before:mr-3 before:inline-block before:h-px before:w-6 before:align-middle before:bg-primary">
            AIがやること
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary">
            記録が、毎月<span className="marker">“気づき”</span>に変わる。
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {[
            {
              title: 'AI月次診断',
              tag: '全プラン',
              body: '毎月の活動記録と振り返りから、非認知能力の傾向・パーソナリティ特性・その月の要約をAIが自動で生成します。',
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
              className="rounded-2xl border border-border bg-surface p-7 shadow-sm transition-shadow hover:shadow-md"
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
            <div className="mb-6 flex items-center justify-center gap-2" aria-hidden>
              <span className="h-px w-8 bg-gradient-to-r from-transparent to-primary/40" />
              <span className="h-1.5 w-1.5 rotate-45 bg-accent" />
              <span className="h-px w-8 bg-gradient-to-l from-transparent to-primary/40" />
            </div>
            <p className="text-sm font-medium tracking-widest text-primary mb-3 before:content-[''] before:mr-3 before:inline-block before:h-px before:w-6 before:align-middle before:bg-primary">
              体験から、自己理解を深める
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-text-primary">
              やってみて、<span className="marker">気づく</span>。
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
        <div className="deco-orb" style={{ width: 280, height: 280, background: '#C9B8A5', opacity: 0.26, top: -50, right: -40 }} aria-hidden />
        <div className="deco-orb" style={{ width: 300, height: 300, background: '#8B9D83', opacity: 0.20, bottom: -60, left: -50 }} aria-hidden />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="mb-6 flex items-center justify-center gap-2" aria-hidden>
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-primary/40" />
            <span className="h-1.5 w-1.5 rotate-45 bg-accent" />
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-primary/40" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold leading-snug text-text-primary text-balance">
            定量では拾えなかった人が、ここで<span className="marker">見つかる</span>。
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
            {['メンバー理解', '適材適所', 'キャリア面談の土台'].map((tag) => (
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

      {/* ⑥ こんな経営者に + 中間CTA */}
      <section className="relative overflow-hidden bg-primary text-white">
        <div className="deco-orb" style={{ width: 340, height: 340, background: '#FFFFFF', opacity: 0.1, top: -80, left: -40 }} aria-hidden />
        <div className="deco-orb" style={{ width: 300, height: 300, background: '#C9B8A5', opacity: 0.18, bottom: -70, right: -30 }} aria-hidden />
        <div className="relative z-10 container mx-auto px-4 py-16 md:py-24 text-center">
          <h2 className="text-2xl md:text-3xl font-bold">
            人を、数字だけで見たくない経営者へ。
          </h2>
          <p className="mt-6 text-lg text-white/85 max-w-2xl mx-auto leading-relaxed">
            効率や達成率は、もちろん大事。でもそれ以上に、
            「人の温かさ・人らしさ」に投資したいと考えるあなたに、
            Hisokaは寄り添います。
          </p>
          <div className="mt-10">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-white px-10 py-3 text-base font-bold text-primary transition-colors hover:bg-white/90"
            >
              無料で始める
            </Link>
          </div>
        </div>
      </section>

      {/* ⑦ 組織開発SaaSとしての位置づけ */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="mb-6 flex items-center justify-center gap-2" aria-hidden>
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-primary/40" />
            <span className="h-1.5 w-1.5 rotate-45 bg-accent" />
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-primary/40" />
          </div>
          <p className="text-sm font-medium tracking-widest text-primary mb-3 before:content-[''] before:mr-3 before:inline-block before:h-px before:w-6 before:align-middle before:bg-primary">
            会社で使う、組織開発／人事SaaS
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary text-balance">
            経営も、本人も。両方に効く。
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm transition-shadow hover:shadow-md">
            <h3 className="text-xl font-bold text-primary">経営・マネージャー</h3>
            <p className="mt-4 text-text-secondary leading-relaxed">
              トレーナー（上司・人事）×メンバーで、定量だけでなく非認知まで見える育成を仕組み化。
              数字に表れないメンバーの力を見極め、適材適所や育成・面談のヒントにつなげます。
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm transition-shadow hover:shadow-md">
            <h3 className="text-xl font-bold text-primary">メンバー本人</h3>
            <p className="mt-4 text-text-secondary leading-relaxed">
              活動と振り返りを重ね、AIとの壁打ちで自己理解を深める。
              自分の“密かなスキル”に気づき、どんな目標を持ち、何を伸ばすと良いかが見えてきます。
            </p>
          </div>
        </div>
        <div className="mt-12 text-center">
          <Link href="/login">
            <Button variant="primary" className="px-10 py-3 text-base">
              無料で始める
            </Button>
          </Link>
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
