import { Timestamp } from 'firebase/firestore';

// --- Root Stack Navigation Parameters ---
export type RootStackParamList = {
    AuthScreen: undefined;
    CommunityScreen: undefined;
    CommunityDetailScreen: { community: Community };
    CreateCommunityScreen: undefined;
    GroupChatScreen: { groupId: string; groupName: string; communityId: string };
    ChatRoomScreen: { chatId: string; recipientId: string };
    UserProfileScreen: { userId: string };
    ProfileScreen: undefined;    // ← add this
    ChatScreen: undefined;
    EditCommunityScreen: { community: Community };
    CreateGroupChatScreen: { communityId: string };
    GroupDetailsScreen: { groupId: string; groupName: string; communityId: string };

    // NEW SCREENS FOR BUSINESSES
    BusinessesScreen: undefined;
    CreateBusinessScreen: { catalog?: CatalogItem[] }; // Allows passing initial catalog
    CatalogEditorScreen: {
      businessId: string;
      businessName: string;
      coverImageUrl?: string | null;
      description: string;
      location: string;
      type: string;
      catalog: CatalogItem[];
    };
      AddCatalogScreen: { catalog: CatalogItem[] }; // Specific screen to add new item to catalog in bulk/editor mode
    BusinessChatScreen: { businessId: string; businessName: string; coverImageUrl?: string | null }; // Corrected: accepts businessName and coverImageUrl
   
    MyBusinessScreen: {
    businessId: string;
    businessName: string;
    coverImageUrl: string | null;
    description: string;
    location: string;
    type: string;
    catalog?: CatalogItem[];

  };
EditBusinessScreen: {
  businessId: string;
  businessName: string;
  coverImageUrl?: string | null;
  description: string;
  location: string;
  type: string;
  catalog?: CatalogItem[];
};

  EHailingScreen: undefined;
  BeADriverScreen: undefined;
  
    // BOTTOM TABS (used in App.tsx as a screen name)
    BottomTabs: undefined;
    Auth: undefined;

    ShopScreen: {
  businessId?: string;
  businessName?: string;
  catalog?: CatalogItem[];
};

};


export type Community = {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  createdBy: string;
  createdAt: any; 
  location?: string;
  categories?: string[];
};


export type UserProfile = {
  id: string; // User's Firestore document ID (UID)
  username: string;
  profilePic?: string;
  aboutMe?: string;
  socialLink?: string; // Optional social media link
  uid: string; // Firebase Authentication UID (should match id)
};

// Message interface for both ChatRoomScreen and GroupChatScreen
export interface Message { // Changed to interface for consistency and extensibility
  id: string; // Firestore document ID for the message
  text?: string; // Message text
  senderId: string; // UID of the sender
  sender: string; // Display name of the sender (e.g., username)
  timestamp: Date | Timestamp; // When the message was sent (can be Date for optimistic, Timestamp from Firestore)
  senderProfilePic?: string; // URL to sender's profile picture
  mediaUrl?: string; // URL for image/video/file in Firebase Storage
  mediaType?: 'image' | 'video' | 'file'; // Type of media
  fileName?: string; // Original file name (for file uploads)
  fileSize?: number; // Size of the file in bytes
  // Client-side only properties for upload status (CRITICAL FOR OPTIMISTIC UI):
  uploading?: boolean; // true if media is still uploading
  uploadProgress?: number; // 0-100%
  uploadError?: string; // error message if upload failed
  tempId?: string; // Temporary ID for optimistic updates
}

// NEW: Business Data Models
export interface CatalogItem {
  id?: string;  
  tempId?: string; // Client-side only: Temporary ID for items before saving to Firestore
  name: string;
  price: number; // Store as number for calculations
  description?: string;
  imageUrl?: string; // URL to the item's image in Firebase Storage
  uploading?: boolean;
  uploadProgress?: number; // 0-100
  uploadError?: string;
   quantity?: number;
  category?: string;

}

export interface Business {
  id: string; // Firestore Document ID for the business
  name: string;
  description?: string;
  type: string; // e.g., "Restaurant", "Salon", "Retail"
  location: string;
  imageUrl?: string; // URL to the business's cover image in Firebase Storage
  catalog?: CatalogItem[]; // Array of catalog items
  createdBy: string; // UID of the user who created it
  createdAt: Timestamp; // Firestore timestamp when the business was created
  ownerId?: string; // NEW: Added ownerId as seen in BusinessesScreen data structure
}