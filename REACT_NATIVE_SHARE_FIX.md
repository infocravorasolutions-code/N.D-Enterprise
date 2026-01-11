# React Native Share Modal Fix

## Problem
The Share modal is not working when downloading PDF/Excel files from WebView.

## Common Issues

1. **File path format**: iOS and Android require different URI formats
2. **Permissions**: Android 10+ requires scoped storage
3. **Share library configuration**: Incorrect options can cause silent failures
4. **File not written**: File must exist before sharing

## Solution

### 1. Check Dependencies

Make sure you have the correct packages installed:

```bash
npm install react-native-share react-native-fs
# For iOS
cd ios && pod install
```

### 2. Update handleFileDownload Function

Replace your `handleFileDownload` function with the code from `REACT_NATIVE_FILE_DOWNLOAD_FIX.js`.

### 3. Android Permissions

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" 
    android:maxSdkVersion="28" />
```

### 4. iOS Info.plist

Add to `ios/YourApp/Info.plist`:

```xml
<key>UIFileSharingEnabled</key>
<true/>
<key>LSSupportsOpeningDocumentsInPlace</key>
<true/>
```

### 5. Alternative: Use File System Directly

If Share.open() still doesn't work, you can save files directly to Downloads:

```javascript
// For Android - save to Downloads folder
if (Platform.OS === 'android') {
  const downloadPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
  await RNFS.writeFile(downloadPath, fileData, 'base64');
  Alert.alert('Success', `File saved to Downloads: ${fileName}`);
}
```

### 6. Debug Steps

Add console logs to see what's happening:

```javascript
console.log('File data length:', fileData.length);
console.log('File path:', downloadPath);
console.log('File exists:', await RNFS.exists(downloadPath));
console.log('Share options:', shareOptions);
```

### 7. Test Share Options

Try different Share configurations:

```javascript
// Option 1: Simple
await Share.open({
  url: `file://${downloadPath}`,
  type: mimeType,
});

// Option 2: With filename
await Share.open({
  url: `file://${downloadPath}`,
  type: mimeType,
  filename: fileName,
  title: 'Save File',
});

// Option 3: Platform specific
const shareOptions = Platform.select({
  ios: {
    url: `file://${downloadPath}`,
    type: mimeType,
  },
  android: {
    url: `file://${downloadPath}`,
    type: mimeType,
    mimeType: mimeType,
  },
});
await Share.open(shareOptions);
```

## Troubleshooting

1. **Share modal doesn't open**: Check file path format and permissions
2. **File not found**: Verify file is written before sharing
3. **Silent failure**: Add try-catch and console logs
4. **Android 10+ issues**: Use app directory instead of Downloads
5. **iOS issues**: Ensure file:// URI format is correct

## Recommended Implementation

Use the `handleFileDownloadSimple` function from `REACT_NATIVE_FILE_DOWNLOAD_FIX.js` - it's more reliable and handles errors better.

