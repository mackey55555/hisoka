import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/header';

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        <section className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-6">
            あなたの才能を、見つけよう
          </h1>
          <p className="text-lg text-text-secondary mb-8 max-w-2xl mx-auto">
            目標設定・活動記録・振り返りを通じて
            <br />
            成長の軌跡を可視化するアプリ
          </p>
          <Link href="/login">
            <Button variant="primary" className="text-lg px-8 py-3">
              無料で始める
            </Button>
          </Link>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">📎</div>
              <h2 className="text-xl font-bold text-text-primary mb-2">
                目標管理
              </h2>
              <p className="text-text-secondary">
                達成したい目標を設定し、期限を管理します
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">📝</div>
              <h2 className="text-xl font-bold text-text-primary mb-2">
                活動記録
              </h2>
              <p className="text-text-secondary">
                目標達成に向けた具体的な活動を記録します
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">💭</div>
              <h2 className="text-xl font-bold text-text-primary mb-2">
                振り返り
              </h2>
              <p className="text-text-secondary">
                トレーナーとの対話を通じて活動を振り返ります
              </p>
            </div>
          </div>
        </section>

        <footer className="border-t border-border bg-surface py-8">
          <div className="container mx-auto px-4 text-center text-text-secondary">
            <p>© 2025 Hisoka</p>
          </div>
        </footer>
      </main>
    </>
  );
}

