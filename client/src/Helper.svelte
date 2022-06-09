<script>
  const fs = cep_node.require('fs');
  const http = cep_node.require('http');
  const https = cep_node.require('https');

  import { onMount } from 'svelte';
  import { csInterface, pixxio, appDataFolder, applicationName, applicationNames } from "./stores/general.js";
  import DonutChart from "./components/DonutChart.svelte";

  let progressInOverlayPercent = 0;
  let infoMessage = null;
  let errorMessage = null;

  let confirmData = {
    message: null,
    confirmButtonText: null,
    cancelButtonText: null,
    callback: null
  };

  onMount(async () => {
    initEventListeners();
  });

  const initEventListeners = () => {
    $csInterface.addEventListener('io.pixx.csxs.events.showError', function (evt) {
      showError(evt.data === 'empty' ? null : evt.data);
    });
    
    $csInterface.addEventListener('io.pixx.csxs.events.showInfo', function (evt) {
      showInfo(evt.data === 'empty' ? null : evt.data);
    });
  };

  const getProtocol = (remoteUrl) => {
    return !remoteUrl.charAt(4).localeCompare("s") ? https : http;
  };

  export const isJson = (str) => {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  };

  export const showInfo = (message) => {
    infoMessage = message;
  };

  export const showError = (message) => {
    errorMessage = message;
  };

  export const confirm = (confirmMessage, confirmButtonText = 'yes', cancelButtonText = 'cancel') => {
    return new Promise((resolve, reject) => {
      confirmData.message = confirmMessage;
      confirmData.confirmButtonText = confirmButtonText;
      confirmData.cancelButtonText = cancelButtonText;
      confirmData.callback = (isConfirmed) => {
        confirmData.message = null;
        if (isConfirmed) {
          resolve();
        } else {
          reject();
        }
      };
    });
  };

  export const updateDownloadProgress = (progress) => {
    runJsx('sendEvent("io.pixx.csxs.events.updateDownloadProgress", "' + progress + '")');
  };

  export const loadJSX = (scriptName) => {
    var extensionRoot = $csInterface.getSystemPath(SystemPath.EXTENSION) + "/client/public/libs";
    runJsx('$.evalFile("' + extensionRoot + "/" + scriptName + '")').then().catch();
  };

  export const runJsx = (command) => {
    return new Promise((resolve, reject) => {
      $csInterface.evalScript(command, (evalScriptReturnValueString) => {
        const evalScriptReturnValue = isJson(evalScriptReturnValueString) ? JSON.parse(evalScriptReturnValueString) : evalScriptReturnValueString;
        if (evalScriptReturnValue?.success === false) {
          console.error('evalScript ERROR: ', evalScriptReturnValue, '(command: ' + command + ')');
          reject(evalScriptReturnValue);
        } else {
          resolve(evalScriptReturnValue);
        }
      });
    });
  };

  export const download = (remoteUrl, localFilePath) => {
    const protocol = getProtocol(remoteUrl);
    let totalSizeToDownload = 0;
    let currentDownloadedSize = 0;

    const logError = (error) => {
      console.log('download error: ', error);
    };

    return new Promise((resolve, reject) => {
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }

      const fileStream = fs.createWriteStream(localFilePath);
      let fileInfo = null;

      const request = protocol.get(remoteUrl, (response) => {
        if (response.statusCode !== 200) {
          const error = new Error(`Failed to get '${remoteUrl}' (${response.statusCode})`);
          logError(error);
          reject(error);
          return;
        }

        totalSizeToDownload = parseInt(response.headers["content-length"], 10);

        response.on("data", function (chunk) {
          currentDownloadedSize += chunk.length;
          const progressInPercent = Math.round((currentDownloadedSize / totalSizeToDownload) * 100);

          updateDownloadProgress(progressInPercent);
        });

        fileInfo = {
          mime: response.headers["content-type"],
          size: parseInt(response.headers["content-length"], 10)
        };

        response.pipe(fileStream);
      });

      fileStream.on("finish", () => {
        fileStream.close();
        currentDownloadedSize = 0;
        totalSizeToDownload = 0;
        updateDownloadProgress(0);
        console.log('=> download complete: ', localFilePath);

        resolve(fileInfo);
      });

      const undo = (error) => {
        logError(error);
        request.abort();
        fileStream.close();

        try {
          fs.unlink(localFilePath, () => reject(error));
        } catch {
          reject(error)
        }
      };

      fileStream.on("error", (error) => { undo(); });
      request.on("error", (error) => { undo(); });
      request.on("timeout", (error) => { undo(); });
      request.on("uncaughtException", (error) => { undo(); });

      request.end();
    });
  };

  export const uploadFile = (activeUploadOptionName) => {
    return new Promise((resolve, reject) => {
      updateDownloadProgress('pending');
      runJsx('saveCurrentDocument()').then(() => {
        runJsx('getCurrentDocumentInformation()').then((currentDocumentInformation) => {
          const filePath = currentDocumentInformation.directory + '/' + currentDocumentInformation.name;

          const fileBlob = new Blob([fs.readFileSync(filePath)]);
          const fileToUpload = new File([fileBlob], currentDocumentInformation.name);
          const documentLabels = currentDocumentInformation.labels;
          const fileID = parseInt(documentLabels.fileID, 10);

          let options = {
            file: fileToUpload
          };

          if (activeUploadOptionName === 'versionizeFile') {
            options.versionID = fileID;
            options.metadataToCopy = ['all'];
          } else if (activeUploadOptionName === 'variantFile') {
            options.variantFileID = fileID;
          } else if (activeUploadOptionName === 'replaceFile') {
            options.replaceID = fileID;
            options.metadataToCopy = ['all'];
          }

          $pixxio.pushMedia(options).then((pushMediaResponse) => {
            if (pushMediaResponse.success && !pushMediaResponse.isDuplicate) {
              if ($applicationName === $applicationNames.INDESIGN) {
                runJsx("insertLabelToElement('pixxio.fileID', '" + pushMediaResponse.id + "')");
              } else if ($applicationName === $applicationNames.PHOTOSHOP) {
                runJsx("saveFileIDToHiddenFile('" + filePath + "', '" + pushMediaResponse.id + "')");
              }
              
              runJsx("saveCurrentDocument()");
              runJsx("sendEvent('documentAfterActivate')");
              resolve();
            }
            updateDownloadProgress(0);
          }).catch((pushMediaError) => {
            updateDownloadProgress(0);
          });
        }).catch(() => {
          updateDownloadProgress(0);
        });
      }).catch((error) => {
        updateDownloadProgress(0);
      });
    });
  };

  export const fileExists = (localFilePath) => {
    return fs.existsSync(localFilePath);
  };

  export const getFileSize = (localFilePath) => {
    if (fileExists(localFilePath)) {
      var stats = fs.statSync(localFilePath);
      return stats.size;
    } else {
      return 0;
    }
  };

  export const getAllLinkedFileIDs = () => {
    return new Promise(async (resolve, reject) => {
      runJsx('getAllLinksFileIDs()').then((fileIDs) => {
        resolve(fileIDs);
      }).catch((error) => reject(error));
    });
  };

  export const getFileByID = (fileID) => {
    return new Promise(async (resolve, reject) => {
      $pixxio.getFileById(fileID).then((file) => {
        resolve(file);
      }).catch((error) => {
        showError(error);
        reject();
      });
    });
  };

  export const getLinkInfo = (fileID) => {
    return new Promise(async (resolve, reject) => {
      runJsx('getLinkInfo("' + fileID + '")').then((linkInfo) => {
        resolve(linkInfo);
      });
    });
  }

  export const deleteLocalFile = (localFilePath) => {
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return;
  }

  export const waitForLinkSize = (fileID, fileSizeToReach) => {
    return new Promise(async (resolve, reject) => {
      updateDownloadProgress('pending');

      const maxSafetyCount = 30;
      let safetyCount = 0;
      const waitForLinkSizeInterval = () => {
        getLinkInfo(fileID).then((linkInfo) => {
          const linkSizes = linkInfo.map(info => info.linkSize);
          let uniqueLinkSizes = [...new Set(linkSizes)];

          if (uniqueLinkSizes.length === 0 || (uniqueLinkSizes.length === 1 && uniqueLinkSizes[0] === fileSizeToReach)) {
            setTimeout(() => {  // safety timeout
              resolve();
            }, 1000);
          } else if(safetyCount === maxSafetyCount) {
            console.error('waitForLinkSize safetyCount reached: ', fileID, fileSizeToReach);
            reject();
          } else {
            setTimeout(() => {  // loop timeout
              safetyCount++;
              waitForLinkSizeInterval();
            }, 1000);
          }
        });
      };
      waitForLinkSizeInterval();
    });
  };

  export const getLinks = () => {
    return new Promise(async (resolve, reject) => {
      runJsx('getLinks()').then((links) => {
        resolve(links);
      });
    });
  };

  export const fileSizeRenderer = (bytes, precision = 0) => {
    const units = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

    if (isNaN(parseFloat(String(bytes))) || !isFinite(bytes)) {
      return '?';
    }

    let unitIndex = 0;

    while (bytes >= 1024) {
      bytes /= 1024;
      unitIndex++;
    }

    bytes = parseFloat(bytes.toString());

    const currentUnit = units[unitIndex];

    return `${bytes.toFixed(+precision)} ${currentUnit}`;
  };

  export const updateProgressInOverlay = (progressInPercent) => {
    progressInOverlayPercent = progressInPercent;
  };
  
  export const emptyCacheDirectory = () => {
    return new Promise(async (resolve, reject) => {
      runJsx('getOpenDocuments()').then((openDocuments) => {
        const openDocumentsPaths = openDocuments.map(doc => doc.filePath + '/' + doc.name);

        fs.readdir($appDataFolder, (err, fileNames) => {
          for (const fileName of fileNames) {
            if (!openDocumentsPaths.includes($appDataFolder + '/' + fileName)) {
              fs.unlink($appDataFolder + '/' + fileName, err => {});
            }
          }
          resolve();
        });
      });
    });
  };

  export const escapeRegExp = (stringToGoIntoTheRegex) => {
    return new Promise(async (resolve, reject) => {
      runJsx('escapeRegExp("' + stringToGoIntoTheRegex + '")').then((escapedString) => {
        resolve(escapedString);
      });
    });
  }
