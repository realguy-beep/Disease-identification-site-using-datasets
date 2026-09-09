/**
 * Loom OS Client SDK
 * Provides a typed RPC bridge for sandboxed iframe applications.
 * Communicates strictly over window.parent.postMessage.
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LoomSDK = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var pendingRequests = new Map();
  var sessionToken = '';
  var appId = '';
  var initialized = false;

  // Extract query parameters from URL: ?token=xyz&appId=loom.notes
  var urlParams = new URLSearchParams(window.location.search);
  sessionToken = urlParams.get('token') || '';
  appId = urlParams.get('appId') || '';

  // Setup message listener for RPC responses
  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || data.jsonrpc !== '2.0' || !data.id) return;

    var resolver = pendingRequests.get(data.id);
    if (resolver) {
      pendingRequests.delete(data.id);
      if (data.success) {
        resolver.resolve(data.result);
      } else {
        var err = new Error(data.error ? data.error.message : 'Unknown Loom RPC error');
        err.code = data.error ? data.error.code : 500;
        resolver.reject(err);
      }
    }
  });

  function sendRequest(method, params) {
    return new Promise(function (resolve, reject) {
      var id = 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      
      pendingRequests.set(id, { resolve: resolve, reject: reject });

      var envelope = {
        jsonrpc: '2.0',
        id: id,
        token: sessionToken,
        appId: appId,
        method: method,
        params: params || {}
      };

      try {
        window.parent.postMessage(envelope, '*');
      } catch (e) {
        pendingRequests.delete(id);
        reject(e);
      }

      // Timeout after 10s
      setTimeout(function () {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
          reject(new Error('Loom RPC request timed out for method: ' + method));
        }
      }, 10000);
    });
  }

  var sdk = {
    init: function (options) {
      if (options) {
        if (options.token) sessionToken = options.token;
        if (options.appId) appId = options.appId;
      }
      return sendRequest('loom:handshake', {}).then(function (info) {
        initialized = true;
        return info;
      });
    },

    getAppInfo: function () {
      return sendRequest('loom:getAppInfo', {});
    },

    storage: {
      get: function (key) {
        return sendRequest('storage:get', { key: key });
      },
      set: function (key, value) {
        return sendRequest('storage:set', { key: key, value: value });
      },
      delete: function (key) {
        return sendRequest('storage:delete', { key: key });
      }
    },

    clipboard: {
      read: function () {
        return sendRequest('clipboard:read', {});
      },
      write: function (text) {
        return sendRequest('clipboard:write', { text: text });
      }
    },

    state: {
      query: function (params) {
        return sendRequest('state:query', params || {});
      },
      create: function (item) {
        return sendRequest('state:create', item);
      },
      update: function (id, updates) {
        return sendRequest('state:update', Object.assign({ id: id }, updates));
      },
      delete: function (id) {
        return sendRequest('state:delete', { id: id });
      }
    },

    notify: function (title, message) {
      return sendRequest('notification:show', { title: title, message: message });
    }
  };

  return sdk;
}));

