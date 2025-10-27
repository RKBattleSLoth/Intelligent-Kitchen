import { useState, useEffect } from 'react'

interface StoredUserProfile {
  firstName: string
  lastName?: string
  email?: string
  dietaryPreferences?: string[]
  allergies?: string[]
  familySize?: number
}

const ProfilePage = () => {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dietaryPreferences: [] as string[],
    allergies: [] as string[],
    familySize: 1
  })

  const [profile, setProfile] = useState<StoredUserProfile>({
    firstName: 'Chef',
    lastName: '',
    email: 'chef@example.com',
    dietaryPreferences: [],
    allergies: [],
    familySize: 1
  })

  useEffect(() => {
    try {
      const stored = localStorage.getItem('intelligent-kitchen-user')
      if (stored) {
        const parsed = JSON.parse(stored) as StoredUserProfile
        const nextProfile: StoredUserProfile = {
          firstName: parsed.firstName || 'Chef',
          lastName: parsed.lastName || '',
          email: parsed.email || 'chef@example.com',
          dietaryPreferences: parsed.dietaryPreferences || [],
          allergies: parsed.allergies || [],
          familySize: parsed.familySize || 1
        }
        setProfile(nextProfile)
        setFormData({
          name: [nextProfile.firstName, nextProfile.lastName].filter(Boolean).join(' ').trim(),
          email: nextProfile.email || '',
          dietaryPreferences: [...(nextProfile.dietaryPreferences || [])],
          allergies: [...(nextProfile.allergies || [])],
          familySize: nextProfile.familySize || 1
        })
      }
    } catch (error) {
      console.warn('Failed to load profile from storage:', error)
    }
  }, [])

  const dietaryOptions = [
    'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Paleo', 'Low-Carb', 'Mediterranean'
  ]

  const allergyOptions = [
    'Nuts', 'Dairy', 'Gluten', 'Eggs', 'Soy', 'Shellfish', 'Fish', 'Sesame'
  ]

  const handleSave = () => {
    const trimmedName = formData.name.trim()
    const [firstNameCandidate, ...rest] = trimmedName.length > 0 ? trimmedName.split(' ') : [profile.firstName]
    const updatedProfile: StoredUserProfile = {
      firstName: firstNameCandidate || profile.firstName || 'Chef',
      lastName: rest.join(' ').trim(),
      email: formData.email || profile.email,
      dietaryPreferences: [...formData.dietaryPreferences],
      allergies: [...formData.allergies],
      familySize: formData.familySize || 1
    }

    try {
      localStorage.setItem('intelligent-kitchen-user', JSON.stringify(updatedProfile))
    } catch (error) {
      console.warn('Failed to save profile to storage:', error)
    }

    setProfile(updatedProfile)
    setFormData({
      name: [updatedProfile.firstName, updatedProfile.lastName].filter(Boolean).join(' ').trim(),
      email: updatedProfile.email || '',
      dietaryPreferences: [...(updatedProfile.dietaryPreferences || [])],
      allergies: [...(updatedProfile.allergies || [])],
      familySize: updatedProfile.familySize || 1
    })
    setIsEditing(false)
  }

  const handleDietaryPreferenceChange = (preference: string) => {
    setFormData(prev => ({
      ...prev,
      dietaryPreferences: prev.dietaryPreferences.includes(preference)
        ? prev.dietaryPreferences.filter(p => p !== preference)
        : [...prev.dietaryPreferences, preference]
    }))
  }

  const handleAllergyChange = (allergy: string) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.includes(allergy)
        ? prev.allergies.filter(a => a !== allergy)
        : [...prev.allergies, allergy]
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Manage your account and preferences</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => {
              setFormData({
                name: [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim(),
                email: profile.email || '',
                dietaryPreferences: [...(profile.dietaryPreferences || [])],
                allergies: [...(profile.allergies || [])],
                familySize: profile.familySize || 1
              })
              setIsEditing(true)
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Profile
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg dark:bg-gray-800 dark:border-gray-700">
            <div className="px-4 py-5 sm:p-6">
              <div className="text-center">
                <div className="mx-auto h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center dark:bg-gray-700">
                  <svg className="h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">{profile.firstName} {profile.lastName}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{profile.email}</p>
                <div className="mt-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    Active Member
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg dark:bg-gray-800 dark:border-gray-700">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6 dark:text-white">Account Information</h3>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-600 dark:focus:border-blue-600"
                      />
                    ) : (
                      <div className="mt-1 text-sm text-gray-900 dark:text-gray-300">{profile.firstName} {profile.lastName}</div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-600 dark:focus:border-blue-600"
                      />
                    ) : (
                      <div className="mt-1 text-sm text-gray-900 dark:text-gray-300">{profile.email}</div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Family Size</label>
                  {isEditing ? (
                    <select
                      value={formData.familySize}
                      onChange={(e) => setFormData({ ...formData, familySize: parseInt(e.target.value) })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-600 dark:focus:border-blue-600"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(size => (
                        <option key={size} value={size}>{size} {size === 1 ? 'person' : 'people'}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="mt-1 text-sm text-gray-900 dark:text-gray-300">{profile.familySize || 1} {(profile.familySize || 1) === 1 ? 'person' : 'people'}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Dietary Preferences</label>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {dietaryOptions.map(option => (
                      <label key={option} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.dietaryPreferences.includes(option)}
                          onChange={() => handleDietaryPreferenceChange(option)}
                          disabled={!isEditing}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-blue-600 dark:focus:border-blue-600"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Allergies</label>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {allergyOptions.map(allergy => (
                      <label key={allergy} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.allergies.includes(allergy)}
                          onChange={() => handleAllergyChange(allergy)}
                          disabled={!isEditing}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-blue-600 dark:focus:border-blue-600"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{allergy}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setFormData({
                          name: [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim(),
                          email: profile.email || '',
                          dietaryPreferences: [...(profile.dietaryPreferences || [])],
                          allergies: [...(profile.allergies || [])],
                          familySize: profile.familySize || 1
                        })
                        setIsEditing(false)
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg dark:bg-gray-800 dark:border-gray-700">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 dark:text-white">Account Security</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">Password</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Last changed 3 months ago</div>
              </div>
              <button className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                Change Password
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">Two-Factor Authentication</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Add an extra layer of security</div>
              </div>
              <button className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                Enable
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage