import { ReactNode, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { RootState } from '../../store'
import { aiService } from '../../services/aiService'
import { ChatButton, ChatWindow } from '../ai'

interface LayoutProps {
  children?: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { token } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    // Enable dark mode by default
    document.documentElement.classList.add('dark')
  }, [])

  // Initialize AI service with auth token
  useEffect(() => {
    if (token) {
      aiService.setToken(token)
    }
  }, [token])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-950">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 ml-64 mt-16">
          {children || <Outlet />}
        </main>
      </div>
      
      {/* Universal AI Chat - Available on all pages */}
      <ChatButton />
      <ChatWindow />
    </div>
  )
}
