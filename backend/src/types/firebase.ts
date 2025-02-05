// User profile interface
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  preferences?: {
    notifications: boolean;
    theme: 'light' | 'dark';
  };
}

// Analysis result interface
export interface AnalysisResult {
  id: string;
  userId: string;
  timestamp: FirebaseFirestore.Timestamp;
  marketData: {
    sentiment: number;
    confidence: number;
    trends: string[];
  };
  socialSignals: {
    sentiment: number;
    volume: number;
    topMentions: string[];
  };
  recommendations: string[];
}

// Social interaction interface
export interface SocialInteraction {
  id: string;
  userId: string;
  timestamp: FirebaseFirestore.Timestamp;
  type: 'share' | 'comment' | 'like';
  content?: string;
  relatedAnalysisId?: string;
} 