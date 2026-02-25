import { Amplify } from 'aws-amplify'
import { signIn, signOut, signUp, confirmSignUp, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth'

Amplify.configure(
  {
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID!,
        userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID!,
      },
    },
  },
  { ssr: true }
)

export { signIn, signOut, signUp, confirmSignUp, getCurrentUser, fetchAuthSession }
