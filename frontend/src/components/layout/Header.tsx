import { User } from 'lucide-react'

export default function Header() {
  return (
    <header className="fixed top-0 right-0 left-64 z-40 h-16 bg-white shadow-sm border-b dark:bg-dark-800 dark:border-gray-700">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Intelligent Kitchen AI</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
            <User className="h-4 w-4" />
            <span>Demo User</span>
          </div>
          
          <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
            MVP Mode
          </div>
        </div>
      </div>
    </header>
  )
}