// Screens/context/appStyles.ts
import { StyleSheet, Platform, Dimensions } from 'react-native';
import { ThemeColors } from './ThemeContext'; // Ensure this import path is correct
const { width, height } = Dimensions.get("window");

export const BOTTOM_TAB_BAR_HEIGHT = 70; // Adjust this value precisely if needed

export const SPACING = {
  xsmall: 4,
  small: 8,
  medium: 16,
  large: 24,
  xlarge: 32,
  xxlarge: 40,
};

export const FONT_SIZES = {
  xsmall: 12,
  small: 14,
  medium: 16,
  large: 18,
  xlarge: 20,
  xxlarge: 24,
  heading1: 28,
  heading2: 26,
  heading3: 20,
};

const createStyles = (colors: ThemeColors) => {
  return {
    global: StyleSheet.create({
      flex1: { flex: 1 },
      centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
      },
      backButton: {
        padding: SPACING.xsmall,
        marginRight: SPACING.medium,
      },
      safeArea: {
        flex: 1,
        backgroundColor: colors.background,
      },
    headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.medium,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
    marginBottom: SPACING.small,
      },
      headerTitle: {
        fontSize: FONT_SIZES.heading1,
        fontWeight: "bold",
        color: colors.text,
      },
      primaryButton: {
        backgroundColor: colors.primary,
        paddingVertical: SPACING.medium,
        paddingHorizontal: SPACING.large,
        borderRadius: SPACING.large,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 120,
        flexDirection: 'row',
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 8,
        ...Platform.select({
          web: {
            cursor: 'pointer',
            boxShadow: '0px 4px 6px rgba(0,0,0,0.2)',
          }
        })
      },
      primaryButtonText: {
        color: colors.activeFilterText,
        fontSize: FONT_SIZES.large,
        fontWeight: 'bold',
      },
      loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
      },
      loadingOverlayText: {
        marginTop: SPACING.small,
        fontSize: FONT_SIZES.medium,
        fontWeight: 'bold',
        color: colors.activeFilterText,
      },
      errorText: { // Defined here in global for wider use
        color: colors.error,
        fontSize: FONT_SIZES.medium,
        marginBottom: SPACING.medium,
        textAlign: 'center',
      },
      loginPromptText: { // Defined here in global for wider use
        color: colors.primary,
        fontSize: FONT_SIZES.medium,
        textDecorationLine: 'underline',
      },
    }),

    createGroupChatScreen: StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: SPACING.large,
    backgroundColor: colors.background,
  },
        backButton: {
        padding: SPACING.xsmall,
        marginRight: SPACING.medium,
      },
  title: {
    fontSize: FONT_SIZES.heading2,
    color: colors.textPrimary,
    fontWeight: 'bold',
    marginBottom: SPACING.large,
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.cardBackground,
    color: colors.textPrimary,
    borderRadius: 8,
    padding: SPACING.medium,
    marginBottom: SPACING.medium,
  },
  descriptionInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: SPACING.medium,
    alignItems: 'center',
  },
  createButtonText: {
    color: colors.buttonText,
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
   button: {
  backgroundColor: colors.primary,
  borderRadius: 8,
  paddingVertical: SPACING.medium,
  paddingHorizontal: SPACING.large,
  alignItems: 'center',
  marginTop: SPACING.medium,
},
buttonText: {
  color: colors.buttonText,
  fontSize: FONT_SIZES.medium,
  fontWeight: '600',
},
}),

editCommunityScreen: StyleSheet.create({
  scrollViewContent: {
    flexGrow: 1,
    padding: SPACING.large,
    backgroundColor: colors.background,
  },
       backButton: {
        padding: SPACING.xsmall,
        marginRight: SPACING.medium,
      },
  header: {
    fontSize: FONT_SIZES.heading2,
    color: colors.textPrimary,
    fontWeight: 'bold',
    marginBottom: SPACING.large,
    textAlign: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.large,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: SPACING.small,
  },
  addLogoText: {
    color: colors.primary,
    fontSize: FONT_SIZES.medium,
  },
  input: {
    backgroundColor: colors.cardBackground,
    color: colors.textPrimary,
    borderRadius: 8,
    padding: SPACING.medium,
    marginBottom: SPACING.medium,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: SPACING.medium,
    alignItems: 'center',
    marginTop: SPACING.large,
  },
  saveButtonText: {
    color: colors.buttonText,
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
  loadingOverlayScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlayText: {
    marginTop: SPACING.medium,
    color: colors.textPrimary,
  },
  
  
// Inside createStyles(colors).editCommunityScreen:
// ... (add these new styles)

locationContainer: {
  position: 'relative', 
  zIndex: 10, 
  marginBottom: SPACING.medium, 
},
inputWithSuggestions: {
  borderBottomLeftRadius: 0,
  borderBottomRightRadius: 0,
  borderBottomWidth: 0, 
},
suggestionsList: {
  position: 'absolute',
  top: '100%', 
  left: 0,
  right: 0,
  maxHeight: 200, 
  borderWidth: 1,
  borderTopWidth: 0, 
  borderBottomLeftRadius: 10,
  borderBottomRightRadius: 10,
  borderColor: colors.borderColor, 
  backgroundColor: colors.cardBackground,  
},
suggestionItem: {
  padding: 15,
  borderBottomWidth: 1,
  borderBottomColor: colors.borderColor, 
},

}),

communityDetailScreen: StyleSheet.create({
  scrollViewContent: {
    flexGrow: 1,
    padding: SPACING.medium,
    paddingBottom: BOTTOM_TAB_BAR_HEIGHT + SPACING.large,
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: SPACING.medium,
    fontSize: FONT_SIZES.medium,
    color: colors.secondaryText,
    textAlign: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.medium,
  },
  communityLogo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginBottom: SPACING.medium,
    borderWidth: 2,
    borderColor: colors.borderColor,
    backgroundColor: colors.cardBackground,
  },
  header: {
    fontSize: FONT_SIZES.heading1,
    fontWeight: "bold",
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  settingsButton: {
    padding: SPACING.xsmall,
  },
  settingsIcon: {
    color: colors.primary,
  },
  description: {
    fontSize: FONT_SIZES.medium,
    color: colors.secondaryText,
    marginBottom: SPACING.medium,
    textAlign: 'center',
  },
  creatorButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: SPACING.medium,
    paddingHorizontal: SPACING.small,
  },
  editButton: {
    flex: 1,
    backgroundColor: colors.secondary,
    padding: SPACING.small,
    borderRadius: SPACING.small,
    alignItems: 'center',
    marginRight: SPACING.small,
  },
  editButtonText: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: FONT_SIZES.medium,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: colors.error,
    padding: SPACING.small,
    borderRadius: SPACING.small,
    alignItems: 'center',
    marginLeft: SPACING.small,
  },
  deleteButtonText: {
    color: colors.activeFilterText,
    fontWeight: 'bold',
    fontSize: FONT_SIZES.medium,
  },
  joinButton: {
    backgroundColor: colors.primary,
    padding: SPACING.medium,
    borderRadius: SPACING.small,
    alignItems: "center",
    marginBottom: SPACING.medium,
  },
  joinButtonText: {
    color: colors.activeFilterText,
    fontWeight: "bold",
    fontSize: FONT_SIZES.large,
  },
  subHeader: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: SPACING.small,
    marginTop: SPACING.medium,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
    paddingBottom: SPACING.xsmall,
  },
  groupChatItem: {
    padding: SPACING.medium,
    backgroundColor: colors.cardBackground,
    borderRadius: SPACING.small,
    marginBottom: SPACING.small,
    borderWidth: 1,
    borderColor: colors.borderColor,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  
  
  groupChatText: {
    fontSize: FONT_SIZES.medium,
    color: colors.text,
  },
  noGroupsText: {
    textAlign: "center",
    color: colors.secondaryText,
    marginTop: SPACING.large,
  },

    saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: SPACING.medium,
    alignItems: 'center',
    marginTop: SPACING.large,
  },
  saveButtonText: {
    color: colors.buttonText,
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
  createGroupButton: {
    backgroundColor: colors.accent,
    paddingVertical: SPACING.medium,
    marginTop: SPACING.medium,
  },
  createGroupButtonText: {
    color: colors.activeFilterText,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  flatListContent: {
    paddingBottom: 150,
  },

  infoSection: {
  paddingHorizontal: SPACING.large,
  marginVertical: SPACING.medium,
  borderTopWidth: 1,
  borderBottomWidth: 1,
  borderColor: colors.borderColor,
  paddingVertical: SPACING.medium,
},
infoRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: SPACING.medium,
},
infoText: {
  color: colors.text,
  fontSize: FONT_SIZES.medium,
  marginLeft: SPACING.small,
  flexShrink: 1, // Allow text to wrap
},
categoryTagsContainer: {
  flexDirection: 'row',
  flexWrap: 'wrap', // Allow tags to wrap to the next line
},
categoryTag: {
  backgroundColor: colors.primaryLight,
  borderRadius: 15,
  paddingVertical: 5,
  paddingHorizontal: 12,
  marginRight: 8,
  marginBottom: 8,
},
categoryTagText: {
  color: colors.primary,
  fontSize: FONT_SIZES.small,
  fontWeight: '600',
},

}),

    communityScreen: StyleSheet.create({
      scrollView: {
        flex: 1,
        backgroundColor: colors.background,
      },
      scrollViewContent: {
        flexGrow: 1,
        paddingBottom: BOTTOM_TAB_BAR_HEIGHT + SPACING.large,
      },
      safeArea: {
        flex: 1,
        backgroundColor: colors.background,
      },
      listHeaderContainer: {
        backgroundColor: colors.background,
        paddingBottom: SPACING.medium,
      },
      headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.large,
        paddingHorizontal: SPACING.medium,
        paddingTop: SPACING.small,
      },
      pageTitle: {
        fontSize: FONT_SIZES.heading1,
        fontWeight: "bold",
        color: colors.text,
      },
      themeToggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      communityLogoFallback: {
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: colors.primaryLight,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 8,
        },
        communityLogoFallbackText: {
          color: colors.primary,
          fontSize: FONT_SIZES.large,
          fontWeight: 'bold',
        },
      themeToggleText: {
        fontSize: FONT_SIZES.medium,
        marginRight: SPACING.small,
        color: colors.secondaryText,
      },
      searchBar: {
        width: "100%",
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 25,
        borderWidth: 1,
        fontSize: FONT_SIZES.medium,
        marginBottom: SPACING.large,
        backgroundColor: colors.cardBackground,
        borderColor: colors.borderColor,
        color: colors.text,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
        ...Platform.select({
          web: {
            boxShadow: '0 2px 3px rgba(0,0,0,0.1)',
          },
        }),
        marginHorizontal: SPACING.medium,
      },
      filterContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginBottom: SPACING.large + SPACING.small,
        backgroundColor: colors.cardBackground,
        borderRadius: 10,
        padding: SPACING.xsmall,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        ...Platform.select({
          web: {
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          },
        }),
        marginHorizontal: SPACING.medium,
      },
      filterButton: {
        flex: 1,
        paddingVertical: 10,
        marginHorizontal: 3,
        borderRadius: 8,
        alignItems: "center",
      },
      filterText: {
        fontWeight: "600",
        fontSize: FONT_SIZES.medium - 1,
      },
      // Add these to your communityScreen styles
