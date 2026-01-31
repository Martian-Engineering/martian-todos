import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary component for catching render failures in child components.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  /**
   * Updates state so the next render shows the fallback UI.
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  /**
   * Logs error details for diagnostics.
   */
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Keep console output for quick debugging without breaking the UI.
    console.error("ErrorBoundary caught an error:", error, info);
  }

  /**
   * Resets the error state to attempt rendering again.
   */
  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  /**
   * Renders children or a fallback when an error is caught.
   */
  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="error-boundary" role="alert">
        <div className="error-boundary__content">
          <h3>{this.props.title ?? "Something went wrong"}</h3>
          <p>
            {this.props.description ??
              "We hit a snag while rendering this section. Try again or reload."}
          </p>
          {this.state.error && (
            <p className="error-boundary__detail">{this.state.error.message}</p>
          )}
        </div>
        <div className="error-boundary__actions">
          <button className="button-secondary" onClick={this.handleRetry}>
            Try again
          </button>
          <button
            className="button-ghost"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
