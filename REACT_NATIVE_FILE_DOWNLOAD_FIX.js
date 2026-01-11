// Fixed React Native File Download Handler
// Replace your handleFileDownload function with this improved version

const handleFileDownload = async (message: any) => {
  try {
    let fileName: string;
    let mimeType: string;
    let fileData: string;
    let encoding: 'base64' | 'utf8' = 'base64';

    // Support new format (DOWNLOAD_FILE)
    if (message.type === 'DOWNLOAD_FILE') {
      fileName = message.fileName;
      mimeType = message.mimeType;
      fileData = message.data;
      
      // If data is a data URI, extract base64
      if (fileData.includes(',')) {
        fileData = fileData.split(',')[1];
      }
    } 
    // Support old format (download) for backward compatibility
    else if (message.type === 'download') {
      fileName = message.fileName;
      const fileType = message.fileType;
      
      if (fileType === 'pdf') {
        mimeType = 'application/pdf';
        // fileData is a data URI, extract base64
        fileData = message.data.includes(',') 
          ? message.data.split(',')[1] 
          : message.data;
      } else if (fileType === 'xlsx') {
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        fileData = message.data;
      } else {
        mimeType = message.mimeType || 'application/octet-stream';
        fileData = message.data;
      }
    } else {
      throw new Error('Invalid message format');
    }

    if (!fileName || !fileData) {
      throw new Error('Missing fileName or data');
    }

    console.log('Downloading file:', fileName, 'Type:', mimeType, 'Data length:', fileData.length);

    // Request storage permission on Android (for Android 10 and below)
    if (Platform.OS === 'android' && Number(Platform.Version) <= 29) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permission Denied', 'Cannot save file without storage permission');
        return;
      }
    }

    // Get download path based on platform
    const downloadPath = Platform.select({
      ios: `${RNFS.DocumentDirectoryPath}/${fileName}`,
      android: Number(Platform.Version) >= 29 
        ? `${RNFS.DocumentDirectoryPath}/${fileName}` // Use app directory for Android 10+
        : `${RNFS.DownloadDirectoryPath}/${fileName}`, // Use Downloads for older Android
    }) || `${RNFS.DocumentDirectoryPath}/${fileName}`;

    console.log('Writing file to:', downloadPath);

    // Write file
    await RNFS.writeFile(downloadPath, fileData, encoding);
    
    console.log('File written successfully to:', downloadPath);

    // Verify file exists
    const fileExists = await RNFS.exists(downloadPath);
    if (!fileExists) {
      throw new Error('File was not created successfully');
    }

    // Get file stats
    const fileStats = await RNFS.stat(downloadPath);
    console.log('File stats:', fileStats);

    // Share/download the file using Share dialog
    try {
      // For iOS, use file:// URL
      // For Android, use content:// URI or file://
      const fileUri = Platform.OS === 'ios' 
        ? `file://${downloadPath}`
        : Platform.Version >= 29
          ? `file://${downloadPath}` // Android 10+ uses scoped storage
          : `file://${downloadPath}`;

      console.log('Sharing file with URI:', fileUri);

      const shareOptions = {
        url: fileUri,
        type: mimeType,
        filename: fileName,
        failOnCancel: false,
        showAppsToView: true,
        title: 'Save File',
        message: `Save ${fileName}`,
        // iOS specific
        ...(Platform.OS === 'ios' && {
          subject: fileName,
          excludedActivityTypes: [],
        }),
        // Android specific
        ...(Platform.OS === 'android' && {
          mimeType: mimeType,
        }),
      };

      console.log('Share options:', shareOptions);

      const shareResponse = await Share.open(shareOptions);
      
      console.log('Share response:', shareResponse);
      
      if (shareResponse.action === Share.sharedAction) {
        Alert.alert('Download Complete', `File saved: ${fileName}`);
      } else if (shareResponse.action === Share.dismissedAction) {
        // User dismissed, but file is still saved
        Alert.alert('File Saved', `File saved to: ${downloadPath}`);
      }
    } catch (shareError: any) {
      // If sharing fails, check if it's just user cancellation
      if (shareError.message === 'User did not share' || shareError.message?.includes('User did not share')) {
        // User cancelled, but file is still saved
        Alert.alert('File Saved', `File saved to: ${downloadPath}`);
      } else {
        console.error('Share error:', shareError);
        
        // Try alternative method - use file:// URI directly
        try {
          // For Android, try using Intent
          if (Platform.OS === 'android') {
            const { default: Share } = await import('react-native-share');
            const fileUri = `file://${downloadPath}`;
            
            await Share.open({
              url: fileUri,
              type: mimeType,
              filename: fileName,
              title: 'Save File',
            });
          } else {
            // For iOS, show success message
            Alert.alert('File Saved', `File saved to: ${downloadPath}\n\nYou can find it in the Files app.`);
          }
        } catch (altError) {
          console.error('Alternative share method failed:', altError);
          Alert.alert('File Saved', `File saved to: ${downloadPath}\n\nPlease use a file manager to access it.`);
        }
      }
    }
  } catch (error: any) {
    console.error('Error downloading file:', error);
    Alert.alert('Download Failed', error.message || 'Failed to download file. Please try again.');
  }
};

