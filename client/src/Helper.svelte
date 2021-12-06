<script>
  const fs = cep_node.require('fs');
  const http = cep_node.require('http');
  const https = cep_node.require('https');

  import { csInterface, pixxio } from "./stores/general.js";

  const getProtocol = (remoteUrl) => {
    return !remoteUrl.charAt(4).localeCompare("s") ? https : http;
  };

  const isJson = (str) => {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  };

  const sendError = (error) => {
    runJsx('sendEvent("io.pixx.csxs.events.showError", "' + error + '")');
  };

  export const loadJSX = (scriptName) => {
    var extensionRoot = $csInterface.getSystemPath(SystemPath.EXTENSION) + "/client/public/libs";
    runJsx('$.evalFile("' + extensionRoot + "/" + scriptName + '")').then().catch();
  };

  export const runJsx = async (command) => {
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

  export const download = async (remoteUrl, localFilePath) => {
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

      request.on("error", (error) => {
        logError(error);
        fs.unlink(localFilePath, () => reject(error));
      });

      fileStream.on("error", (error) => {
        logError(error);
        fs.unlink(localFilePath, () => reject(error));
      });

      request.end();
    });
  };

  export const uploadFile = async (activeUploadOptionName) => {
    return new Promise((resolve, reject) => {
      updateDownloadProgress('pending');
      runJsx('saveCurrentDocument()').then(() => {
        runJsx('getCurrentDocumentInformation()').then((currentDocumentInformation) => {
          const filePath = currentDocumentInformation.directory + '/' + currentDocumentInformation.name;

          const fileBlob = new Blob([fs.readFileSync(filePath)]);
          const fileToUpload = new File([fileBlob], currentDocumentInformation.name);

          let options = {
            file: fileToUpload,
            asynchronousConversion: false
          };

          const documentLabels = currentDocumentInformation.labels;
          if (activeUploadOptionName === 'versionizeFile') {
            options.versionID = parseInt(documentLabels.fileID);
            options.metadataToCopy = ['all'];
          } else if (activeUploadOptionName === 'replaceFile') {
            options.replaceID = parseInt(documentLabels.fileID);
            options.metadataToCopy = ['all'];
          }

          $pixxio.pushMedia(options).then((pushMediaResponse) => {
            if (pushMediaResponse.success && !pushMediaResponse.isDuplicate) {
              runJsx("insertLabelToElement('pixxio.fileID', '" + pushMediaResponse.id + "')");
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

  export const updateDownloadProgress = (progress) => {
    runJsx('sendEvent("io.pixx.csxs.events.updateDownloadProgress", "' + progress + '")');
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

  export const getLinkedFileIDs = (relinkOptionName) => {
    return new Promise(async (resolve, reject) => {
      if (relinkOptionName === 'selectedLinks') {
        runJsx('getSelectedLinksFileIDs()').then((selectedFileIDs) => {
          resolve(selectedFileIDs);
        }).catch((error) => reject(error));
      }
      else if (relinkOptionName === 'allLinks' || relinkOptionName === 'allUpdatedLinks') {
        runJsx('getAllLinksFileIDs()').then((fileIDs) => {
          resolve(fileIDs);
        }).catch((error) => reject(error));
      }
    });
  };

  export const getFileByID = (fileID) => {
    return new Promise(async (resolve, reject) => {
      $pixxio.getFileById(fileID).then((file) => {
        resolve(file);
      }).catch((error) => {
        sendError(error);
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
</script>
