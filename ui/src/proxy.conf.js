const PROXY_CONFIG = {
    "**": {
      "target": "http://localhost:9000",
      "secure": false,
      "bypass": (req) => {
        if (req.headers.accept && req.headers.accept.indexOf("html") !== -1) {
          console.log("Skipping proxy for browser request.");
          return "/index.html";
        }
      }
    }
  };
  
  module.exports = PROXY_CONFIG;