// ============================================
// ALTERNATIVE: If Share.open() doesn't work, use this simpler version
// ============================================

const handleFileDownloadSimple = async (message: any) => {
  try {
    let fileName: string;
    let mimeType: string;
    let fileData: string;

    if (message.type === 'DOWNLOAD_FILE') {
      fileName = message.fileName;
      mimeType = message.mimeType;
      fileData = message.data.includes(',') ? message.data.split(',')[1] : message.data;
    } else {
      throw new Error('Invalid message format');
    }

    if (!fileName || !fileData) {
      throw new Error('Missing fileName or data');
    }

    // Request storage permission on Android
    if (Platform.OS === 'android' && Number(Platform.Version) <= 29) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permission Denied', 'Cannot save file without storage permission');
        return;
      }
    }

    // Get download path
    const downloadPath = Platform.select({
      ios: `${RNFS.DocumentDirectoryPath}/${fileName}`,
      android: `${RNFS.DocumentDirectoryPath}/${fileName}`, // Always use app directory for consistency
    }) || `${RNFS.DocumentDirectoryPath}/${fileName}`;

    // Write file
    await RNFS.writeFile(downloadPath, fileData, 'base64');
    
    // Verify file exists
    const fileExists = await RNFS.exists(downloadPath);
    if (!fileExists) {
      throw new Error('File was not created successfully');
    }

    // Try to share
    try {
      const fileUri = Platform.OS === 'ios' 
        ? `file://${downloadPath}`
        : `content://${downloadPath}`;

      await Share.open({
        url: fileUri,
        type: mimeType,
        filename: fileName,
        title: 'Save File',
        failOnCancel: false,
      });

      Alert.alert('Success', `File saved: ${fileName}`);
    } catch (shareError: any) {
      // If share fails, at least the file is saved
      if (shareError.message?.includes('User did not share')) {
        // User cancelled - file is still saved
        Alert.alert('File Saved', `File saved: ${fileName}`);
      } else {
        // Share failed but file is saved
        console.error('Share error:', shareError);
        Alert.alert(
          'File Saved', 
          `File saved to app directory.\n\n` +
          `To access: ${downloadPath}\n\n` +
          `You can use a file manager app to find it.`
        );
      }
    }
  } catch (error: any) {
    console.error('Error downloading file:', error);
    Alert.alert('Download Failed', error.message || 'Failed to download file.');
  }
};

// ============================================
// RECOMMENDED: Use react-native-share with proper file URI handling
// ============================================

// Make sure you have these imports:
// import Share from 'react-native-share';
// import RNFS from 'react-native-fs';
// import { Platform, Alert, PermissionsAndroid } from 'react-native';

// Also ensure react-native-share is properly installed:
// npm install react-native-share
// For iOS: cd ios && pod install
// For Android: Make sure permissions are set in AndroidManifest.xml

