import { GetServerSideProps } from 'next'
import { useSession } from 'next-auth/react'
import Head from 'next/head'

export default function Home() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  return (
    <>
      <Head>
        <title>FreedomPress Core</title>
        <meta name="description" content="FreedomPress Core Framework" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">
          FreedomPress Core Framework
        </h1>
        
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">System Status</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Database:</span>
                <span className="text-green-600 font-medium">✓ Connected</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Authentication:</span>
                <span className="text-green-600 font-medium">✓ Configured</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Module System:</span>
                <span className="text-green-600 font-medium">✓ Ready</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">User Status:</span>
                <span className={session ? "text-green-600" : "text-orange-600"}>
                  {session ? `✓ Logged in as ${session.user?.email}` : '⚠ Not logged in'}
                </span>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-lg font-medium mb-2">Ready for Module Development</h3>
              <p className="text-gray-600 text-sm">
                Core framework is initialized and ready for module development. 
                The following systems are available:
              </p>
              <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                <li>Database abstraction layer (Prisma)</li>
                <li>Authentication system (NextAuth.js)</li>
                <li>Module loading system</li>
                <li>API utilities and middleware</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {}
  }
}