import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Button } from '@shared/ui/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }

      return (
        <div className="feed">
          <div className="stack text-center p-8">
            <h1>Something went wrong</h1>
            <p className="muted">{this.state.error?.message ?? 'An unexpected error occurred'}</p>
            <Button onClick={this.handleRetry}>Try Again</Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
