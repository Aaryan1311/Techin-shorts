import NewsFeed from "@/components/NewsFeed";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function Home() {
  return (
    <ErrorBoundary>
      <NewsFeed />
    </ErrorBoundary>
  );
}
