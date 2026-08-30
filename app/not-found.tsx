import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <div className="not-found-crest">👑</div>
      <h1 className="not-found-title">The Court Cannot Find This Page</h1>
      <p className="not-found-body">
        This throne, campaign, or decree does not exist — or has been removed by
        court administration.
      </p>
      <div className="not-found-actions">
        <Link href="/" className="not-found-link">
          Return to the Throne Room
        </Link>
        <Link href="/start" className="not-found-link not-found-link-dim">
          Start a New Throne
        </Link>
      </div>
    </main>
  );
}
