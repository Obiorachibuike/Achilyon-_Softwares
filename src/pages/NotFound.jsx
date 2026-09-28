import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button, Card, EmptyState } from '../components/ui'

export default function NotFound() {
  return (
    <Card className="mx-auto mt-10 max-w-lg">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="That route doesn't exist. Press Ctrl/⌘ + K to search for a token or jump to any page."
        action={<Link to="/"><Button variant="primary">Go to dashboard</Button></Link>}
      />
    </Card>
  )
}
