'use strict';

/**
 * This file/module contains all configuration for nw things
 */

// NPM modules
var _ = require('lodash');
var nw = require('nw');

// Current app version
var version = require('./../package.json').version;

// Platforms to expect for the compression
var platforms = ['win64', 'osx64', 'linux64'];

/*
 * Helper function to generate our compress object
 */
var nwCompress = function(platforms) {

  // Start up an empty
  var compress = {};

  // Iterate through our platforms and add to the compress array
  _.forEach(platforms, function(platform) {

    // Our zippy ext is different depending on the platform
    var zippyExt = (_.includes(platform, 'win')) ? '.zip' : '.tar.gz';

    // Build our copress object
    compress[platform] = {
      options: {
        archive: 'built/kalabox-' + platform + '-' + version + zippyExt
      },
      files: [
        {
          expand: true,
          cwd: 'dist/kalabox/' + platform + '/',
          src: ['**'],
          dest: 'kalabox/'
        }
      ]
    };

  });

  // And finally return that which is compressed
  return compress;

};

// Return the codes
module.exports = {
  compress: nwCompress(platforms),
  nwjs: {
    options: {
      version: '0.12.3',
      platforms: [
        'win64',
        'osx64',
        'linux64'
      ],
      buildDir: 'build',
    },
    src: '<%= compileDir %>'
  },
  shell: {
    nw: {
      command: nw.findpath() + ' <%= buildDir %>',
      options: {
        execOptions: {
          maxBuffer: Infinity
        }
      }
    },
    build: {
      command: [
        'cd ./<%= compileDir %>',
        '&&',
        'npm install --production --ignore-scripts'
      ].join(' ')
    }
  },
};