categoryListContainer: {
  height: 50, // Give the container a fixed height
  marginTop: 4,
  marginBottom: 8,
},
categoryButton: {
  backgroundColor: colors.cardBackground,
  borderColor: colors.borderColor,
  borderWidth: 1,
  paddingHorizontal: 16,
  paddingVertical: 8,
  borderRadius: 20,
  marginRight: 8,
  justifyContent: 'center',
  alignItems: 'center',
},
categoryButtonActive: {
  backgroundColor: colors.primary,
  borderColor: colors.primary,
},
categoryButtonText: {
  color: colors.text,
  fontSize: FONT_SIZES.medium,
},
categoryButtonTextActive: {
  color: colors.activeFilterText, // Use a bright color for active text
  fontWeight: 'bold',
},
      
      activityIndicatorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        minHeight: 150,
      },
      loadingText: {
        marginTop: SPACING.small,
        fontSize: FONT_SIZES.medium,
        color: colors.secondaryText,
      },
      communityListRow: {
        justifyContent: "space-between",
        marginBottom: SPACING.small,
        paddingHorizontal: SPACING.medium,
      },
      communityCard: {
        flex: 1,
        margin: SPACING.small,
        padding: 15,
        backgroundColor: colors.cardBackground,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borderColor,
        alignItems: "center",
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
        ...Platform.select({
          web: {
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            flexBasis: '48%',
          },
        }),
      },
      communityLogo: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginBottom: SPACING.xsmall,
        backgroundColor: colors.placeholder,
        borderWidth: 1,
        borderColor: colors.borderColor,
      },
      communityCardTitle: {
        fontSize: FONT_SIZES.medium + 1,
        fontWeight: "bold",
        color: colors.text,
        flexShrink: 1,
        textAlign: 'left',
        marginRight: SPACING.xsmall,
      },
      communityCardDescription: {
        fontSize: FONT_SIZES.xsmall + 1,
        color: colors.secondaryText,
        textAlign: 'center',
      },
      communityCardContent: {
        flex: 1,
        width: '100%',
        marginTop: SPACING.xsmall,
        alignItems: 'flex-start',
        paddingHorizontal: SPACING.small,
        justifyContent: 'center',
      },
      userCard: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 15,
        marginBottom: SPACING.small,
        borderRadius: 10,
        borderWidth: 1,
        backgroundColor: colors.cardBackground,
        borderColor: colors.borderColor,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 3,
        ...Platform.select({
          web: {
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          },
        }),
        marginHorizontal: SPACING.medium,
      },
      userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: SPACING.medium,
        backgroundColor: colors.placeholder,
        borderWidth: 1,
        borderColor: colors.borderColor,
      },
      userCardUsername: {
        fontSize: FONT_SIZES.medium,
        color: colors.text,
        fontWeight: "500",
        flexShrink: 1,
        textAlign: 'left',
        marginRight: SPACING.xsmall,
      },
      lastMessagePreview: {
        fontSize: FONT_SIZES.small,
        color: colors.secondaryText,
        marginTop: SPACING.xsmall / 2,
        lineHeight: FONT_SIZES.medium,
        textAlign: 'left',
      },
      cardTimestamp: {
        fontSize: FONT_SIZES.xsmall,
        color: colors.secondaryText,
        marginLeft: 'auto',
        alignSelf: 'flex-end',
      },
      cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        width: '100%',
        marginBottom: SPACING.xsmall / 2,
      },
      userCardContent: {
        flex: 1,
        justifyContent: 'center',
      },
      userCardDescription: {
        fontSize: FONT_SIZES.small,
        color: colors.secondaryText,
        marginTop: SPACING.xsmall / 2,
        lineHeight: FONT_SIZES.medium,
      },
      noResultsText: {
        textAlign: "center",
        marginTop: SPACING.xlarge,
        fontSize: FONT_SIZES.medium,
        color: colors.secondaryText,
        paddingBottom: SPACING.large,
      },
      fab: {
        position: 'absolute',
        width: 60,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
        right: SPACING.large,
        top: 'auto',
        bottom: BOTTOM_TAB_BAR_HEIGHT + SPACING.large,
        backgroundColor: colors.primary,
        borderRadius: 30,
        elevation: 12,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        zIndex: 999,
      },
      fabText: {
        fontSize: FONT_SIZES.xxlarge,
        color: colors.activeFilterText,
        lineHeight: Platform.OS === 'ios' ? FONT_SIZES.xxlarge : FONT_SIZES.xxlarge + 5,
        fontWeight: 'bold',
      },
      listFooterContainer: {
        paddingVertical: SPACING.medium,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
      },
      noMoreItemsText: {
        fontSize: FONT_SIZES.small,
        color: colors.secondaryText,
        marginTop: SPACING.small,
      },
      flatListContentContainer: {
        paddingBottom: BOTTOM_TAB_BAR_HEIGHT + SPACING.large,
        backgroundColor: colors.background,
      },
      flatListStyle: {
        flex: 1,
        backgroundColor: colors.background,
        paddingHorizontal: SPACING.medium,
      },

         memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.small,
        paddingVertical: SPACING.xsmall,
        paddingHorizontal: SPACING.small,
        backgroundColor: colors.background,
        borderRadius: SPACING.small,
      },
      memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: SPACING.medium,
        backgroundColor: colors.placeholder,
        justifyContent: 'center',
        alignItems: 'center',
      },
      memberAvatarFallback: {
        backgroundColor: colors.secondary,
      },
      memberAvatarFallbackText: {
        color: colors.buttonText,
        fontSize: FONT_SIZES.medium,
        fontWeight: 'bold',
      },
      memberName: {
        fontSize: FONT_SIZES.medium,
        color: colors.textPrimary,
        fontWeight: '500',
      },
    }),

createBusinessScreen: StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
// appStyles.ts (inside createBusinessScreen)
inputGroup: {
  marginBottom: 12,
},

scrollContent: {
  flexGrow: 1,
  justifyContent: 'flex-start',
  paddingHorizontal: 16,
  paddingBottom: 32,
  paddingTop: 16,
},

  header: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  subHeader: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderRadius: 8,
    padding: 12,
    color: colors.textPrimary,
    backgroundColor: colors.cardBackground,
    marginBottom: 16,
  },
    deleteButton: {
    backgroundColor: colors.error,
    borderRadius: 8,
    paddingVertical: SPACING.medium,
    alignItems: 'center',
    marginTop: SPACING.medium,
  },
  deleteButtonText: {
    color: colors.activeFilterText,
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderRadius: 8,
    padding: 12,
    color: colors.textPrimary,
    backgroundColor: colors.cardBackground,
    height: 100,
    textAlignVertical: 'top' as const,
    marginBottom: 16,
  },
