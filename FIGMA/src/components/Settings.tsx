import { 
  Trash2, 
  SlidersHorizontal, 
  BookOpen, 
  Share2, 
  Facebook, 
  MessageCircle, 
  ChefHat, 
  Lightbulb, 
  LifeBuoy, 
  Bell, 
  Mail 
} from 'lucide-react';

export function Settings() {
  const menuItems = [
    { icon: Trash2, label: 'Food Waste Savings', color: '#4ade80' },
    { icon: SlidersHorizontal, label: 'Eating Preferences', color: '#6b7280' },
    { icon: BookOpen, label: 'Your Recipes', color: '#6b7280' },
    { icon: Share2, label: 'Share Intelligent Kitchen', color: '#6b7280' },
    { icon: Facebook, label: 'Official Facebook Community', color: '#6b7280' },
    { icon: MessageCircle, label: 'Review on Google Play', color: '#6b7280' },
    { icon: ChefHat, label: 'Meet Our Chefs', color: '#6b7280' },
    { icon: Lightbulb, label: 'Help Make Intelligent Kitchen Better', color: '#6b7280' },
    { icon: LifeBuoy, label: 'Support Center', color: '#6b7280' },
    { icon: Bell, label: 'Notifications', color: '#6b7280' },
    { icon: Mail, label: 'Contact Us', color: '#6b7280' }
  ];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Settings Menu */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden" style={{
        border: '1px solid #e5e7eb'
      }}>
        {menuItems.map((item, index) => (
          <button
            key={index}
            className="w-full flex items-center gap-4 px-4 py-4 transition-colors hover:bg-gray-50 active:bg-gray-100"
            style={{
              borderBottom: index < menuItems.length - 1 ? '1px solid #f3f4f6' : 'none'
            }}
            onClick={() => {
              // Handle navigation/action here
              console.log(`Clicked: ${item.label}`);
            }}
          >
            <div className="flex-shrink-0">
              <item.icon 
                className="w-6 h-6" 
                style={{ color: item.color }}
              />
            </div>
            <span style={{
              color: '#374151',
              fontSize: '1rem',
              fontFamily: 'var(--font-serif-body)',
              textAlign: 'left',
              flex: 1
            }}>
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {/* Version Info */}
      <div className="text-center mt-8 px-4" style={{
        color: '#9ca3af',
        fontSize: '0.875rem',
        fontFamily: 'var(--font-serif-body)',
        fontStyle: 'italic'
      }}>
        Version 1.0.0
      </div>
    </div>
  );
}
