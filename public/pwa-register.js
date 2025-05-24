// This is a custom service worker registration script
// It will be loaded by the client-portal layout

// Register the service worker
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    const swUrl = '/sw.js';
    
    navigator.serviceWorker.register(swUrl)
      .then(function(registration) {
        console.log('PWA: Service Worker registration successful with scope: ', registration.scope);
        
        // Check for updates every hour
        setInterval(() => {
          registration.update();
          console.log('PWA: Checking for Service Worker updates');
        }, 3600000);
      })
      .catch(function(err) {
        console.error('PWA: Service Worker registration failed: ', err);
      });
  });

  // Handle beforeinstallprompt event for debugging
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('PWA: beforeinstallprompt event fired');
    // Optionally store the event for later use
    window.deferredPrompt = e;
    // Dispatch a custom event that our InstallPrompt component can listen for
    window.dispatchEvent(new CustomEvent('pwaInstallable'));
  });

  // Log when app is installed
  window.addEventListener('appinstalled', (e) => {
    console.log('PWA: Application was installed');
    // Clear the deferredPrompt
    window.deferredPrompt = null;
  });
}
