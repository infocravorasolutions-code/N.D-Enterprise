// Enhanced React Native WebView App with aggressive mobile CSS fixes
// Replace your injectedGeoJS constant with this

const injectedGeoJS = `
  (function() {
    // Detect if we're in React Native WebView
    const isWebView = typeof window !== 'undefined' && 
      (window.ReactNativeWebView !== undefined || 
       window.webkit?.messageHandlers !== undefined ||
       navigator.userAgent.includes('wv') ||
       navigator.userAgent.includes('WebView'));
    
    // Force mobile viewport detection
    const forceMobileView = () => {
      // Get actual screen width
      const screenWidth = window.innerWidth || screen.width || 375;
      const viewportWidth = Math.max(screenWidth, window.outerWidth || screenWidth);
      const isMobile = viewportWidth <= 768;
      
      console.log('WebView Detection:', { isWebView, screenWidth, viewportWidth, isMobile });
      
      // Force viewport meta tag
      let viewport = document.querySelector('meta[name="viewport"]');
      if (!viewport) {
        viewport = document.createElement('meta');
        viewport.name = 'viewport';
        document.getElementsByTagName('head')[0].appendChild(viewport);
      }
      viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
      
      // Inject backend URL
      window.BACKEND_URL = '${BACKEND_URL}';
      
      // Override fetch for API calls
      const originalFetch = window.fetch;
      window.fetch = function(url, options = {}) {
        if (typeof url === 'string') {
          if (url.startsWith('/api') || url.startsWith('api/')) {
            url = '${BACKEND_URL}' + (url.startsWith('/') ? url : '/' + url);
          } else if (url.includes('localhost:5678') || url.includes('127.0.0.1:5678')) {
            url = url.replace(/https?:\\/\\/(localhost|127\\.0\\.0\\.1):5678/g, '${BACKEND_URL}');
          }
        }
        options.headers = {
          ...options.headers,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        };
        return originalFetch(url, options);
      };
      
      // Geolocation handling
      window.getNativeLocation = function() {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'getLocation' }));
        }
      };
      
      navigator.geolocation.getCurrentPosition = function(success, error) {
        if (window.injectedLocation) {
          success({
            coords: {
              latitude: window.injectedLocation.latitude,
              longitude: window.injectedLocation.longitude,
              accuracy: window.injectedLocation.accuracy,
            },
            timestamp: window.injectedLocation.timestamp
          });
        } else {
          window.getNativeLocation();
          if (error) error({ code: 2, message: 'Location not available' });
        }
      };
      
      // CRITICAL: Force mobile styles if screen width <= 768px OR in WebView
      // WebView often doesn't properly detect screen size, so force mobile view
      if (isMobile || isWebView || viewportWidth <= 768) {
        const criticalMobileCSS = \`
          /* Force mobile viewport */
          html, body {
            width: 100% !important;
            max-width: 100vw !important;
            overflow-x: hidden !important;
            position: relative !important;
            -webkit-text-size-adjust: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          #root {
            width: 100% !important;
            max-width: 100vw !important;
            overflow-x: hidden !important;
            position: relative !important;
          }
          
          /* Force mobile card views to show */
          .muster-mobile-cards,
          .muster-mobile-cards.mobile-only,
          .attendance-mobile-cards,
          .attendance-mobile-cards.mobile-only,
          .mobile-cards-view,
          .mobile-cards-view.mobile-only {
            display: flex !important;
            flex-direction: column !important;
            visibility: visible !important;
            opacity: 1 !important;
            width: 100% !important;
            max-width: 100% !important;
            gap: 16px !important;
          }
          
          /* Hide desktop tables */
          .table-container.desktop-only,
          .desktop-only,
          table.data-table {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
          }
          
          /* Force page container mobile styles */
          .page-container {
            padding: 12px !important;
            padding-top: max(12px, env(safe-area-inset-top, 12px)) !important;
            padding-bottom: max(12px, env(safe-area-inset-bottom, 12px)) !important;
            padding-left: max(12px, env(safe-area-inset-left, 12px)) !important;
            padding-right: max(12px, env(safe-area-inset-right, 12px)) !important;
            width: 100% !important;
            max-width: 100vw !important;
            box-sizing: border-box !important;
            margin: 0 !important;
          }
          
          /* Force header visibility */
          .header-actions,
          .header-action-btn {
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          
          /* Force logo sizing */
          .header-logo-image {
            height: 32px !important;
            max-width: 60px !important;
            max-height: 32px !important;
            width: auto !important;
            object-fit: contain !important;
          }
          
          /* Prevent any overflow */
          * {
            max-width: 100vw !important;
            box-sizing: border-box !important;
          }
          
          /* Force stat cards to fit */
          .stat-card {
            width: 100% !important;
            max-width: 100% !important;
            padding: 14px !important;
            box-sizing: border-box !important;
            margin: 0 0 12px 0 !important;
          }
          
          /* Force stats grid single column */
          .stats-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          
          /* Force login input padding */
          .form-input {
            padding-left: 60px !important;
          }
          
          .input-icon {
            left: 16px !important;
            pointer-events: none !important;
          }
          
          /* Force app container */
          .app-container,
          .main-content {
            width: 100% !important;
            max-width: 100vw !important;
            overflow-x: hidden !important;
            box-sizing: border-box !important;
          }
          
          /* Force content sections */
          .content-section {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
        \`;
        
        // Remove existing critical style if present
        let criticalStyle = document.getElementById('webview-critical-mobile-fixes');
        if (criticalStyle) {
          criticalStyle.remove();
        }
        
        // Add critical mobile CSS
        criticalStyle = document.createElement('style');
        criticalStyle.id = 'webview-critical-mobile-fixes';
        criticalStyle.textContent = criticalMobileCSS;
        document.head.appendChild(criticalStyle);
        
        // Also add class to body for CSS targeting
        document.body.classList.add('webview-mobile');
        document.documentElement.classList.add('webview-mobile');
      }
    };
    
    // Apply immediately
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', forceMobileView);
    } else {
      forceMobileView();
    }
    
    // Re-apply on resize and after page load
    window.addEventListener('resize', forceMobileView);
    window.addEventListener('load', forceMobileView);
    window.addEventListener('orientationchange', forceMobileView);
    
    // Use MutationObserver to re-apply when DOM changes
    const observer = new MutationObserver(() => {
      setTimeout(forceMobileView, 100);
    });
    
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    }
    
    // Re-apply styles periodically to catch any late-loading content
    setInterval(forceMobileView, 2000);
  })();
  true;
`;