picker: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
},
  pickerStyles:{
    width:'70%',
    backgroundColor:'gray',
    color:'white'
  },

  imagePicker: {
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.surface,
    marginBottom: 16,
  },
businessPicker: {
  borderWidth: 1,
  borderColor: colors.borderColor,
  borderRadius: 8,
  paddingHorizontal: 12,
  backgroundColor: colors.cardBackground,
},
businessPickerDropdown: {
  borderWidth: 1,
  borderColor: colors.borderColor,
  borderRadius: 8,
  backgroundColor: colors.surface,
},
  imagePickerButton: {
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.surface,
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: colors.textPrimary,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: colors.textPrimary,
    marginTop: 24,
    marginBottom: 12,
  },
  catalogItem: {
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  catalogItemHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  catalogImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  catalogInfo: {
    flex: 1,
  },
  catalogItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  catalogItemTextContainer: {
    flex: 1,
  },
  catalogItemName: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: colors.textPrimary,
  },
  catalogName: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: colors.textPrimary,
  },
  catalogItemPrice: {
    fontSize: 14,
    color: colors.secondaryText,
  },
  catalogItemDescription: {
    fontSize: 14,
    color: colors.secondaryText,
    marginTop: 4,
  },
  catalogDescription: {
    fontSize: 14,
    color: colors.secondaryText,
    marginTop: 4,
  },
  addButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  addButtonText: {
    color: colors.activeFilterText,
    fontWeight: 'bold' as const,
    fontSize: 16,
  },
  saveButton: {
    marginTop: 24,
    backgroundColor: colors.accent,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  saveButtonText: {
    color: colors.activeFilterText,
    fontWeight: 'bold' as const,
    fontSize: 18,
  },
  submitButton: {
    marginTop: 24,
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  submitButtonText: {
    color: colors.activeFilterText,
    fontWeight: 'bold' as const,
    fontSize: 18,
  },
  loading: {
    marginVertical: 12,
  },
}),

addCatalogScreen: StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  scrollContent: {
    paddingBottom: 32,
    paddingTop: 16,
    flexGrow: 1,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  subHeader: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderRadius: 8,
    padding: 12,
    color: colors.textPrimary,
    backgroundColor: colors.cardBackground,
    marginBottom: 16,
  },
  imagePickerButton: {
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.surface,
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  catalogItem: {
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  catalogItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  catalogItemTextContainer: {
    flex: 1,
  },
  catalogItemName: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: colors.textPrimary,
  },
  catalogItemDescription: {
    fontSize: 14,
    color: colors.secondaryText,
    marginTop: 4,
  },
  addButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  addButtonText: {
    color: colors.activeFilterText,
    fontWeight: 'bold' as const,
    fontSize: 16,
  },
  saveButton: {
    marginTop: 24,
    backgroundColor: colors.accent,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  saveButtonText: {
    color: colors.activeFilterText,
    fontWeight: 'bold' as const,
    fontSize: 18,
  },
}),

WalletScreen: StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },

    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 6,
    },
    screenTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
    headerActions: { flexDirection: 'row', gap: 8 },
    iconBtn: {
      padding: 10,
      borderRadius: 10,
      backgroundColor: colors.cardBackground,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderColor,
    },

    balanceCard: {
      margin: 16,
      padding: 16,
      borderRadius: 16,
      backgroundColor: colors.cardBackground,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderColor,
      shadowColor: colors.shadowColor,
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 12,
      elevation: 2,
    },
    balanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    balanceLabel: { fontSize: 12, color: colors.secondaryText, fontWeight: '600' },
    balanceValue: { fontSize: 32, fontWeight: '800', color: colors.textPrimary, marginTop: 6 },
    balanceSub: { fontSize: 12, color: colors.secondaryText, marginTop: -2 },

    idRow: { marginTop: 10, flexDirection: 'row' },
    idPill: {
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderColor,
    },
    idPillText: { color: colors.secondaryText, fontSize: 12 },

    topUpRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      marginTop: 4,
      marginBottom: 10,
    },
    amountField: {
      flex: 1,
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: Platform.select({ ios: 12, android: 8 }) as number,
      color: colors.textPrimary,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderColor,
    },
    topUpBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
    },
    topUpBtnText: { color: colors.buttonText || '#fff', fontWeight: '700' },

    sectionTitle: {
      paddingHorizontal: 16,
      marginTop: 8,
      marginBottom: 8,
      fontSize: 14,
      fontWeight: '700',
      color: colors.secondaryText,
    },
    listPad: { paddingHorizontal: 16, paddingBottom: 24 },

    txItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
    },
    txIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderColor,
      marginRight: 12,
    },
    txTitle: { color: colors.textPrimary, fontWeight: '700' },
    txMeta: { color: colors.secondaryText, fontSize: 12, marginTop: 2 },
    txAmount: { fontWeight: '800', marginLeft: 8 },
    txAmountNegative: { color: colors.error, fontWeight: '800' },
    txAmountPositive: { color: colors.success, fontWeight: '800' },

    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderColor,
    },
    loadMoreBtn: {
      alignSelf: 'center',
      marginTop: 12,
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999,
    },
    loadMoreText: { color: colors.buttonText || '#fff', fontWeight: '700' },
    emptyText: { textAlign: 'center', color: colors.secondaryText },

    // Receive QR modal
    qrBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    qrSheet: {
      backgroundColor: colors.cardBackground,
      padding: 16,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderColor,
    },
    qrTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
    qrSubtitle: { color: colors.secondaryText, marginTop: 4 },
    qrBlock: {
      alignSelf: 'center',
      padding: 16,
      borderRadius: 16,
      backgroundColor: colors.surface,
      marginTop: 16,
      marginBottom: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderColor,
    },

    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 8,
    },
    currencyPrefix: { color: colors.secondaryText, fontSize: 16, fontWeight: '700' },
    amountInput: {
      flex: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: Platform.select({ ios: 12, android: 8 }) as number,
      color: colors.textPrimary,
      backgroundColor: colors.cardBackground,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderColor,
    },
    copyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderColor,
    },
    copyBtnText: { color: colors.textPrimary, fontWeight: '700' },

    qrActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 16,
    },
    qrShareBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
    },
    qrShareText: { color: colors.buttonText || '#fff', fontWeight: '700' },
    qrCloseBtn: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.cardBackground,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderColor,
      alignSelf: 'flex-end',
    },
    qrCloseText: { color: colors.textPrimary, fontWeight: '700' },

    // FAB
fab: {
        position: 'absolute',
        width: 60,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
        right: SPACING.large,
        top: 'auto',
        bottom: BOTTOM_TAB_BAR_HEIGHT + SPACING.large,
        backgroundColor: colors.primary,
        borderRadius: 30,
        elevation: 12,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        zIndex: 999,
      },
      fabText: {
        fontSize: FONT_SIZES.xxlarge,
        color: colors.activeFilterText,
        lineHeight: Platform.OS === 'ios' ? FONT_SIZES.xxlarge : FONT_SIZES.xxlarge + 5,
        fontWeight: 'bold',
      },

    // Scanner
    scannerModal: {
      flex: 1,
      backgroundColor: '#000',
      justifyContent: 'center',
      alignItems: 'center',
    },
    camera: { width: '100%', height: '75%' },
    scanOverlay: {
      position: 'absolute',
      bottom: 24,
      left: 0,
      right: 0,
      alignItems: 'center',
      gap: 12,
    },
    scanHint: { color: '#fff', fontWeight: '600' },

    // Send modal
    sendModalCard: {
      backgroundColor: colors.cardBackground,
      padding: 16,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderColor,
      marginTop: 'auto',
      gap: 12,
    },
    sendActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
    },
    cancelBtn: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderColor,
    },
    cancelBtnText: { color: colors.textPrimary, fontWeight: '700' },
    sendBtn: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    sendBtnText: { color: colors.buttonText || '#fff', fontWeight: '700' },
  }),




