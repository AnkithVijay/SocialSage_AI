import * as admin from 'firebase-admin';
import { getMarketAnalysis } from './analysis/marketAnalysis';

// Initialize Firebase Admin
admin.initializeApp();

// Export functions
export {
  // Analysis functions
  getMarketAnalysis,
}; 