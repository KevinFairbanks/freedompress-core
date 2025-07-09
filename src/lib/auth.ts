import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import GitHubProvider from 'next-auth/providers/github'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from './prisma'
import { 
  verifyPassword, 
  checkAccountLockout, 
  recordFailedAttempt, 
  recordSuccessfulLogin,
  createAuditLog,
  validateEmail,
  validateEnvironment
} from './security'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          await createAuditLog(null, 'LOGIN_FAILED', 'credentials', { reason: 'missing_credentials' }, req as any, false)
          return null
        }

        // Validate email format
        if (!validateEmail(credentials.email)) {
          await createAuditLog(null, 'LOGIN_FAILED', 'credentials', { reason: 'invalid_email', email: credentials.email }, req as any, false)
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user) {
          await createAuditLog(null, 'LOGIN_FAILED', 'credentials', { reason: 'user_not_found', email: credentials.email }, req as any, false)
          return null
        }

        // Check if account is locked
        if (await checkAccountLockout(user.id)) {
          await createAuditLog(user.id, 'LOGIN_FAILED', 'credentials', { reason: 'account_locked' }, req as any, false)
          return null
        }

        // Check if account is active
        if (!user.isActive) {
          await createAuditLog(user.id, 'LOGIN_FAILED', 'credentials', { reason: 'account_inactive' }, req as any, false)
          return null
        }

        // Verify password
        if (!user.password) {
          await createAuditLog(user.id, 'LOGIN_FAILED', 'credentials', { reason: 'no_password_set' }, req as any, false)
          return null
        }

        const isPasswordValid = await verifyPassword(credentials.password, user.password)
        if (!isPasswordValid) {
          await recordFailedAttempt(user.id)
          await createAuditLog(user.id, 'LOGIN_FAILED', 'credentials', { reason: 'invalid_password' }, req as any, false)
          return null
        }

        // Successful login
        await recordSuccessfulLogin(user.id)
        await createAuditLog(user.id, 'LOGIN_SUCCESS', 'credentials', null, req as any, true)

        return {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
          role: user.role
        }
      }
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID || '',
      clientSecret: process.env.GITHUB_SECRET || ''
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || ''
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub as string
        session.user.role = token.role as string
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin'
  }
}