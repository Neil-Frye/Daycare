"use client"

import { Component, ErrorInfo, ReactNode } from 'react';
import logger from '@/lib/logger'; // Import the centralized logger

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state = { hasError: false }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error using the centralized logger, including component stack info
    logger.error(
      { err: error, componentStack: errorInfo.componentStack },
      'ErrorBoundary caught an error'
    );
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }

    return this.props.children
  }
}
