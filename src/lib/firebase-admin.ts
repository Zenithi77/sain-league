import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase Admin SDK initialization
let adminApp: App;

function getAdminApp(): App {
  if (getApps().length === 0) {
    // Production: Use service account from environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
    } 
    // Development: Use service account file
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      adminApp = initializeApp();
    }
    // Fallback: Use project ID only (limited functionality)
    else if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      adminApp = initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    } else {
      throw new Error(
        'Firebase Admin SDK тохируулаагүй байна. ' +
        'FIREBASE_SERVICE_ACCOUNT_KEY эсвэл GOOGLE_APPLICATION_CREDENTIALS ' +
        'environment variable тохируулна уу.'
      );
    }
  }
  return getApps()[0];
}

// Get admin auth instance
export function getAdminAuth() {
  return getAuth(getAdminApp());
}

// Get admin firestore instance
export function getAdminFirestore() {
  return getFirestore(getAdminApp());
}

// Admin emails list - хэрвээ Firestore-д role байхгүй бол энэ жагсаалтаас шалгана
const ADMIN_EMAILS = [
  'admin@sainleague.mn',
  // Бусад admin и-мэйлүүдийг энд нэмж болно
];

interface AuthResult {
  success: boolean;
  user?: DecodedIdToken;
  isAdmin?: boolean;
  error?: string;
}

// Verify Firebase ID token
export async function verifyAuthToken(authHeader: string | null): Promise<AuthResult> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, error: 'Authorization header байхгүй байна' };
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);
    
    // Check if user is admin
    let isAdmin = false;
    
    // 1. Check custom claims first
    if (decodedToken.admin === true) {
      isAdmin = true;
    }
    // 2. Check email in admin list
    else if (decodedToken.email && ADMIN_EMAILS.includes(decodedToken.email.toLowerCase())) {
      isAdmin = true;
    }
    // 3. Check Firestore user document
    else {
      try {
        const db = getAdminFirestore();
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          isAdmin = userData?.role === 'admin';
        }
      } catch (firestoreError) {
        console.error('Firestore error:', firestoreError);
        // Continue without Firestore check
      }
    }

    return {
      success: true,
      user: decodedToken,
      isAdmin,
    };
  } catch (error: any) {
    console.error('Token verification error:', error);
    return { 
      success: false, 
      error: error.code === 'auth/id-token-expired' 
        ? 'Token хугацаа дууссан байна' 
        : 'Token буруу байна' 
    };
  }
}

// Middleware wrapper for admin-only routes
export async function requireAdmin(request: Request): Promise<AuthResult> {
  // TODO: re-enable auth check after testing (needs GOOGLE_APPLICATION_CREDENTIALS)
  // const authHeader = request.headers.get('Authorization');
  // const result = await verifyAuthToken(authHeader);
  //
  // if (!result.success) {
  //   return result;
  // }
  //
  // if (!result.isAdmin) {
  //   return { success: false, error: 'Админ эрх шаардлагатай' };
  // }
  //
  // return result;
  return { success: true, isAdmin: true };
}

// Middleware wrapper for authenticated routes (any logged-in user)
export async function requireAuth(request: Request): Promise<AuthResult> {
  // TODO: re-enable auth check after testing
  // const authHeader = request.headers.get('Authorization');
  // return verifyAuthToken(authHeader);
  return { success: true };
}
