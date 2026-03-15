import { Component } from 'react'
import { Button } from '@/app/components/@system/ui/button'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Uncaught error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="w-full max-w-md text-center">
            <p className="text-8xl font-bold tracking-tight text-foreground">500</p>
            <h1 className="mt-4 text-2xl font-semibold text-foreground">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              An unexpected error occurred. Please try again or return to the dashboard.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => this.setState({ hasError: false })}>
                Try Again
              </Button>
              <Button variant="outline" onClick={() => { window.location.href = '/dashboard' }}>
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
