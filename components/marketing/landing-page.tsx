import Link from 'next/link';
import { PublicHeader } from '../layout/public-header';
import { Button } from '../ui/button';

/**
 * 未ログインのトップページ（ランディングページ）。
 *
 * ポジショニング: 「KPIの達成はAIがやる時代。数字に表れない現場のがんばりと
 * 人らしさ（＝定性）を経営に届ける目標管理ツール」。
 * 経営者・人事の課題から入り、続けた先のご褒美として "強み・才能の発見" で締める。
 *
 * 純粋な Server Component（インタラクションなし）。
 */
export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      {/* ① ヒーロー */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-20 md:py-28 text-center">
          <p className="text-sm font-medium tracking-widest text-primary mb-6">
            AI時代の、人を見るための目標管理
          </p>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight text-text-primary">
            数字には、表れない。
            <br />
            でも、いちばん見たいのは、
            <br className="md:hidden" />
            そこじゃないですか。
          </h1>
          <p className="mt-8 text-lg md:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
            メンバーが何を考え、どう動き、どう乗り越えたか。
            <br className="hidden md:block" />
            HISOKAは、KPIの裏にある“人のがんばり”を可視化し、経営に届けます。
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
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
      </section>

      {/* ② 共感（経営者の本音を突く） */}
      <section className="bg-surface border-y border-border">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-text-primary">
            メンバーのこと、“数字”でしか
            <br className="md:hidden" />
            知らないかもしれません。
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

      {/* ③ 時代の問い（このサービスの思想） */}
      <section id="about" className="container mx-auto px-4 py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold leading-snug text-text-primary">
            KPIの達成は、
            <span className="text-primary">これからAIの仕事</span>
            になる。
          </h2>
          <p className="mt-8 text-lg text-text-secondary leading-relaxed">
            これからの数年で、数字を出すこと自体はAIがどんどん肩代わりします。
            そのとき経営に問われるのは——
          </p>
          <p className="mt-6 text-xl md:text-2xl font-bold text-text-primary leading-relaxed">
            「数字では測れない、
            <br className="md:hidden" />
            人の価値をどう見るか」。
          </p>
          <p className="mt-8 text-lg text-text-secondary leading-relaxed">
            HISOKAは、その問いに向き合う経営者のためのツールです。
          </p>
        </div>
      </section>

      {/* ④ 解決の仕組み（プロダクトの中身） */}
      <section className="bg-surface border-y border-border">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-text-primary">
              日々の“活動”と“振り返り”が、
              <br className="md:hidden" />
              定性的な価値になる。
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

      {/* ⑤ 独自価値（定性評価 → 才能発見へ） */}
      <section className="container mx-auto px-4 py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold leading-snug text-text-primary">
            定量では拾えなかった人が、
            <br />
            ここで<span className="text-primary">見つかる</span>。
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
            HISOKAは寄り添います。
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
      <section className="bg-surface border-t border-border">
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl md:text-4xl font-bold text-text-primary">
            数字の向こうにいる“人”を、
            <br className="md:hidden" />
            見にいこう。
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
          <span className="font-bold text-primary">HISOKA</span>
          <span>© {2026} Hisoka</span>
        </div>
      </footer>
    </div>
  );
}
