<script>
  import { onMount } from "svelte";
  import { csInterface, pixxio } from "./stores/general.js";

  // pixx.io JSDK
  import "@pixx.io/jsdk/build/pixxio.jsdk.css";
  import PIXXIO from "@pixx.io/jsdk";

  // COMPONENTS
  import Helper from "./Helper.svelte";
  import ThemeManager from "./ThemeManager.svelte";
  import Tabs from "./components/Tabs.svelte";
  import ProgressBar from "./components/ProgressBar.svelte";
  import RadioGroup from "./components/RadioGroup.svelte";

  let themeManagerComponent;
  let helperComponent;
  let userIsAuthenticated = false;
  let errorMessage = null;
  let infoMessage = null;
  let appDataFolder = null;
  let applicationName = null;
  let downloadProgressInPercent = 0;

  // TABS CONFIG
  const mainTabs = [
    { name: "openFile", label: "Open document", class: "pixxio_media" },
    { name: "placeFile", label: "Place file", class: "pixxio_plus_circle" },
    { name: "uploadFile", label: "Upload file", class: "pixxio_upload_cloud_outline" },
    { name: "relink", label: "Relink file", class: "pixxio_vertical_dots" }
  ];
  let activeMainTabName = mainTabs[0].name;

  // UPLOAD OPTIONS CONFIG
  const allUploadOptions = [
    { name: 'uploadNewFile', label: "New file" },
    { name: 'versionizeFile', label: "New version" },
    { name: 'replaceFile', label: "Replace current" }
  ];
  let uploadOptions = allUploadOptions;
  let activeUploadOptionName = uploadOptions[0].name;

  // RELINK OPTIONS CONFIG
  const relinkOptions = [
    { name: 'allUpdatedLinks', label: "All updated links" },
    { name: 'selectedLinks', label: "Selected links" },
    { name: 'allLinks', label: "All links" }
  ];
  let activeRelinkOptionName = relinkOptions[0].name;

  // VARIABLE CHANGES
  $: if (activeMainTabName) {
    onChangeTab(activeMainTabName);
  }

  onMount(async () => {
    initEventListeners();
    helperComponent.loadJSX('json2.js');
    initApplicationName().then(() => {
      themeManagerComponent.init();
      initFileSystemStructure();
      initPixxioJSDK();
      
      getMedia(activeMainTabName);
      updateUploadOptions();
    });
  });

  const initPixxioJSDK = () => {
    pixxio.set(new PIXXIO({
      appKey: "70aK0pH090EyxHgS1sSg3Po8M",
      element: document.getElementById("pixxioWrapper"),
      modal: false
    }));

    $pixxio.on('authState', function(authState) {
      userIsAuthenticated = authState.login;
    });
  };

  const onChangeTab = (activeTabName) => {
    switch(activeTabName) {
      case 'openFile':
      case 'placeFile':
        if (pixxio && userIsAuthenticated) {
          getMedia(activeTabName);
        }
        break;
      case 'uploadFile':
        updateUploadOptions();
        break;
    }
  };

  const getMedia = (tabName) => {
    let allowTypes = null;
    if (tabName === "openFile") {
      allowTypes = ["indd"];
    } else if (tabName === "placeFile") {
      allowTypes = ["jpg", "png"];
    }

    $pixxio.getMedia({
      max: 1,
      allowFormats: ["original"],
      allowTypes: allowTypes,
      additionalResponseFields: ["id", "fileName"],
    }).then((value) => {
      if (activeMainTabName === "openFile") {
        openDocument(value[0]);
      } else if (activeMainTabName === "placeFile") {
        placeImage(value[0]);
      }

      getMedia(activeMainTabName);
    }).catch((error) => {
      if (error) {
        console.log('getMedia error: ', error);
      }
    });
  };

  const openDocument = (selectedFile) => {
    const remoteFilePath = selectedFile.url;
    const localFilePath = appDataFolder + "/" + selectedFile.file.fileName;
    helperComponent.download(remoteFilePath, localFilePath).then((downloadInfo) => {
      helperComponent.runJsx('openDocument("' + encodeURI(localFilePath) + '", "' + selectedFile.file.id + '")');
    }).catch((error) => {
      showError('openDocument download error: ' + error);
    });
  };

  const placeImage = (selectedFile) => {
    helperComponent.runJsx("hasOpenDocument()").then((hasOpenDocument) => {
      if (hasOpenDocument) {
        const remoteFilePath = selectedFile.url;
        const localFilePath = appDataFolder + "/" + selectedFile.file.fileName;
        helperComponent.download(remoteFilePath, localFilePath).then((downloadInfo) => {
          helperComponent.runJsx('placeFile("' + encodeURI(localFilePath) + '", "' + selectedFile.file.id + '")');
        }).catch((error) => {
          showError('placeImage download error: ' + error);
        });
      } else {
        showError('You have to open a document first');
      }
    });
  };

  const updateProgressBar = (progressInPercent) => {
    downloadProgressInPercent = progressInPercent;
  };

  const updateUploadOptions = () => {
    Promise.all([
      helperComponent.runJsx('isPixxioDocument()'),
      helperComponent.runJsx('hasOpenDocument()')
    ]).then((values) => {
      const fileID = values[0];
      const hasOpenDocument = values[1];

      if (hasOpenDocument) {
        if (fileID) {
          uploadOptions = allUploadOptions;
        } else {
          uploadOptions = allUploadOptions.filter((option) => option.name === 'uploadNewFile');

          if (activeUploadOptionName !== uploadOptions[0].name) {
            activeUploadOptionName = uploadOptions[0].name;
          }
        }
      } else {
        uploadOptions = [];
      }
    });
  };

  const uploadFile = () => {
    helperComponent.uploadFile(activeUploadOptionName).then(() => {
      showInfo('Upload complete');
    });
  };

  const showInfo = (message) => {
    infoMessage = message;
  };

  const showError = (message) => {
    errorMessage = message;
  };

  const initApplicationName = () => {
    return new Promise((resolve, reject) => {
      helperComponent.runJsx('getApplicationName()').then((name) => {
        applicationName = name;
        resolve(applicationName);
      });
    });
  };

  const initFileSystemStructure = () => {
    helperComponent.runJsx('getFileDirectory()').then((fileDirectory) => {
      appDataFolder = fileDirectory;
    });
  };

  const initEventListeners = () => {
    /*
    *  Adobe Events
    */
    $csInterface.addEventListener('documentAfterActivate', function () {
      updateUploadOptions();
      //getLinkedFiles();
    });
    
    $csInterface.addEventListener('documentAfterDeactivate', function () {
      updateUploadOptions();
    });

    /*
    *  Custom Events
    */
    $csInterface.addEventListener('io.pixx.csxs.events.consoleLog', function (evt) {
      console.log('JSX console: ', evt.data);
    });
    
    $csInterface.addEventListener('io.pixx.csxs.events.updateDownloadProgress', function (evt) {
      updateProgressBar(evt.data === 'empty' ? 0 : evt.data);
    });
    
    $csInterface.addEventListener('io.pixx.csxs.events.showError', function (evt) {
      showError(evt.data === 'empty' ? null : evt.data);
    });
    
    $csInterface.addEventListener('io.pixx.csxs.events.showInfo', function (evt) {
      showInfo(evt.data === 'empty' ? null : evt.data);
    });
  };

  const syncLinks = () => {
    helperComponent.runJsx('saveCurrentDocument()').then(() => {
      helperComponent.getLinkedFileIDs(activeRelinkOptionName).then((fileIDs) => {
        if (fileIDs.length) {
          $pixxio.bulkMainVersionCheck(fileIDs).then((bulkMainVersionResponse) => {
            if (activeRelinkOptionName === 'allUpdatedLinks') {
              bulkMainVersionResponse = bulkMainVersionResponse.filter((file) => !file.isMainVersion);
            }

            const fileIDsToRelink = bulkMainVersionResponse.map((file) => file.id);

            if (fileIDsToRelink.length) {
              downloadNewVersionOfFilesByIdSync(fileIDsToRelink).then((newVersions) => {
                console.log('SYNC DOWNLOAD DONE: ', newVersions);

                reLinkNewVersionsSync(newVersions).then(() => {
                  console.log('SYNC RELINK DONE');
                });
              });
            } else {
              if (activeRelinkOptionName === 'allUpdatedLinks') {
                showInfo('No updated links available.');
              }
            }
          });
        } else {
          showInfo('No pixx.io links selected. Select a pixx.io link and try again.');
        }
      });
    });
  };

  const downloadNewVersionOfFilesByIdSync = (fileIDs) => {
    return new Promise(async (resolve, reject) => {
      updateProgressBar('pending');

      const newVersions = [];

      const loopThroughFileIDs = (loopIndex) => {
        const fileID = fileIDs[loopIndex];
        if (fileID) {
          const nextStep = () => {
            loopIndex++;
            loopThroughFileIDs(loopIndex);
          };

          const download = (file) => {
            const remoteFilePath = file.originalFileURL;
            const localFileName = file.fileName;
            const localFilePath = appDataFolder + "/" + localFileName;
            helperComponent.download(remoteFilePath, localFilePath).then((downloadInfo) => {
              newVersions.push({
                oldID: fileID,
                newID: file.id,
                localFilePath: localFilePath,
                fileSize: downloadInfo.size
              });
              nextStep();
            }, (error) => {
              showError(error);
              nextStep();
            });
          };
          
          showInfo('Download: ' + (loopIndex + 1) + ' / ' + fileIDs.length);

          helperComponent.getFileByID(fileID).then((oldFileResponse) => {
            const newestFileID = oldFileResponse.file.versions.mainVersion;

            if (fileID !== newestFileID) {
              helperComponent.getFileByID(newestFileID).then((newFileResponse) => {
                download(newFileResponse.file);
              }).catch(() => nextStep());
            } else {
              download(oldFileResponse.file);
            }
          }).catch(() => nextStep());
        } else {
          updateProgressBar(0);
          showInfo(null);
          resolve(newVersions);
        }
      };
      loopThroughFileIDs(0);
    });
  };

  const reLinkNewVersionsSync = (newVersions) => {
    return new Promise(async (resolve, reject) => {
      updateProgressBar('pending');

      const loopThroughNewVersionsToRelink = (loopIndex) => {
        const newVersion = newVersions[loopIndex];
        if (newVersion) {
          console.log('=> loopThroughNewVersionsToRelink: ', newVersion.newID, newVersion.fileSize, newVersion.localFilePath);

          const nextStep = () => {
            loopIndex++;
            loopThroughNewVersionsToRelink(loopIndex);
          };
          
          showInfo('Relink: ' + (loopIndex + 1) + ' / ' + newVersions.length);

          helperComponent.waitForLinkSize(newVersion.newID, newVersion.fileSize).then(() => {
            console.log('link ready');
            if (newVersion.oldID !== newVersion.newID) {
              helperComponent.runJsx('reLink("' + newVersion.oldID + '", "' + newVersion.newID + '", "' + encodeURI(newVersion.localFilePath) + '", "' + newVersion.size + '")').then(() => {
                console.log('reLink complete');
                nextStep();
              }).catch((error) => {
                console.error('reLink failed; ', newVersion);
                nextStep();
              });
            } else {
              helperComponent.runJsx('updateLink("' + newVersion.newID + '")').then(() => {
                console.log('updateLink complete');
                nextStep();
              }).catch((error) => {
                console.error('updateLink failed: ', newVersion);
                nextStep();
              });
            }
          }).catch(() => {
            console.warn('waitForLinkSize aborted, continue with next file: ', newVersion);
            nextStep();
          });
        } else {
          updateProgressBar(0);
          showInfo(null);
          resolve();
        }
      }
      loopThroughNewVersionsToRelink(0);
    });
  };
