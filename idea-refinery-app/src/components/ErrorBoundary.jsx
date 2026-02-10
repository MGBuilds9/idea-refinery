import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full bg-red-900/20 border border-red-500/50 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-500 mb-4">Something went wrong.</h2>
            <p className="text-zinc-300 mb-4">The application encountered an unexpected error.</p>

            <details className="bg-black/50 p-4 rounded text-xs font-mono overflow-auto max-h-48 mb-6">
              <summary className="cursor-pointer text-zinc-400 mb-2">Error Details</summary>
              <div className="text-red-300 whitespace-pre-wrap">
                {this.state.error && this.state.error.toString()}
              </div>
              <div className="text-zinc-500 mt-2 whitespace-pre-wrap">
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </div>
            </details>

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#d4af37] hover:bg-[#c5a028] text-black py-2 rounded font-medium"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
