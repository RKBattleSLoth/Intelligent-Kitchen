/**
 * Floating AI Chat Button
 * Universally available button to open AI chat
 */

import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { toggleChat } from '../../store/slices/aiSlice';

export const ChatButton = () => {
  const dispatch = useDispatch();
  const { isOpen, messages } = useSelector((state: RootState) => state.ai);
  const unreadCount = messages.filter(m => m.role === 'assistant').length;

  return (
    <button
      onClick={() => dispatch(toggleChat())}
      className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 ${
        isOpen ? 'bg-gray-600' : 'bg-indigo-600'
      } text-white hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300`}
      aria-label="AI Assistant"
    >
      {isOpen ? (
        // Close icon
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      ) : (
        // Chat icon with badge
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          {unreadCount > 0 && messages.length > 0 && !isOpen && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      )}
    </button>
  );
};
