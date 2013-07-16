module.exports = function(grunt) {
  
  if (!process.env.SHOPIFY_API_KEY) {
    throw new Error('Missing SHOPIFY_API_KEY environment variable');
  }
  
  if (!process.env.SHOPIFY_API_PASSWORD) {
    throw new Error('Missing SHOPIFY_API_PASSWORD environment variable');
  }

  if (!process.env.SHOPIFY_API_URL) {
    throw new Error('Missing SHOPIFY_API_URL environment variable');
  }
  
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    shopify: {
      options: {
        api_key: process.env.SHOPIFY_API_KEY,
        password: process.env.SHOPIFY_API_PASSWORD,
        url: process.env.SHOPIFY_API_URL,
        base: 'theme/'
      }
    },
    watch: {
      shopify: {
        files: ['theme/assets/**','theme/config/**','theme/layout/**','theme/snippets/**','theme/templates/**']
      }
    }
  });
  
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-shopify');
  
  grunt.registerTask('default', ['watch:shopify']);
};