// PWA Token Handler - Ensures token is available in all PWA contexts
(function() {
  // Function to get URL parameters
  function getUrlParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }

  // Get the token from the URL
  const token = getUrlParam('token');
  
  // Check if we're running in a PWA context
  const isPWA = window.matchMedia('(display-mode: standalone)').matches;
  
  if (token) {
    // Store the token in localStorage for future use
    localStorage.setItem('clientToken', token);
    console.log('Token stored in localStorage');
  } else if (isPWA) {
    // We're in PWA mode without a token in the URL
    const storedToken = localStorage.getItem('clientToken');
    
    if (storedToken) {
      // We're in a PWA and have a stored token, but it's not in the URL
      // Add it to the current URL without reloading
      const currentPath = window.location.pathname;
      
      // Only modify URL for client portal pages
      if (currentPath.startsWith('/client-portal/')) {
        // Update the URL with the token without causing a page reload
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('token', storedToken);
        window.history.replaceState({}, '', newUrl.toString());
        console.log('Added token to URL in PWA context');
        
        // Dispatch a custom event that our components can listen for
        window.dispatchEvent(new CustomEvent('tokenAddedToUrl', { 
          detail: { token: storedToken }
        }));
      }
    }
  } else {
    // We're in browser mode without a token
    const storedToken = localStorage.getItem('clientToken');
    
    // Only redirect on the base client portal path to avoid redirect loops
    if (storedToken && window.location.pathname === '/client-portal') {
      // Redirect to home page with token
      window.location.href = `/client-portal/home?token=${storedToken}`;
    }
  }
})();