businessesScreen: StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: BOTTOM_TAB_BAR_HEIGHT + SPACING.large, // Adjust padding for FAB and bottom bar
  },
  safeArea: { // Often handled by global.safeArea, but explicitly defined here too
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.large,
    paddingHorizontal: SPACING.medium,
    paddingTop: SPACING.medium, // Adjust for status bar if not using SafeAreaView always
  },
  pageTitle: {
    fontSize: FONT_SIZES.heading1,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  themeToggleContainer: { // If theme toggle lives here
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeToggleText: {
    fontSize: FONT_SIZES.medium,
    marginRight: SPACING.small,
    color: colors.textSecondary,
  },
  searchBar: {
    width: "100%",
    paddingVertical: SPACING.small + 4, // More vertical padding
    paddingHorizontal: SPACING.medium,
    borderRadius: 25,
    borderWidth: 1,
    fontSize: FONT_SIZES.medium,
    marginBottom: SPACING.large,
    backgroundColor: colors.cardBackground,
    borderColor: colors.border,
    color: colors.textPrimary,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: `0 2px 3px ${colors.shadowColor}1A`,
      },
    }),
    marginHorizontal: SPACING.medium,
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: 'center',
    marginBottom: SPACING.large,
    paddingHorizontal: SPACING.medium,
  },
  filterLabel: {
    fontSize: FONT_SIZES.medium,
    color: colors.textSecondary,
    marginRight: SPACING.small,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: SPACING.small,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.medium,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 120, // Give some minimum width
    justifyContent: 'space-between',
    marginHorizontal: SPACING.xsmall,
  },
  dropdownButtonText: {
    fontSize: FONT_SIZES.medium,
    color: colors.textPrimary,
    marginRight: SPACING.xsmall,
  },
  flatListContent: { // Content style for the FlatList itself
    paddingHorizontal: SPACING.medium,
    paddingBottom: SPACING.large, // Padding at the bottom of the list
  },
  flatListStyle: {
    flex: 1, // Allow FlatList to grow
  },
  loadingText: { // For loading messages within the screen
    marginTop: SPACING.small,
    fontSize: FONT_SIZES.medium,
    color: colors.secondaryText,
    textAlign: 'center',
  },
  activityIndicatorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 150, // Give some height for loading indicator
  },
  noResultsText: {
    textAlign: "center",
    marginTop: SPACING.xlarge,
    fontSize: FONT_SIZES.medium,
    color: colors.secondaryText,
    paddingBottom: SPACING.large,
  },
  tabContainer: {
  flexDirection: 'row',
  justifyContent: 'space-around',
  marginBottom: SPACING.medium,
},

tabButton: {
  paddingVertical: SPACING.small,
  paddingHorizontal: SPACING.large,
  backgroundColor: colors.cardBackground,
  borderRadius: 8,
},

activeTab: {
  backgroundColor: colors.primary,
},

tabText: {
  color: colors.text,
},
tabBar: {
  backgroundColor: colors.background,
},
tabLabel: {
  fontWeight: 'bold',
  fontSize: FONT_SIZES.medium,
},
tabIndicator: {
  backgroundColor: colors.primary,
  height: 3,
},

  businessCard: { // Style for each business item in the list
     flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: colors.cardBackground,
  borderRadius: 16,
  padding: 14,
  marginBottom: 14,
  shadowColor: colors.shadowColor,
  shadowOpacity: 0.10,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: `0 2px 3px ${colors.shadowColor}1A`,
      },
    }),
  },
 


businessImageContainer: {
  width: 62,
  height: 62,
  borderRadius: 14,
  overflow: 'hidden',
  backgroundColor: colors.surface,
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 15,
},

businessImage: {
  width: '100%',
  height: '100%',
  resizeMode: 'cover',
},

businessInitialsFallback: {
  width: '100%',
  height: '100%',
  backgroundColor: colors.primaryLight,
  justifyContent: 'center',
  alignItems: 'center',
  borderRadius: 14,
},

businessInitialsText: {
  color: colors.primary,
  fontWeight: 'bold',
  fontSize: 26,
},

businessInfo: {
  flex: 1,
},

businessName: {
  fontSize: FONT_SIZES.large,
  fontWeight: 'bold',
  color: colors.textPrimary,
  marginBottom: 2,
},

businessDescription: {
  color: colors.secondaryText,
  fontSize: FONT_SIZES.medium,
  marginBottom: 2,
},

metaRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 4,
  gap: 5,
},

businessMeta: {
  color: colors.secondaryText,
  fontSize: FONT_SIZES.small,
  marginLeft: 4,
  marginRight: 6,
  maxWidth: 90,
},

  fab: { // Floating Action Button
    position: 'absolute',
    bottom: BOTTOM_TAB_BAR_HEIGHT + SPACING.large, // Position above the tab bar
    right: SPACING.large,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary, // Primary color for FAB
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 20, // Android elevation
      },
      web: {
        boxShadow: `0px 4px 5px ${colors.shadowColor}4D`, // Web boxShadow
      },
    }),
    zIndex: 1000, // Ensure it's on top
  },
}),



    createCommunityScreen: StyleSheet.create({
      container: {
        flex: 1,
        padding: SPACING.large,
        backgroundColor: colors.background,
      },
      header: {
        fontSize: FONT_SIZES.heading2,
        fontWeight: "bold",
        marginBottom: SPACING.medium,
        color: colors.text,
        textAlign: 'center',
      },
      logoContainer: {
        alignSelf: 'center',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.cardBackground,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.large,
        borderWidth: 2,
        borderColor: colors.borderColor,
        overflow: 'hidden',
      },
      logoImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
      },
      addLogoText: {
        color: colors.primary,
        fontSize: FONT_SIZES.medium,
        fontWeight: '600',
        marginTop: SPACING.small,
      },
      input: {
        height: 50,
        backgroundColor: colors.cardBackground,
        paddingHorizontal: SPACING.small,
        borderRadius: SPACING.small,
        marginBottom: SPACING.medium,
        borderWidth: 1,
        borderColor: colors.borderColor,
        fontSize: FONT_SIZES.medium,
        color: colors.text,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      },
      textArea: {
        height: 100,
        textAlignVertical: "top",
      },
      
      saveButton: {
        backgroundColor: colors.primary,
        padding: SPACING.medium,
        alignItems: "center",
        borderRadius: SPACING.small,
        marginTop: SPACING.medium,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 8,
      },
      saveButtonText: {
        color: colors.activeFilterText,
        fontWeight: "bold",
        fontSize: FONT_SIZES.large,
      },
      loadingOverlayScreen: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
      },
      loadingOverlayText: {
        marginTop: SPACING.medium,
        fontSize: FONT_SIZES.medium,
        color: colors.text,
      },
    }),

userprofileScreen: StyleSheet.create({

      scrollViewContent: {
        flexGrow: 1,
        padding: SPACING.large,
        paddingBottom: BOTTOM_TAB_BAR_HEIGHT + SPACING.xxlarge,
        backgroundColor: colors.background,
      },
  
  loadingText: {
    marginTop: SPACING.medium,
    color: colors.textPrimary,
    fontSize: FONT_SIZES.medium,
  },
  errorText: {
    color: colors.error,
    fontSize: FONT_SIZES.medium,
    textAlign: 'center',
    margin: SPACING.medium,
  },
  
  profileImage: {
    
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: SPACING.large,
    backgroundColor: colors.cardBackground,
  },
   profilePicContainer: {
        alignItems: "center",
        marginBottom: SPACING.xlarge,
      },
      profilePic: {
        width: 130,
        height: 130,
        borderRadius: 65,
        borderWidth: 3,
        backgroundColor: colors.cardBackground,
      },
  username: {
    fontSize: FONT_SIZES.heading2,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: SPACING.large,
    textAlign: 'center',
  },
  sectionContainer: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    padding: SPACING.medium,
    marginBottom: SPACING.large,
  },
  sectionHeader: {
    fontSize: FONT_SIZES.large,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: SPACING.small,
  },
  bioText: {
    fontSize: FONT_SIZES.medium,
    color: colors.textSecondary,
  },
  linkText: {
    fontSize: FONT_SIZES.medium,
    color: colors.link,
    textDecorationLine: 'underline',
  },
}),


    profileScreen: StyleSheet.create({
      safeArea: {
        flex: 1,
        backgroundColor: colors.background,
      },
      scrollViewContent: {
        flexGrow: 1,
        padding: SPACING.large,
        paddingBottom: BOTTOM_TAB_BAR_HEIGHT + SPACING.xxlarge,
      },
      loadingScreen: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
      },
      loadingScreenText: {
        marginTop: SPACING.small,
        fontSize: FONT_SIZES.medium,
        fontWeight: 'bold',
        color: colors.text,
      },
      headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.medium,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
    marginBottom: SPACING.small,
      },
      headerTitle: {
        fontSize: FONT_SIZES.heading1,
        fontWeight: "bold",
        color: colors.text,
      },
      profilePicContainer: {
        alignItems: "center",
        marginBottom: SPACING.xlarge,
      },
      profilePic: {
        width: 130,
        height: 130,
        borderRadius: 65,
        borderWidth: 3,
        backgroundColor: colors.cardBackground,
      },
      changePicText: {
        marginTop: SPACING.small,
        fontSize: FONT_SIZES.medium,
        fontWeight: "600",
        color: colors.primary,
      },
      inputSection: {
        marginBottom: SPACING.large,
        width: '100%',
      },
      label: {
        fontSize: FONT_SIZES.medium,
        color: colors.text,
        marginBottom: SPACING.small,
        fontWeight: '600',
      },
      textInput: {
        borderRadius: SPACING.small,
        paddingVertical: SPACING.small + 2,
        paddingHorizontal: SPACING.medium,
        fontSize: FONT_SIZES.medium,
        borderWidth: 1,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 4,
        backgroundColor: colors.cardBackground,
        borderColor: colors.borderColor,
        color: colors.text,
        shadowColor: colors.shadowColor,
        ...Platform.select({
          web: {
            boxShadow: '0px 2px 3px rgba(0,0,0,0.1)',
          }
        })
      },
      aboutMeInput: {
        height: 120,
        textAlignVertical: "top",
        lineHeight: FONT_SIZES.xlarge,
      },
      saveButton: {
        marginTop: SPACING.xlarge,
        backgroundColor: colors.primary,
        paddingVertical: SPACING.medium,
        borderRadius: SPACING.large,
        alignItems: "center",
        justifyContent: "center",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 12,
        shadowColor: colors.shadowColor,
        ...Platform.select({
          web: {
            cursor: 'pointer',
            boxShadow: '0px 6px 8px rgba(0,0,0,0.3)',
          }
        })
      },
      saveButtonText: {
        fontSize: FONT_SIZES.large,
        fontWeight: "bold",
        letterSpacing: 0.5,
        color: colors.activeFilterText,
      },
    }),

    // Inside createStyles function in Screens/context/appStyles.ts
