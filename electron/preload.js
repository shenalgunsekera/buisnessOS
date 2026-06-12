const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('businessOS', {
  apiBaseUrl: 'http://localhost:4000',
  platform: process.platform,
});