</script>

<main>
  <ThemeManager bind:this={themeManagerComponent} />
  <Helper bind:this={helperComponent} />
  {#if userIsAuthenticated}
    <Tabs bind:activeTabName={activeMainTabName} tabs={mainTabs} />
    <ProgressBar progress={downloadProgressInPercent} />
  {/if}

  <div class="content">
    <div
      id="pixxioWrapper"
      style="display: {activeMainTabName === 'openFile' || activeMainTabName === 'placeFile' ? 'flex' : 'none'}"
    ></div>
    {#if activeMainTabName === 'uploadFile'}
      <RadioGroup bind:activeOptionName={activeUploadOptionName} options={uploadOptions}></RadioGroup>
      <div class="flexSpacer"></div>
      <button
        class="button button--action"
        disabled='{!uploadOptions.length}'
        on:click="{uploadFile}"
      >UPLOAD</button>
    {:else if activeMainTabName === 'relink'}
      <RadioGroup bind:activeOptionName={activeRelinkOptionName} options={relinkOptions}></RadioGroup>
      <div class="flexSpacer"></div>
      <button
        class="button button--action"
        on:click="{syncLinks}"
      >SYNC</button>
    {/if}
  </div>

  <!-- GLOBAL OVERLAY -->
  {#if downloadProgressInPercent > 0}
    <div class="backdrop"></div>
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
        <span>{errorMessage}</span>
        <button on:click="{e => errorMessage = null}">X</button>
      </div>
    </div>
  {/if}
</main>

<style lang="scss">
  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: auto;

    .button--action {
      align-self: flex-end;
      margin: 20px;
    }
  }

  .backdrop {
    position: absolute;
    inset: 0;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .notice {
    position: absolute;
    top: 65px;
    right: 10px;
    left: 10px;
    padding: 15px;
    border-radius: 6px;
    font-size: 14px;
    background-color: var(--highlight-color);
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

      .material-icons {
        font-size: 18px;
      }
    }
  }

  .infoOverlay {
    background-color: var(--highlight-color);
  }

  .errorOverlay {
    background-color: red;
  }
</style>
