// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */

module.exports = (() => {
    const config = getDefaultConfig(__dirname);

    // firebase compatibility for expo sdk 53
    config.resolver.assetExts.push('cjs');
    config.resolver.unstable_enablePackageExports = false;

    return config;

})();