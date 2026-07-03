import React from 'react';
import './ErrorBoundary.css';

// Catches render errors so one bad question doesn't white-screen the party.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Quiz crashed:', error, info);
  }

  handleRetry = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <div className="qn-error-screen">
          <div className="qn-error-emoji">🍿</div>
          <h2>Technical difficulties!</h2>
          <p>Something went sideways. The quiz will be right back.</p>
          <button onClick={this.handleRetry}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
