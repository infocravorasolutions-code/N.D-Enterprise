# React Native WebView File Download Setup

This document explains how to handle file downloads (PDF and Excel) from the web app when it's loaded in a React Native WebView.

## Overview

The web application detects when it's running in a React Native WebView and sends file download requests via `window.ReactNativeWebView.postMessage()` instead of using browser download methods.

## React Native Implementation

### 1. WebView Configuration

Make sure your WebView component has JavaScript enabled and can receive messages:

```javascript
import { WebView } from 'react-native-webview';

<WebView
  source={{ uri: 'https://ndenterpries.com' }}
  javaScriptEnabled={true}
  domStorageEnabled={true}
  onMessage={handleWebViewMessage}
  // ... other props
/>
```

### 2. Message Handler

Implement a message handler to receive download requests:

```javascript
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, PermissionsAndroid } from 'react-native';

const handleWebViewMessage = async (event) => {
  try {
    const message = JSON.parse(event.nativeEvent.data);
    
    if (message.type === 'DOWNLOAD_FILE') {
      await handleFileDownload(message);
    }
  } catch (error) {
    console.error('Error parsing WebView message:', error);
  }
};

const handleFileDownload = async (message) => {
  const { fileName, mimeType, data } = message;
  
  try {
    // Request storage permission on Android
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.error('Storage permission denied');
        return;
      }
    }
    
    // Convert base64 to file
    const base64Data = data;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    
    // Write file
    await FileSystem.writeAsStringAsync(fileUri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Share/download the file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
    } else {
      // Fallback: Use a file download library like react-native-fs
      console.log('File saved to:', fileUri);
    }
  } catch (error) {
    console.error('Error downloading file:', error);
  }
};
```

### 3. Alternative: Using react-native-fs

If you prefer using `react-native-fs`:

```bash
npm install react-native-fs
```

```javascript
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

const handleFileDownload = async (message) => {
  const { fileName, mimeType, data } = message;
  
  try {
    // Get download path
    const downloadPath = Platform.select({
      ios: `${RNFS.DocumentDirectoryPath}/${fileName}`,
      android: `${RNFS.DownloadDirectoryPath}/${fileName}`,
    });
    
    // Write base64 data to file
    await RNFS.writeFile(downloadPath, data, 'base64');
    
    console.log('File downloaded to:', downloadPath);
    
    // Optionally show a success message or open the file
  } catch (error) {
    console.error('Error downloading file:', error);
  }
};
```

### 4. Message Format

The web app sends messages in this format:

```json
{
  "type": "DOWNLOAD_FILE",
  "fileName": "MusterRoll_2026_01.xlsx",
  "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "data": "base64EncodedFileData..."
}
```

### 5. Supported File Types

- **PDF**: `application/pdf`
- **Excel**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

## Testing

1. Load the web app in your React Native WebView
2. Navigate to any report page (Muster Roll, Attendance Reports, etc.)
3. Click the PDF or Excel download button
4. Check the console for the message: "File download message sent to React Native"
5. Verify the file is downloaded/shared in your React Native app

## Troubleshooting

### Files not downloading

1. **Check WebView message handler**: Make sure `onMessage` is properly set up
2. **Check console logs**: Look for "File download message sent to React Native" in the web console
3. **Verify permissions**: Ensure storage permissions are granted on Android
4. **Check file size**: Very large files might need chunked transfer

### Files downloading but can't open

1. **Check MIME type**: Ensure the correct MIME type is used when saving
2. **Check file extension**: Make sure the file has the correct extension (.pdf, .xlsx)
3. **Verify file integrity**: Check if the base64 data is correctly decoded

## Notes

- The web app automatically detects if it's running in a WebView
- If not in WebView, it falls back to regular browser download methods
- The detection checks for `window.ReactNativeWebView` or WebView user agent strings

