import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ ErrorBoundary caught error:', error);
    console.error('Error details:', errorInfo);
    // Jangan langsung reload - biar user bisa lihat error dulu
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          color: 'var(--text-primary)',
          background: 'var(--bg-primary)',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <h1 style={{ color: 'var(--error)', marginBottom: '20px' }}>Something went wrong</h1>
          <pre style={{ 
            background: 'var(--bg-secondary)', 
            padding: '20px', 
            borderRadius: '8px',
            color: 'var(--text-secondary)',
            maxWidth: '800px',
            overflow: 'auto',
          }}>
            {this.state.error?.toString()}
          </pre>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.hash = '/';
              }}
              style={{
                padding: '10px 20px',
                background: 'var(--accent-color)',
                color: 'var(--bg-primary)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Kembali ke Home
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                background: 'var(--error)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

