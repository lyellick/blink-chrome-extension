'use strict';

import './sidepanel.css';


document.addEventListener("DOMContentLoaded", async function () {
  /**
   * Functions
   */
  async function readLocalStorage(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([key], function (result) {
        if (result[key] === undefined) {
          reject(`Key "${key}" not found in local storage`);
        } else {
          resolve(result[key]);
        }
      });
    });
  };

  async function writeLocalStorage(key, value) {
    return new Promise((resolve, reject) => {
      const data = {};
      data[key] = value;

      chrome.storage.local.set(data, function () {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  };

  async function clearLocalStorage(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove([key], function () {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  };

  /**
   * Listeners
   */
  document.getElementById('api-key').value = await readLocalStorage('key').then((key) => {
    return key;
  }).catch(async (error) => {
    await writeLocalStorage('key', '');
    return '';
  });

  document.getElementById('api-key').addEventListener('change', async function () {
    var value = document.getElementById('api-key').value;
    await writeLocalStorage('key', value);
  });


  /**
   * Load Govee Devices
   */
  fetch('https://blink-functions.azurewebsites.net/api/govee/devices', {
    method: "GET",
    headers: {
      "x-functions-key": await readLocalStorage('key'),
      "Content-Type": "application/json"
    }
  })
    .then(response => response.json())
    .then(devices => {
      console.log(devices);
      document.getElementById('devices').innerHTML = "";
      devices.forEach((device) => {
        // Get device state.
        
        const id = device.device;
        const name = device.deviceName;
        const sku = device.sku;
        switch (device.type) {
          case 'devices.types.light':
            document.getElementById('devices').innerHTML +=
            `
            <div id="${id}">
              <div class="d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center justify-content-between gap-2">
                  <i class="bi bi-lightbulb fs-5"></i>  
                  <div>${name}</div>
                </div>
                <span class="badge text-bg-dark">${sku}</span>
              </div>
            </div>
            `
            break;
          case 'devices.types.socket':
            document.getElementById('devices').innerHTML +=
            `
            <div id="${id}">
              <div class="d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center justify-content-between gap-2">
                  <i class="bi bi-plug fs-5"></i>  
                  <div>${name}</div>
                </div>
                <span class="badge text-bg-dark">${sku}</span>
              </div>
            </div>
            `
            break;
          default:
            break;
        }
      });
    })
    .catch(error => console.error("Error loading lights:", error));
});
