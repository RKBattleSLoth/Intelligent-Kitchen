import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Package, 
  BookOpen, 
  Calendar, 
  ShoppingCart, 
  User,
  ChefHat
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Meal Planning', href: '/meal-planning', icon: Calendar },
  { name: 'Recipes', href: '/recipes', icon: BookOpen },
  { name: 'Grocery Lists', href: '/grocery-lists', icon: ShoppingCart },
  { name: 'Pantry', href: '/pantry', icon: Package },
  { name: 'Profile', href: '/profile', icon: User },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg dark:bg-dark-800 dark:border-r dark:border-gray-700">
      <div className="flex h-16 items-center px-6 border-b dark:border-gray-700">
        <ChefHat className="h-8 w-8 text-blue-600" />
        <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">Intelligent Kitchen</span>
      </div>
      <nav className="mt-8 px-3">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-dark-700 dark:hover:text-white'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}