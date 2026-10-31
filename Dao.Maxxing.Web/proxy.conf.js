const apiUrl =
  process.env['services__api__https__0'] ||
  process.env['services__api__http__0'] ||
  'https://localhost:7290';

module.exports = {
  '/api': {
    target: apiUrl,
    secure: false,
    changeOrigin: false,
  },
  '/signin-google': { target: apiUrl, secure: false, changeOrigin: false },
  '/connect': { target: apiUrl, secure: false, changeOrigin: false },
  '/.well-known': { target: apiUrl, secure: false, changeOrigin: false },
  // Development-only API reference and the document it reads.
  '/scalar': { target: apiUrl, secure: false, changeOrigin: false },
  '/openapi': { target: apiUrl, secure: false, changeOrigin: false },
};