bottomTabsNavigator: StyleSheet.create({

  fab: {
    position: "absolute",
    bottom: SPACING.medium * 1.5, // Adjusted from 25 to use SPACING
    alignSelf: "center",
    width: 54,
    height: 54,
    borderRadius: 27, // Half of width/height
    backgroundColor: colors.primary,
    ...Platform.select({
      ios: { shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 6.27 },
      android: { elevation: 10 },
      web: { boxShadow: `0px 5px 6.27px ${colors.shadowColor}4D` },
    }),
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  fabText: {
    fontSize: FONT_SIZES.xxlarge,
    color: colors.buttonText, // Use colors.buttonText
    fontWeight: "bold",
  },
  fabSpacer: {
    width: 60, // Equal to FAB width for spacing
  },
  tabButton: { // General style for each tab icon/text wrapper
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: SPACING.small, // Add some vertical padding
  },
  tabText: { // Style for the text label below the icon (if tabBarShowLabel was true)
    color: colors.secondaryText, // Default color for inactive tab text
    fontSize: FONT_SIZES.xsmall,
    marginTop: SPACING.small,
  },
}),

    groupChatScreen: StyleSheet.create({
      safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
        attachmentButton: {
        padding: SPACING.small,
        borderRadius: SPACING.medium,
        backgroundColor: colors.primaryLight,
        marginRight: SPACING.small,
        alignItems: 'center',
        justifyContent: 'center',
      },
      attachmentButtonText: {
        fontSize: FONT_SIZES.large,
      },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.medium,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
    marginBottom: SPACING.small,
  },
  backButton: {
    padding: SPACING.xsmall,
    marginRight: SPACING.small,
  },
  emojiButton: {
  paddingHorizontal: 8,
  justifyContent: 'center',
  alignItems: 'center',
},
emojiButtonText: {
  fontSize: 24,
},

emojiPickerContainer: {
  backgroundColor: colors.cardBackground,
  padding: SPACING.small,
  borderTopWidth: 1,
  borderColor: colors.borderColor,
  maxHeight: 200,
},

emojiPickerScroll: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'flex-start',
},

emojiItem: {
  padding: 6,
  margin: 2,
  borderRadius: 6,
  backgroundColor: colors.cardBackground,
},

emojiText: {
  fontSize: 24,
},

  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SPACING.small,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarFallback: {
    backgroundColor: colors.primary,
  },
  headerAvatarFallbackText: {
    color: colors.buttonText,
    fontSize: FONT_SIZES.large,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: "bold",
    color: colors.textPrimary,
    flex: 1,
  },
  groupDetailsButton: {
    padding: SPACING.xsmall,
    marginLeft: SPACING.small,
  },
  messageScrollView: {
    flex: 1,
  },
  messageList: {
    flexGrow: 1,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.small,
    paddingBottom: SPACING.xlarge * 2, // Adjust as needed for input area
  },
  messageBubbleWrapper: { // Wrapper for avatar + message bubble
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: SPACING.small,
    maxWidth: '85%', // Limits combined width of avatar + message
  },
  myMessageBubbleWrapper: {
    alignSelf: 'flex-end', // Align own messages to the right
    justifyContent: 'flex-end', // Pushes avatar to right if on that side
  },
  otherMessageBubbleWrapper: {
    alignSelf: 'flex-start', // Align other messages to the left
    justifyContent: 'flex-start', // Pushes avatar to left
  },
  messageAvatar: { // Avatar next to messages
    width: 30,
    height: 30,
    borderRadius: 15,
    marginHorizontal: SPACING.small,
    backgroundColor: colors.placeholder, // Fallback
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageAvatarFallback: { // Styles for the fallback avatar (initials)
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageAvatarFallbackText: {
    color: colors.buttonText,
    fontSize: FONT_SIZES.small,
    fontWeight: 'bold',
  },
  messageContainer: { // The actual message bubble content container
    padding: SPACING.small,
    borderRadius: 12,
    flexShrink: 1, // Allows bubble to shrink
  },
  myMessageContainer: {
    backgroundColor: colors.primary, // Primary color for own messages
    borderBottomRightRadius: 2, // Slight adjustment for chat bubble tail
  },
  otherMessageContainer: {
    backgroundColor: colors.cardBackground, // Card background for others' messages
    borderBottomLeftRadius: 2, // Slight adjustment for chat bubble tail
  },
  sender: { // Sender name above message
    fontWeight: "bold",
    color: colors.textSecondary,
    marginBottom: SPACING.small,
  },
  message: { // Text within the message bubble
    fontSize: FONT_SIZES.medium,
    color: colors.textPrimary,
  },
  myMessageText: { // Text color for own messages
    color: colors.buttonText,
  },
  timestamp: { // Timestamp text
    fontSize: FONT_SIZES.xsmall,
    color: colors.textSecondary,
    marginTop: SPACING.small,
    alignSelf: 'flex-end', // Align timestamp to the right within the bubble
  },

  // Media and File specific styles
  mediaMessageImage: {
    width: Dimensions.get('window').width * 0.6, // Adjust width as needed
    height: Dimensions.get('window').width * 0.45, // Maintain aspect ratio
    borderRadius: SPACING.medium,
    marginBottom: SPACING.xsmall,
    resizeMode: 'cover',
  },
  videoMessageContainer: {
    position: 'relative',
    borderRadius: SPACING.medium,
    overflow: 'hidden', // Ensures video thumbnail doesn't overflow
  },
  videoPlayText: {
    color: colors.buttonText,
    fontSize: FONT_SIZES.medium,
    textAlign: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)', // Dark overlay
    borderRadius: SPACING.medium,
  },
  fileMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.small,
    backgroundColor: colors.background, // Background for file bubble
    borderRadius: SPACING.medium,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fileIcon: { // Icon for file messages (e.g., from Ionicons)
    marginRight: SPACING.small,
  },
  fileDetails: { // Container for file name and size
    flex: 1,
  },
  fileNameText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  fileSizeText: {
    fontSize: FONT_SIZES.small,
    color: colors.textSecondary,
  },

  // Upload progress indicators
  uploadProgressBarContainer: {
    width: '100%',
    height: SPACING.xsmall, // Thin progress bar
    backgroundColor: colors.borderColor,
    borderRadius: SPACING.xsmall / 2,
    overflow: 'hidden',
    marginTop: SPACING.xsmall,
  },
  uploadProgressBar: {
    height: '100%',
    backgroundColor: colors.primary, // Progress bar color
    borderRadius: SPACING.xsmall / 2,
  },
  uploadProgressText: {
    fontSize: FONT_SIZES.xsmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xsmall / 2,
  },
  messageErrorBubble: { // Style for messages that failed to upload
    backgroundColor: colors.error + '33', // Lighter error color with transparency
    borderColor: colors.error,
    borderWidth: 1,
  },
  uploadErrorText: {
    fontSize: FONT_SIZES.small,
    color: colors.error,
    marginTop: SPACING.xsmall,
  },

inputContainer: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  flexDirection: 'row',
  alignItems: 'center',
  padding: 8,
  backgroundColor: colors.cardBackground,
  borderTopWidth: 1,
  borderTopColor: colors.borderColor,
  zIndex: 10,
  elevation: 10,
}
,
  input: { // Main text input field
    flex: 1,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.medium,
    borderWidth: 1,
    borderRadius: 20, // Rounded corners
    borderColor: colors.border,
    color: colors.textPrimary,
    backgroundColor: colors.cardBackground, // Input field background
  },
  sendButton: { // Send button
    marginLeft: SPACING.small,
    backgroundColor: colors.primary,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.medium,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: colors.buttonText,
    fontWeight: "bold",
  },

  // Attachment options container (popping up above input)
  attachmentOptionsContainer: {
    position: 'absolute',
    bottom: '100%', // Position directly above inputContainer
    width: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.surface, // Background for the options tray
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingVertical: SPACING.small,
    flexDirection: 'row',
    flexWrap: 'wrap', // Allow buttons to wrap if needed
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: SPACING.small,
    zIndex: 1, // Ensure it's above message list
    minHeight: 60,
  },
  attachmentOptionButton: { // Style for individual buttons within attachmentOptionsContainer
    padding: SPACING.small,
    borderRadius: SPACING.medium,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: SPACING.xsmall,
  },
  attachmentOptionButtonText: { // Text style for individual buttons
    fontSize: FONT_SIZES.medium,
    color: colors.textPrimary,
  },
  mediaUploadIndicator: { // For when media is uploading
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.medium,
    backgroundColor: colors.surface,
    borderRadius: SPACING.large,
    flex: 1,
  },
  mediaUploadText: {
    marginLeft: SPACING.small,
    color: colors.textSecondary,
    fontSize: FONT_SIZES.medium,
  },

  // Join Group Prompt (existing)
  joinPromptText: {
    fontSize: FONT_SIZES.medium,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.medium,
  },
  joinButton: {
    backgroundColor: colors.primary,
    padding: SPACING.medium,
    borderRadius: SPACING.small,
    alignItems: "center",
    marginBottom: SPACING.medium,
  },
  joinButtonText: {
    color: colors.buttonText,
    fontWeight: "bold",
    fontSize: FONT_SIZES.large,
  },
    }),

    groupDetailsScreen: StyleSheet.create({ // New style object for GroupDetailsScreen
      safeArea: {
        flex: 1,
        backgroundColor: colors.background,
      },
      scrollViewContent: {
        flexGrow: 1,
        padding: SPACING.medium,
        paddingBottom: SPACING.xxlarge,
      },
      headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.medium,
        paddingHorizontal: SPACING.medium,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
        marginBottom: SPACING.small,
      },
      backButton: {
        padding: SPACING.xsmall,
        marginRight: SPACING.medium,
      },
      headerTitle: {
        fontSize: FONT_SIZES.heading3, // Smaller heading for detail screen
        fontWeight: 'bold',
        color: colors.textPrimary,
        flex: 1,
        textAlign: 'center',
      },
      editButton: {
        padding: SPACING.xsmall,
        marginLeft: SPACING.medium,
      },
      editButtonsContainer: {
        flexDirection: 'row',
        marginLeft: SPACING.medium,
      },
      saveButton: {
        backgroundColor: colors.primary,
        padding: SPACING.small,
        borderRadius: SPACING.small,
        alignItems: 'center',
        justifyContent: 'center',
      },
      cancelButton: {
        backgroundColor: colors.error,
        padding: SPACING.small,
        borderRadius: SPACING.small,
        alignItems: 'center',
        justifyContent: 'center',
      },
      detailSection: {
        marginBottom: SPACING.large,
        backgroundColor: colors.cardBackground,
        padding: SPACING.medium,
        borderRadius: SPACING.medium,
        borderWidth: 1,
        borderColor: colors.borderColor,
      },
      label: {
        fontSize: FONT_SIZES.medium,
        fontWeight: 'bold',
        color: colors.textSecondary,
        marginBottom: SPACING.small,
      },
      valueText: {
        fontSize: FONT_SIZES.large,
        color: colors.textPrimary,
      },
      input: {
        fontSize: FONT_SIZES.large,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: SPACING.small,
        padding: SPACING.small,
        backgroundColor: colors.cardBackground,
      },
      descriptionInput: {
        minHeight: 100,
        textAlignVertical: 'top',
      },
      membersList: {
        marginTop: SPACING.small,
      },
      memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.small,
        paddingVertical: SPACING.xsmall,
        paddingHorizontal: SPACING.small,
        backgroundColor: colors.background,
        borderRadius: SPACING.small,
      },
      memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: SPACING.medium,
        backgroundColor: colors.placeholder,
        justifyContent: 'center',
        alignItems: 'center',
      },
      memberAvatarFallback: {
        backgroundColor: colors.secondary,
      },
      memberAvatarFallbackText: {
        color: colors.buttonText,
        fontSize: FONT_SIZES.medium,
        fontWeight: 'bold',
      },
      memberName: {
        fontSize: FONT_SIZES.medium,
        color: colors.textPrimary,
        fontWeight: '500',
      },
    }),

