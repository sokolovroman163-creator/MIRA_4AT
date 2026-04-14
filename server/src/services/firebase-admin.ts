import admin from 'firebase-admin'

let initialized = false

export function initFirebaseAdmin(): void {
  if (initialized) return

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[Firebase] Missing credentials — auth verification will fail')
    return
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  })

  initialized = true
  console.log('[Firebase Admin] Initialized successfully')
}

export async function verifyFirebaseToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
  if (!initialized) {
    throw new Error('Firebase Admin not initialized')
  }
  return admin.auth().verifyIdToken(idToken)
}
