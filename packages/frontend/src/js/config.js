// Base server address
let serverAddress;

if (window.location.hostname === 'localhost' && window.location.port === '8080') {
  serverAddress = 'http://localhost:9000';
} else if (window.location.hostname === 'frontend') {
  serverAddress = 'http://backend:9000';
} else if (window.location.hostname === 'test-lingua-quiz.nikolay-eremeev.com') {
  serverAddress = 'https://test-api-lingua-quiz.nikolay-eremeev.com';
} else if (window.location.hostname === 'lingua-quiz.nikolay-eremeev.com') {
  serverAddress = 'https://api-lingua-quiz.nikolay-eremeev.com';
} else {
  // Default fallback for e2e tests
  console.log('Using default backend URL for hostname:', window.location.hostname);
  serverAddress = 'http://backend:9000';
}

// API configuration
const config = {
  // Base server address
  serverAddress,

  // API base path - allows for setting a common prefix
  apiBasePath: '/api',

  // Full API base URL
  get apiBaseUrl() {
    return `${this.serverAddress}${this.apiBasePath}`;
  },

  // API endpoints
  endpoints: {
    login: '/auth/login',
    register: '/auth/register',
    deleteAccount: '/auth/delete-account',
    userWordSets: '/word-sets/user',
    wordLists: '/word-sets',
    health: '/health',
  },

  // Get full URL for an endpoint
  getUrl(endpoint) {
    if (!this.endpoints[endpoint]) {
      console.error(`Unknown endpoint: ${endpoint}`);
      return `${this.apiBaseUrl}/`;
    }

    return `${this.apiBaseUrl}${this.endpoints[endpoint]}`;
  },
};

export { config };