usersScreen: StyleSheet.create({
  listContent: {
    padding: SPACING.small,
  },

  
    /** CONTAINER & HEADER **/
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.medium,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
    marginBottom: SPACING.small,
  },
  pageTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: "bold",
    color: colors.textPrimary,
  },

  /** ---------------- TOGGLE BAR ---------------- **/
 
  toggleContainer: {
  flexDirection: 'row',
  justifyContent: 'space-around',
  marginBottom: SPACING.medium,
},

toggleButton: {
  paddingVertical: SPACING.small,
  paddingHorizontal: SPACING.large,
  backgroundColor: colors.cardBackground,
  borderRadius: 8,
},

toggleButtonActive: {
  backgroundColor: colors.primary,
},

toggleText: {
  color: colors.text,
},
tabBar: {
  backgroundColor: colors.background,
},
tabLabel: {
  fontWeight: 'bold',
  fontSize: FONT_SIZES.medium,
},
toggleTextActive: {
  backgroundColor: colors.primary,
  height: 3,
},


  /** ---------------- SEARCH BAR ---------------- **/
  searchBar: {
    backgroundColor: colors.cardBackground,
    borderRadius: SPACING.large,
    paddingHorizontal: SPACING.medium,
    paddingVertical: SPACING.small + 2,
    marginHorizontal: SPACING.medium,
    marginBottom: SPACING.medium,
    borderWidth: 1,
    borderColor: colors.borderColor,
    fontSize: FONT_SIZES.medium,
    color: colors.textPrimary,
  },

  /** ---------------- USER CARD GRID (EXPLORE MODE) ---------------- **/
 userCard: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 15,
        marginBottom: SPACING.small,
        borderRadius: 10,
        borderWidth: 1,
        backgroundColor: colors.cardBackground,
        borderColor: colors.borderColor,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 3,
        ...Platform.select({
          web: {
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          },
        }),
        marginHorizontal: SPACING.medium,
      },
      userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: SPACING.medium,
        backgroundColor: colors.placeholder,
        borderWidth: 1,
        borderColor: colors.borderColor,
      },
  username: {
        fontSize: FONT_SIZES.medium,
        color: colors.text,
        fontWeight: "500",
        flexShrink: 1,
        textAlign: 'left',
        marginRight: SPACING.xsmall,
  },

  /** ---------------- LIST ROWS (FREQUENT CONTACTS) ---------------- **/
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.small,
    paddingVertical: SPACING.xsmall,
    paddingHorizontal: SPACING.small,
    backgroundColor: colors.background,
    borderRadius: SPACING.small,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SPACING.medium,
    backgroundColor: colors.placeholder,
    justifyContent: "center",
    alignItems: "center",
  },
  memberAvatarFallback: {
    backgroundColor: colors.secondary,
  },
  memberAvatarFallbackText: {
    color: colors.buttonText,
    fontSize: FONT_SIZES.medium,
    fontWeight: "bold",
  },
  memberName: {
    fontSize: FONT_SIZES.medium,
    color: colors.textPrimary,
    fontWeight: "500",
  },

  /** ---------------- EMPTY / ERROR / LOADING ---------------- **/
  noResultsText: {
    textAlign: "center",
    color: colors.secondaryText,
    marginTop: SPACING.large,
    fontSize: FONT_SIZES.medium,
  },
  activityIndicatorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: colors.secondaryText,
    fontSize: FONT_SIZES.medium,
    marginTop: SPACING.small,
  },

    userCardContent: {
        flex: 1,
        justifyContent: 'center',
  },
  userCardUsername: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  lastMessagePreview: {
        fontSize: FONT_SIZES.small,
        color: colors.secondaryText,
        marginTop: SPACING.xsmall / 2,
        lineHeight: FONT_SIZES.medium,
        textAlign: 'left',
  },

}),


