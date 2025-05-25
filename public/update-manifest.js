// This script dynamically updates the PWA manifest with the user's token
(function() {
  // Function to get URL parameters
  function getUrlParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }

  // Get the token from the URL
  const token = getUrlParam('token');
  
  if (token) {
    // Store the token in localStorage for future use
    localStorage.setItem('clientToken', token);
    
    // Update the manifest file dynamically
    fetch('/client-manifest.json')
      .then(response => response.text())
      .then(text => {
        // Replace the placeholder with the actual token
        const updatedManifest = text.replace('token=PLACEHOLDER', `token=${token}`);
        
        // Create a blob and URL for the updated manifest
        const blob = new Blob([updatedManifest], {type: 'application/json'});
        const manifestURL = URL.createObjectURL(blob);
        
        // Update the manifest link in the document head
        let manifestLink = document.querySelector('link[rel="manifest"]');
        if (manifestLink) {
          manifestLink.href = manifestURL;
        } else {
          manifestLink = document.createElement('link');
          manifestLink.rel = 'manifest';
          manifestLink.href = manifestURL;
          document.head.appendChild(manifestLink);
        }
        
        console.log('PWA manifest updated with user token');
      })
      .catch(err => {
        console.error('Error updating PWA manifest:', err);
      });
  } else {
    // Try to get token from localStorage if not in URL
    const storedToken = localStorage.getItem('clientToken');
    if (storedToken && window.location.pathname === '/client-portal') {
      // Redirect to home page with token
      window.location.href = `/client-portal/home?token=${storedToken}`;
    }
  }
})();
