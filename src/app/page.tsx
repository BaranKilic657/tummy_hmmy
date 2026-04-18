export default function HomePage() {
  return (
    <main className="screen">
      <header className="header">
        <div className="logo-wrap">
          <div className="logo">Campus Autopilot</div>
          <p className="tagline">by TUMmy & HMmy</p>
        </div>
        <nav className="nav" aria-label="Main navigation">
          <a href="#">Overview</a>
          <a href="#">How It Works</a>
          <a href="/tictactoe">Tic-Tac-Toe</a>
          <a href="/chatbot">Chatbot</a>
        </nav>
      </header>

      <section className="hero">
        <p className="group">Student-first automation</p>
        <h1>Autonomous support for everyday campus life.</h1>
        <p>
          Campus Autopilot keeps an eye on opportunities, reminders, and next
          steps so students can focus on learning instead of tracking every task
          manually.
        </p>
        <div className="actions">
          <button type="button">Open Preview</button>
          <a href="#" className="text-link">
            See sample workflow
          </a>
        </div>
      </section>

      <p className="note">Built for TUM.ai Makeathon 2026.</p>
    </main>
  );
}