businessChatScreen: StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.large,
    backgroundColor: colors.primary, // Primary color for chat header
    paddingTop: Platform.OS === 'android' ? SPACING.large : SPACING.xxlarge, // Adjust for status bar
  },
  backButton: { // Back button in header
    paddingHorizontal: SPACING.small,
    paddingVertical: SPACING.small,
    marginRight: SPACING.medium,
  },
  headerImage: { // For business image in chat header
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.placeholder, // Placeholder background
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.small,
  },
  headerImageText: { // Text for business initials fallback
    color: colors.buttonText,
    fontSize: FONT_SIZES.medium,
    fontWeight: 'bold',
  },
  headerTitle: { // Business name in header
    color: colors.activeFilterText,
    fontSize: FONT_SIZES.large,
    fontWeight: 'bold',
    flex: 1, // Take available space
  },
  viewProfileButton: { // Button to view business profile/details
    padding: SPACING.xsmall,
    marginLeft: SPACING.small,
  },
  messagesList: { // Content container style for FlatList of messages
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.medium,
  },
  messageBubble: { // Base style for all message bubbles
    padding: SPACING.small,
    borderRadius: SPACING.medium,
    marginBottom: SPACING.small,
    maxWidth: '80%', // Max width for message bubble
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  myMessageBubble: { // Style for current user's messages
    alignSelf: 'flex-end', // Align to right
    backgroundColor: colors.primaryLight, // Lighter primary for own messages
    borderBottomRightRadius: SPACING.xsmall, // For message "tail"
  },
  otherMessageBubble: { // Style for other users/bot messages
    alignSelf: 'flex-start', // Align to left
    backgroundColor: colors.cardBackground, // Card background for others
    borderBottomLeftRadius: SPACING.xsmall, // For message "tail"
  },
  myMessageText: { // Text style for current user's messages
    color: colors.text, // Text on primaryLight background
    fontSize: FONT_SIZES.medium,
  },
  otherMessageText: { // Text style for other users/bot messages
    color: colors.text, // Text on cardBackground
    fontSize: FONT_SIZES.medium,
  },
  timestampText: { // Timestamp style
    fontSize: FONT_SIZES.xsmall,
    color: colors.secondaryText,
    alignSelf: 'flex-end',
    marginTop: SPACING.xsmall / 2,
  },
  messageAvatar: { // Avatar in message bubbles
    width: 30,
    height: 30,
    borderRadius: 15,
    marginHorizontal: SPACING.xsmall, // Space between avatar and bubble
    backgroundColor: colors.placeholder,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageContentWrapper: { // Wrapper for message text, media, and progress/error indicators
    flex: 1, // Allow content to take space
    // Padding and border radius come from messageBubble
  },

  // Media/File Message Styles
  mediaMessageImage: { // For images and video previews
    width: Dimensions.get('window').width * 0.6, // Relative width
    height: Dimensions.get('window').width * 0.45, // Aspect ratio
    borderRadius: SPACING.medium,
    marginBottom: SPACING.xsmall,
    resizeMode: 'cover',
  },
  videoMessageContainer: { // Container for video preview
    position: 'relative',
    borderRadius: SPACING.medium,
    overflow: 'hidden',
  },
  videoPlayText: { // Text overlay on video preview
    color: colors.activeFilterText,
    fontSize: FONT_SIZES.small,
    textAlign: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: SPACING.medium,
  },
  fileMessageContainer: { // Container for file messages
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.small,
    backgroundColor: colors.background, // Background for file bubble
    borderRadius: SPACING.medium,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fileIcon: { // Icon for file messages
    marginRight: SPACING.small,
  },
  fileDetails: { // Container for file name and size
    flex: 1,
  },
  fileNameText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  fileSizeText: {
    fontSize: FONT_SIZES.small,
    color: colors.textSecondary,
  },
  uploadProgressBarContainer: { // Progress bar container for uploads
    width: '100%',
    height: SPACING.xsmall,
    backgroundColor: colors.borderColor,
    borderRadius: SPACING.xsmall / 2,
    overflow: 'hidden',
    marginTop: SPACING.xsmall,
  },
  uploadProgressBar: { // Actual progress bar fill
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: SPACING.xsmall / 2,
  },
  uploadProgressText: { // Text for upload progress percentage
    fontSize: FONT_SIZES.xsmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xsmall / 2,
  },
  messageErrorBubble: { // Style for messages that failed to upload
    backgroundColor: colors.error + '33', // Lighter error color with transparency
    borderColor: colors.error,
    borderWidth: 1,
  },
  uploadErrorText: { // Text for upload error message
    fontSize: FONT_SIZES.small,
    color: colors.error,
    marginTop: SPACING.xsmall,
  },

  // Input Area Styles
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.small,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderColor,
    // Shadows for input container
    ...Platform.select({
      ios: {
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: `0px -2px 4px ${colors.shadowColor}1A`,
      },
    }),
  },
  textInput: { // Main text input field
    flex: 1,
    maxHeight: 120, // Limit height for multiline input
    backgroundColor: colors.background,
    borderRadius: SPACING.large,
    paddingHorizontal: SPACING.medium,
    paddingVertical: SPACING.small,
    marginRight: SPACING.small,
    fontSize: FONT_SIZES.medium,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: { // Send button
    backgroundColor: colors.primary,
    borderRadius: SPACING.large, // Pill shape
    paddingVertical: SPACING.medium - 2, // Adjusted padding
    paddingHorizontal: SPACING.large,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: `0px 2px 3.84px ${colors.shadowColor}40`,
      },
    }),
  },
  sendButtonText: {
    color: colors.activeFilterText,
    fontWeight: 'bold',
    fontSize: FONT_SIZES.medium,
  },

  // Attachment Options Container
  attachmentOptionsContainer: {
    position: 'absolute',
    bottom: '100%', // Position directly above inputContainer
    width: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingVertical: SPACING.small,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: SPACING.small,
    zIndex: 1, // Ensure it's above message list
    minHeight: 60,
  },
  attachmentOptionButton: {
    padding: SPACING.small,
    borderRadius: SPACING.medium,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: SPACING.xsmall,
  },
  attachmentOptionButtonText: {
    fontSize: FONT_SIZES.medium,
    color: colors.textPrimary,
  },
  mediaUploadIndicator: { // For when media is uploading
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.medium,
    backgroundColor: colors.surface,
    borderRadius: SPACING.large,
    flex: 1,
  },
  mediaUploadText: {
    marginLeft: SPACING.small,
    color: colors.textSecondary,
    fontSize: FONT_SIZES.medium,
  },

  // Emoji Picker Styles (if used)
  emojiPickerContainer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
    height: 200, // Fixed height for picker
    padding: SPACING.small,
  },
  emojiListContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiItem: {
    padding: SPACING.xsmall,
    margin: SPACING.xsmall,
    borderRadius: SPACING.small,
    backgroundColor: colors.background,
  },
  emojiText: {
    fontSize: FONT_SIZES.xxlarge,
  },
  emojiButton: { // Button to toggle emoji picker
    padding: SPACING.small,
    borderRadius: SPACING.medium,
    backgroundColor: colors.primaryLight, // Lighter background for emoji button
    marginRight: SPACING.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiButtonText: {
    fontSize: FONT_SIZES.large,
  },
}),

myBusinessScreen: StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.medium,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
    backgroundColor: colors.background,
  },
  sectionHeader: {
  fontSize: FONT_SIZES.large,
  fontWeight: 'bold',
  color: colors.textPrimary,
  marginBottom: SPACING.small,
  marginTop: SPACING.large,
  alignSelf: 'flex-start',
},
  headerTitle: {
    fontSize: FONT_SIZES.heading2,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: SPACING.large,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.medium,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  pageTitle: {
  fontSize: FONT_SIZES.heading2,
  fontWeight: 'bold',
  color: colors.textPrimary,
  paddingVertical: SPACING.medium,
  paddingHorizontal: SPACING.medium,
},
label: {
    color: colors.secondaryText,
    fontSize: FONT_SIZES.small,
    marginTop: 8,
    fontWeight: "600",
  },
  value: {
    color: colors.textPrimary,
    fontSize: FONT_SIZES.medium,
  },
  backButton: {
    padding: 6,
  },
  editButton: {
    padding: 6,
  },
  businessImageWrapper: {
    alignSelf: "center",
    marginVertical: 16,
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  businessImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  businessImageFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  businessImageFallbackText: {
    color: colors.primary,
    fontWeight: "bold",
    fontSize: FONT_SIZES.xxlarge,
  },
  infoContainer: {
    marginHorizontal: 16,
    padding: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
  },

noResultsText: {
  textAlign: 'center',
  marginTop: SPACING.large,
  fontSize: FONT_SIZES.medium,
  color: colors.secondaryText,
  paddingHorizontal: SPACING.medium,
},

catalogDescription: {
  textAlign: 'center',
  fontSize: FONT_SIZES.medium,
  color: colors.secondaryText,
  marginVertical: SPACING.small,
  paddingHorizontal: SPACING.medium,
},

flatListContent: {
  paddingBottom: SPACING.large + 80, // room for FAB or tab bar
  paddingHorizontal: SPACING.medium,
  paddingTop: SPACING.small,
},

flatListStyle: {
  flexGrow: 1,
  backgroundColor: colors.background,
},

  addButtonText: {
    color: colors.buttonText,
    fontSize: FONT_SIZES.medium,
    fontWeight: 'bold',
  },
  businessList: {
    paddingHorizontal: SPACING.medium,
    paddingBottom: SPACING.large,
  },
  businessCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: SPACING.large,
    padding: SPACING.medium,
    marginBottom: SPACING.medium,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  businessImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.medium,
  },

  businessInitialsFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    width: '100%',
    height: '100%',
  },
  businessInitialsText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: FONT_SIZES.large,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: FONT_SIZES.large,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: SPACING.xsmall,
  },
  businessDescription: {
    color: colors.secondaryText,
    fontSize: FONT_SIZES.medium,
    marginBottom: SPACING.xsmall,
  },
  businessMeta: {
    color: colors.secondaryText,
    fontSize: FONT_SIZES.small,
  },
  noBusinessesText: {
    textAlign: 'center',
    color: colors.secondaryText,
    fontSize: FONT_SIZES.medium,
    marginTop: SPACING.large,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.small,
    fontSize: FONT_SIZES.medium,
    color: colors.secondaryText,
  },
}),




