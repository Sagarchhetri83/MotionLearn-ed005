import React from 'react'

export function Dashboard() {
  React.useEffect(() => {
    // Redirect to the animated dashboard with anime character
    // In Vite, files in /public are served from root
    window.location.replace('/dashboard.html')
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Redirecting to Dashboard...</h1>
        <p className="text-gray-600">Loading your beautiful dashboard...</p>
        <div className="mt-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500 mx-auto"></div>
        </div>
      </div>
    </div>
  )
}