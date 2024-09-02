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
      document.getElementById('devices').innerHTML = "";
      devices.forEach(async (device) => {
        const id = device.device;
        const name = device.deviceName;
        const sku = device.sku;
        const key = await readLocalStorage('key');

        fetch(`https://blink-functions.azurewebsites.net/api/govee/${id}/state`, {
          method: "GET",
          headers: {
            "x-functions-key": key,
            "Content-Type": "application/json"
          }
        })
          .then(response => response.json())
          .then(device => {

            try {
              const rgbToHex = rgbString => {
                const [r, g, b] = rgbString.match(/\d+/g).map(Number);
                return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
              };
              document.getElementById(`${device.MACAddress}-color`).setAttribute('value', rgbToHex(device.Color));

              document.getElementById(`${device.MACAddress}-color`).addEventListener('change', function (event) {
                function hexToRgb(hex) {
                  // Remove the hash symbol if it's present
                  hex = hex.replace(/^#/, '');
  
                  // If the hex code is shorthand (e.g., #03F), expand it to full form (e.g., #0033FF)
                  if (hex.length === 3) {
                    hex = hex.split('').map(char => char + char).join('');
                  }
  
                  // Convert the hex code to an RGB object
                  const red = parseInt(hex.slice(0, 2), 16);
                  const green = parseInt(hex.slice(2, 4), 16);
                  const blue = parseInt(hex.slice(4, 6), 16);
  
                  return { red, green, blue };
                }
  
                const color = hexToRgb(event.target.value);
  
                fetch(`https://blink-functions.azurewebsites.net/api/govee/${device.MACAddress}/color/${color.red}/${color.green}/${color.blue}`, {
                  method: "GET",
                  headers: {
                    "x-functions-key": key,
                    "Content-Type": "application/json"
                  }
                }).catch(error => console.error(`Error changing "${device.MACAddress}"  color:`, error));
              });
            } catch {

            }

            document.getElementById(`${device.MACAddress}-state`).checked = device.On;
            document.getElementById(`${device.MACAddress}-state`).addEventListener('change', async () => {
              var state = document.getElementById(`${device.MACAddress}-state`).checked;
              fetch(`https://blink-functions.azurewebsites.net/api/govee/${device.MACAddress}/power/${state ? 'on' : 'off'}`, {
                method: "GET",
                headers: {
                  "x-functions-key": await readLocalStorage('key'),
                  "Content-Type": "application/json"
                }
              }).catch(error => console.error(`Error changing "${device.MACAddress}"  state:`, error));
            });
          })
          .catch(error => console.error("Error loading states:", error));

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
                <div class="d-flex flex-row align-items-center justify-content-between gap-2">
                  <input id="${id}-color" type="color" class="form-control form-control-color" />
                  <div class="form-check form-switch">
                    <input id="${id}-state" class="form-check-input" type="checkbox" role="switch" />
                  </div>
                </div>
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
                <div class="form-check form-switch">
                  <input id="${id}-state" class="form-check-input" type="checkbox" role="switch">
                </div>
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