ehailingScreen: StyleSheet.create({
  // layout
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: colors.background,
  },

  // text
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: 6,
    marginBottom: 8,
  },
  subtitleSmall: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
  },

  // rows
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 8,
  },

  // inputs
  inputRow: { marginBottom: 8 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.borderColor, // visible border
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: colors.textPrimary, // ensure text visible on light/dark
  },

  // map
  mapWrapper: {
    width: "100%",
    height: height * 0.35,
    borderRadius: 16,
    overflow: "hidden",
    marginVertical: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  map: { flex: 1 },

  // ride cards (bigger)
  cardLarge: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 14,
    marginRight: 14,
    minWidth: width * 0.55,
    shadowColor: colors.shadowColor,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  cardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.surface,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  // buttons
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  buttonDisabled: {
    backgroundColor: colors.primaryLight,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  // small pill for online toggle
  smallPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },

  sheet: {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: colors.cardBackground,
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  borderWidth: 1,
  borderColor: colors.borderColor,
  // elevation + shadow
  shadowColor: colors.shadowColor,
  shadowOpacity: 0.18,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: -4 },
  elevation: 20,
  paddingHorizontal: 16,
  paddingTop: 6,
  zIndex: 50,
},

grabberArea: {
  alignItems: "center",
  paddingVertical: 8,
},

grabber: {
  width: 42,
  height: 4,
  borderRadius: 2,
  opacity: 0.5,
},

}),


beADriverScreen: StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
    color: colors.text,
  },
  label: {
    fontSize: 13,
    color: colors.muted || "#6B7280",
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.card || "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: colors.text,
  },
  uploadRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  uploadBox: {
    flex: 1,
    backgroundColor: colors.card || "#F3F4F6",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadText: {
    color: colors.text,
    fontWeight: "600",
  },
  previewRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  preview: {
    width: 90,
    height: 90,
    borderRadius: 8,
  },
  submitButton: {
    backgroundColor: colors.primary || "#2563EB",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 16,
  },
  submitText: {
    color: colors.buttonText || "#fff",
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  hint: {
    fontSize: 12,
    color: colors.muted || "#6B7280",
    marginTop: 10,
  },
  safeArea: {
  flex: 1,
  backgroundColor: colors.background,
},

}),


chatRoomScreen: StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /** ---------------- HEADER ---------------- **/
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.medium,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
    marginBottom: SPACING.small,
  },
  backButton: {
    padding: SPACING.xsmall,
    marginRight: SPACING.small,
  },
  recipientProfilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: SPACING.medium,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: "bold",
    color: colors.textPrimary,
    flex: 1,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.small,
  },

  /** ---------------- TOGGLE (like BusinessScreen) ---------------- **/
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: SPACING.large,
    marginHorizontal: SPACING.medium,
    marginBottom: SPACING.medium,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.small + 2,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    color: colors.textSecondary,
    fontSize: FONT_SIZES.medium,
    fontWeight: "500",
  },
  toggleTextActive: {
    color: colors.activeFilterText,
    fontWeight: "bold",
  },

  /** ---------------- SEARCH BAR ---------------- **/
  searchBar: {
    backgroundColor: colors.cardBackground,
    borderRadius: SPACING.large,
    paddingHorizontal: SPACING.medium,
    paddingVertical: SPACING.small + 2,
    marginHorizontal: SPACING.medium,
    marginBottom: SPACING.medium,
    borderWidth: 1,
    borderColor: colors.borderColor,
    fontSize: FONT_SIZES.medium,
    color: colors.textPrimary,
  },

  /** ---------------- USER LIST ---------------- **/
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.medium,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: SPACING.medium,
    backgroundColor: colors.secondary,
  },
  username: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  email: {
    fontSize: FONT_SIZES.small,
    color: colors.secondaryText,
  },

  /** ---------------- MESSAGES LIST ---------------- **/
  messagesList: {
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.medium,
  },
  messageBubble: {
    padding: SPACING.medium,
    borderRadius: SPACING.large,
    marginBottom: SPACING.small,
    maxWidth: '80%',
    backgroundColor: colors.cardBackground,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  myMessageBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primaryLight,
    borderBottomRightRadius: SPACING.small,
  },
  otherMessageBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderBottomLeftRadius: SPACING.small,
  },
  myMessageText: {
    color: colors.text,
    fontSize: FONT_SIZES.medium,
  },
  otherMessageText: {
    color: colors.text,
    fontSize: FONT_SIZES.medium,
  },
  timestampText: {
    fontSize: FONT_SIZES.xsmall,
    color: colors.secondaryText,
    alignSelf: 'flex-end',
    marginTop: SPACING.xsmall / 2,
  },

  /** ---------------- INPUT AREA ---------------- **/
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.small,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderColor,
    elevation: 8,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  textInput: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: colors.background,
    borderRadius: SPACING.large,
    paddingHorizontal: SPACING.medium,
    paddingVertical: SPACING.small,
    marginRight: SPACING.small,
    fontSize: FONT_SIZES.medium,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: SPACING.large,
    paddingVertical: SPACING.medium - 2,
    paddingHorizontal: SPACING.large,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sendButtonText: {
    color: colors.activeFilterText,
    fontWeight: 'bold',
    fontSize: FONT_SIZES.medium,
  },

  /** ---------------- ATTACHMENT & EMOJI BUTTONS ---------------- **/
  attachmentButton: {
    padding: SPACING.small,
    borderRadius: SPACING.medium,
    backgroundColor: colors.primaryLight,
    marginRight: SPACING.xsmall,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentButtonText: {
    fontSize: FONT_SIZES.large,
  },
  emojiButton: {
    padding: SPACING.small,
    borderRadius: SPACING.medium,
    backgroundColor: colors.primaryLight,
    marginRight: SPACING.xsmall,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiButtonText: {
    fontSize: FONT_SIZES.large,
  },

  /** ---------------- MEDIA & FILES ---------------- **/
  mediaMessageImage: {
    width: Dimensions.get('window').width * 0.6,
    height: Dimensions.get('window').width * 0.45,
    borderRadius: SPACING.medium,
    marginBottom: SPACING.xsmall,
    resizeMode: 'cover',
  },
  videoMessageContainer: {
    position: 'relative',
    borderRadius: SPACING.medium,
    overflow: 'hidden',
  },
  videoPlayText: {
    color: colors.activeFilterText,
    fontSize: FONT_SIZES.small,
    textAlign: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: SPACING.medium,
  },
  fileMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.small,
    backgroundColor: colors.background,
    borderRadius: SPACING.medium,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  fileIcon: {
    fontSize: FONT_SIZES.xxlarge,
    marginRight: SPACING.small,
  },
  fileDetails: {
    flex: 1,
  },
  fileNameText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: 'bold',
    color: colors.text,
  },
  fileSizeText: {
    fontSize: FONT_SIZES.small,
    color: colors.secondaryText,
  },

  /** ---------------- UPLOAD / ERRORS ---------------- **/
  uploadProgressBarContainer: {
    width: '100%',
    height: SPACING.small,
    backgroundColor: colors.borderColor,
    borderRadius: SPACING.small / 2,
    overflow: 'hidden',
    marginTop: SPACING.xsmall,
  },
  uploadProgressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: SPACING.small / 2,
  },
  uploadProgressText: {
    fontSize: FONT_SIZES.xsmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xsmall / 2,
  },
  messageErrorBubble: {
    backgroundColor: colors.error + '33',
    borderColor: colors.error,
    borderWidth: 1,
  },
  uploadErrorText: {
    fontSize: FONT_SIZES.small,
    color: colors.error,
    marginTop: SPACING.xsmall,
  },

  /** ---------------- ATTACHMENT OPTIONS ---------------- **/
  attachmentOptionsContainer: {
    position: 'absolute',
    bottom: '100%',
    width: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.borderColor,
    paddingVertical: SPACING.small,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: SPACING.small,
    zIndex: 1,
    minHeight: 60,
  },
  attachmentOptionButton: {
    padding: SPACING.small,
    borderRadius: SPACING.medium,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderColor,
    marginHorizontal: SPACING.xsmall,
  },
  attachmentOptionButtonText: {
    fontSize: FONT_SIZES.medium,
    color: colors.text,
  },

  /** ---------------- EMOJI PICKER ---------------- **/
  emojiPickerContainer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.borderColor,
    height: 200,
    padding: SPACING.small,
  },
  emojiListContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiItem: {
    padding: SPACING.xsmall,
    margin: SPACING.xsmall,
    borderRadius: SPACING.small,
    backgroundColor: colors.background,
  },
  emojiText: {
    fontSize: FONT_SIZES.xxlarge,
  },
  mediaUploadIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.medium,
    backgroundColor: colors.surface,
    borderRadius: SPACING.large,
    flex: 1,
  },
  mediaUploadText: {
    marginLeft: SPACING.small,
    color: colors.textSecondary,
    fontSize: FONT_SIZES.medium,
  },
}),

  };
};

export default createStyles;