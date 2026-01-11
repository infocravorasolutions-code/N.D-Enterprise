/**
 * Utility functions for handling file downloads in React Native WebView
 * and regular browsers
 */

import * as XLSX from 'xlsx';

/**
 * Check if running in React Native WebView
 */
export const isReactNativeWebView = () => {
  return typeof window !== 'undefined' && 
         (window.ReactNativeWebView !== undefined || 
          window.webkit?.messageHandlers !== undefined ||
          navigator.userAgent.includes('wv') ||
          navigator.userAgent.includes('WebView'));
};

/**
 * Download file in React Native WebView by sending to native app
 * @param {Blob|Uint8Array} fileData - File data as blob or Uint8Array
 * @param {string} fileName - Name of the file to download
 * @param {string} mimeType - MIME type of the file (e.g., 'application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
 * @returns {Promise<boolean>} - Promise that resolves to true if successful
 */
export const downloadFileInWebView = (fileData, fileName, mimeType) => {
  if (!isReactNativeWebView()) {
    console.warn('Not in React Native WebView, using fallback download method');
    return Promise.resolve(false);
  }

  return new Promise((resolve, reject) => {
    try {
      // Convert blob to base64 if needed
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          let base64data;
          const result = reader.result;
          
          // Handle different result formats
          if (typeof result === 'string') {
            // Remove data:mime;base64, prefix if present
            base64data = result.includes(',') ? result.split(',')[1] : result;
          } else {
            console.error('Unexpected FileReader result type:', typeof result);
            reject(new Error('Unexpected file data format'));
            return;
          }
          
          // Validate base64 data
          if (!base64data || base64data.length === 0) {
            console.error('Empty base64 data');
            reject(new Error('Empty file data'));
            return;
          }
          
          console.log('File data prepared:', {
            fileName,
            mimeType,
            dataLength: base64data.length,
            preview: base64data.substring(0, 50) + '...'
          });
          
          // Send to React Native
          if (window.ReactNativeWebView) {
            const message = {
              type: 'DOWNLOAD_FILE',
              fileName: fileName,
              mimeType: mimeType,
              data: base64data
            };
            
            try {
              window.ReactNativeWebView.postMessage(JSON.stringify(message));
              console.log('File download message sent to React Native:', fileName, 'Size:', base64data.length);
              resolve(true);
            } catch (postError) {
              console.error('Error posting message to React Native:', postError);
              reject(postError);
            }
          } else {
            console.error('ReactNativeWebView not available');
            reject(new Error('ReactNativeWebView not available'));
          }
        } catch (error) {
          console.error('Error processing file data:', error);
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        reject(new Error('Failed to read file data: ' + error.message));
      };
      
      reader.onabort = () => {
        console.error('FileReader aborted');
        reject(new Error('File reading was aborted'));
      };
      
      if (fileData instanceof Blob) {
        reader.readAsDataURL(fileData);
      } else if (fileData instanceof Uint8Array) {
        const blob = new Blob([fileData], { type: mimeType });
        reader.readAsDataURL(blob);
      } else {
        console.error('Unsupported file data type:', typeof fileData, fileData);
        reject(new Error('Unsupported file data type: ' + typeof fileData));
      }
    } catch (error) {
      console.error('Error downloading file in WebView:', error);
      reject(error);
    }
  });
};

/**
 * Download PDF file - works in both browser and WebView
 * @param {jsPDF} doc - jsPDF document instance
 * @param {string} fileName - Name of the PDF file
 */
export const downloadPDF = (doc, fileName) => {
  if (isReactNativeWebView()) {
    // Get PDF as blob
    const pdfBlob = doc.output('blob');
    downloadFileInWebView(pdfBlob, fileName, 'application/pdf')
      .then(() => {
        console.log('PDF download initiated in WebView');
      })
      .catch((error) => {
        console.error('Error downloading PDF in WebView:', error);
        // Fallback to regular download
        doc.save(fileName);
      });
    return true;
  } else {
    // Regular browser download
    doc.save(fileName);
    return true;
  }
};

/**
 * Download Excel file - works in both browser and WebView
 * @param {XLSX.WorkBook} workbook - XLSX workbook instance
 * @param {string} fileName - Name of the Excel file
 */
export const downloadExcel = (workbook, fileName) => {
  if (isReactNativeWebView()) {
    try {
      // Convert workbook to binary string, then to blob
      const wbout = XLSX.write(workbook, { 
        bookType: 'xlsx', 
        type: 'binary' 
      });
      
      // Convert binary string to Uint8Array
      const buf = new ArrayBuffer(wbout.length);
      const view = new Uint8Array(buf);
      for (let i = 0; i < wbout.length; i++) {
        view[i] = wbout.charCodeAt(i) & 0xFF;
      }
      
      // Create blob and download
      const blob = new Blob([buf], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      downloadFileInWebView(blob, fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .then(() => {
          console.log('Excel download initiated in WebView');
        })
        .catch((error) => {
          console.error('Error downloading Excel in WebView:', error);
          // Fallback to regular download
          XLSX.writeFile(workbook, fileName);
        });
      return true;
    } catch (error) {
      console.error('Error converting Excel to blob:', error);
      // Fallback to regular download
      XLSX.writeFile(workbook, fileName);
      return true;
    }
  } else {
    // Regular browser download
    XLSX.writeFile(workbook, fileName);
    return true;
  }
};