</script>

<!-- CONFIRM DIALOG -->
{#if confirmData.message}
  <div class="backdrop">
    <div class="confirmWrapper">
      <span class="message">{@html confirmData.message}</span>
      <div class="footer">
        <button class="button" on:click="{e => confirmData.callback(false)}">{confirmData.cancelButtonText}</button>
        <button class="button confirmButton" on:click="{e => confirmData.callback(true)}">{confirmData.confirmButtonText}</button>
      </div>
    </div>
  </div>
{/if}

<!-- PROGRESS OVERLAY -->
{#if progressInOverlayPercent}
  <div class="backdrop">
    <DonutChart filledPercent={progressInOverlayPercent}/>
  </div>
{/if}

<!-- INFO OVERLAY -->
{#if infoMessage}
  <div class="backdrop">
    <div class="notice infoOverlay">
      <span class="message">{infoMessage}</span>
      <button on:click="{e => infoMessage = null}">
        <span class="material-icons">close</span>
      </button>
    </div>
  </div>
{/if}

<!-- ERROR OVERLAY -->
{#if errorMessage}
  <div class="backdrop">
    <div class="notice errorOverlay">
      <span class="message">{errorMessage}</span>
      <button on:click="{e => errorMessage = null}">X</button>
    </div>
  </div>
{/if}


<style lang="scss">
  .backdrop {
    position: absolute;
    inset: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: rgba(0, 0, 0, .2);
  }

  .notice {
    position: absolute;
    top: 65px;
    right: 10px;
    left: 10px;
    padding: 15px;
    border-radius: 6px;
    font-size: 14px;
    background-color: var(--primary-color);
    color: var(--background-color);
    box-shadow: rgb(0 0 0 / 20%) 0px 1px 3px;
    transition: 0.3s;
    word-break: break-word;
    display: flex;
    flex-direction: row;
    align-items: center;

    .message {
      flex: 1;
    }

    button {
      background-color: transparent;
      border: none;
      color: inherit;
      cursor: pointer;
      margin-left: 8px;

      .material-icons {
        font-size: 18px;
      }
    }
  }

  .infoOverlay {
    background-color: var(--primary-color);
  }

  .errorOverlay {
    background-color: red;
    color: #fff;
  }

  .confirmWrapper {
    position: absolute;
    top: 65px;
    right: 10px;
    left: 10px;
    padding: 15px;
    border-radius: 6px;
    font-size: 14px;
    background-color: var(--primary-color);
    color: var(--background-color);
    box-shadow: rgb(0 0 0 / 20%) 0px 1px 3px;
    transition: 0.3s;
    word-break: break-word;
    display: flex;
    flex-direction: column;

    .footer {
      margin-top: 20px;
      display: flex;
      justify-content: space-between;

      .confirmButton {
        font-weight: bold;
      }
    }

    button {
      color: var(--background-color);
    }
  }
</style>
