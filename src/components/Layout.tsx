import { ReactNode } from 'react'
import Head from 'next/head'
import { Navigation } from './Navigation'
import { SEO } from './SEO'

interface LayoutProps {
  children: ReactNode
  title?: string
  description?: string
  noindex?: boolean
  className?: string
}

export function Layout({ 
  children, 
  title = 'FreedomPress Core',
  description = 'FreedomPress Core Framework',
  noindex = false,
  className = ''
}: LayoutProps) {
  return (
    <>
      <SEO 
        title={title}
        description={description}
        noindex={noindex}
      />
      
      <div className={`min-h-screen bg-gray-50 ${className}`}>
        <Navigation />
        
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
        
        <footer className="bg-white border-t">
          <div className="container mx-auto px-4 py-6">
            <p className="text-center text-gray-600 text-sm">
              Powered by FreedomPress Core Framework
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}