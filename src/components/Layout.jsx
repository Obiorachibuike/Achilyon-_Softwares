import { Sidebar } from './Sidebar'
import PropTypes from 'prop-types'

export function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  )
}

Layout.propTypes = {
  children: PropTypes.node
}
