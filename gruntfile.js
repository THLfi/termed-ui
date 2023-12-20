module.exports = function(grunt) {
  'use strict';

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-wiredep');
  grunt.loadNpmTasks('grunt-middleware-proxy');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('default', ['jshint', 'wiredep', 'copy']);
  grunt.registerTask('dev', ['setupProxies:server', 'connect', 'watch']);

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),
    bower: grunt.file.readJSON('.bowerrc'),

    connect: {
      server: {
        options: {
          base: 'src',
          middleware: function (connect, options, defaultMiddleware) {
            defaultMiddleware.unshift(require('grunt-middleware-proxy/lib/Utils').getProxyMiddleware());
            return defaultMiddleware;
          }
        },
        proxies: [
          {
            context: '/api',
            host: 'localhost',
            port: '8080'
          }
        ]
      }
    },

    wiredep: {
      task: {
        src: ['src/index.html']
      }
    },

    copy: {
      dist: {
        files: [{
          expand: true,
          cwd: 'src',
          src: '**',
          dest: 'dist'
        }]
      }
    },

    jshint: {
      files: ['gruntfile.js', 'src/app/**/*.js'],
      options: {
        esversion: 6
      }
    },

    watch: {
      scripts: {
        files: 'src/**/*.js',
        tasks: ['jshint']
      }
    }

  });
};
