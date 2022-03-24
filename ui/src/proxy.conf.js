const PROXY_CONFIG = {
    "/app": {
      "target": "http://localhost:9000",
      "secure": false,
    }
  };
  
  module.exports = PROXY_CONFIG;