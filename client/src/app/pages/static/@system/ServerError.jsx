import { Link } from 'react-router-dom'
import { Button } from '@/app/components/@system/ui/button'

export default function ServerError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center">
        <p className="text-8xl font-bold tracking-tight text-foreground">500</p>
        <h1 className="mt-4 text-2xl font-semibold text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          An unexpected error occurred. Please try again or return to the dashboard.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
          <Button variant="outline" asChild>
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
