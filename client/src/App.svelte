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

  const applicationNames = {
    INDESIGN: 'Adobe InDesign',
    PHOTOSHOP: 'Adobe Photoshop'
  };

  let themeManagerComponent;
  let helperComponent;
  let userIsAuthenticated = false;
  let errorMessage = null;
  let infoMessage = null;
  let appDataFolder = null;
  let applicationName = null;
  let downloadProgressInPercent = 0;

  // TABS CONFIG
  let mainTabs = [
    { name: "openFile", label: "Open document", class: "pixxio_media", availableForApplication: [applicationNames.INDESIGN, applicationNames.PHOTOSHOP] },
    { name: "placeFile", label: "Place file", class: "pixxio_plus_circle", availableForApplication: [applicationNames.INDESIGN, applicationNames.PHOTOSHOP] },
    { name: "uploadFile", label: "Upload file", class: "pixxio_upload_cloud_outline", availableForApplication: [applicationNames.INDESIGN, applicationNames.PHOTOSHOP] },
    { name: "relink", label: "Relink file", class: "pixxio_vertical_dots", availableForApplication: [applicationNames.INDESIGN] }
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
      updateAvailableTabs();
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

  const updateAvailableTabs = () => {
    mainTabs = mainTabs.filter(tab => tab.availableForApplication.includes(applicationName));
  };

  const getMedia = (tabName) => {
    let allowTypes = null;

    if (applicationName === applicationNames.INDESIGN) {
      if (tabName === "openFile") {
        allowTypes = ['indd'];
      } else if (tabName === "placeFile") {
        allowTypes = ['indd','jpg','jpeg','png','psd','tif','tiff','ai','eps','pdf'];
      }
    } else if (applicationName === applicationNames.PHOTOSHOP) {
      if (tabName === "openFile") {
        allowTypes = ['psd','tif','tiff','eps','gif','jpeg','jpg','png','png00','png8','png24','png32','png48','png64'];
      } else if (tabName === "placeFile") {
        allowTypes = ['jpeg','jpg','png','png00','png8','png24','png32','png48','png64'];
      }
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

  const getFilesToUpdate = (bulkMainVersionResponse) => {
    return new Promise(async (resolve, reject) => {
      let filesToUpdate = [];
  
      const loopThroughBulkMainVersionReponse = (loopIndex) => {
        const nextStep = () => {
          loopIndex++;
          loopThroughBulkMainVersionReponse(loopIndex);
        };

        const file = bulkMainVersionResponse[loopIndex];
        if (file) {
          helperComponent.getLinkInfo(file.id).then((linkInfo) => {
            filesToUpdate.push({
              ...file,
              linkedFileName: linkInfo.length ? linkInfo[0].linkedFileName : null,
              linkedFilePath: linkInfo.length ? linkInfo[0].linkedFilePath : null
            });
            nextStep();
          });
        } else {
          if (activeRelinkOptionName === 'allUpdatedLinks') { // only use the files where isMainVersion is false or the fileName changed (e.g. file was replaced)
            filesToUpdate = filesToUpdate.filter((fileToUpdate) => {
              if (!fileToUpdate.isMainVersion || fileToUpdate.linkedFileName !== fileToUpdate.mainVersionFileName) {
                return true;
              }
            });
          }
          
          resolve(filesToUpdate);
        }
      };
      loopThroughBulkMainVersionReponse(0);
    });
  };

  const syncLinks = () => {
    helperComponent.runJsx('saveCurrentDocument()').then(() => {
      helperComponent.getLinkedFileIDs(activeRelinkOptionName).then((fileIDs) => {
        console.log('getLinkedFileIDs: ', fileIDs);
        if (fileIDs.length) {
          $pixxio.bulkMainVersionCheck(fileIDs).then((bulkMainVersionResponse) => {
            getFilesToUpdate(bulkMainVersionResponse).then((filesToUpdate) => {
              if (filesToUpdate.length) {
                downloadNewVersionOfFiles(filesToUpdate).then((newVersions) => {
                  console.log('SYNC DOWNLOAD DONE: ', newVersions);

                  updateProgressBar('pending');

                  reLinkNewVersions(newVersions).then(() => {
                    console.log('SYNC RELINK DONE');
                  });
                });
              } else {
                if (activeRelinkOptionName === 'allUpdatedLinks') {
                  showInfo('No updated links available.');
                } else {
                  showInfo('Selected links not found in pixx.io.');
                }
              }
            });
          });
        } else {
          showInfo('No pixx.io links selected. Select a pixx.io link and try again.');
        }
      });
    });
  };

  const downloadNewVersionOfFiles = (filesToUpdate) => {
    return new Promise(async (resolve, reject) => {
      updateProgressBar('pending');

      const newVersions = [];

      const loopThroughFileIDs = (loopIndex) => {
        const fileToUpdate = filesToUpdate[loopIndex];
        if (fileToUpdate) {
          const nextStep = () => {
            loopIndex++;
            loopThroughFileIDs(loopIndex);
          };
          
          showInfo('Download: ' + (loopIndex + 1) + ' / ' + filesToUpdate.length);

          const remoteFilePath = fileToUpdate.mainVersionOriginalFileURL;
          const localFileName = fileToUpdate.mainVersionFileName;
          const localFilePath = appDataFolder + "/" + localFileName;
          helperComponent.download(remoteFilePath, localFilePath).then((downloadInfo) => {
            newVersions.push({
              ...fileToUpdate,
              localFilePath: localFilePath,
              fileSize: downloadInfo.size
            });
            nextStep();
          }, (error) => {
            showError(error);
            nextStep();
          });
        } else {
          updateProgressBar(0);
          showInfo(null);
          resolve(newVersions);
        }
      };
      loopThroughFileIDs(0);
    });
  };

  const reLinkNewVersions = (newVersions) => {
    return new Promise(async (resolve, reject) => {
      updateProgressBar('pending');

      const loopThroughNewVersionsToRelink = (loopIndex) => {
        const newVersion = newVersions[loopIndex];
        if (newVersion) {
          console.log('loopThroughNewVersionsToRelink...: ', newVersion);

          const nextStep = () => {
            loopIndex++;
            loopThroughNewVersionsToRelink(loopIndex);
          };

          const reLink = () => {
            helperComponent.runJsx('reLink("' + newVersion.id + '", "' + newVersion.mainVersion + '", "' + encodeURI(newVersion.localFilePath) + '")').then(() => {
              console.log('=> reLink complete');
              nextStep();
            }).catch((error) => {
              console.error('=> reLink failed; ', newVersion);
              nextStep();
            });
          };
          
          showInfo('Relink: ' + (loopIndex + 1) + ' / ' + newVersions.length);

          if (newVersion.linkedFilePath !== newVersion.localFilePath) {  // local filePath changed
            helperComponent.deleteLocalFile(newVersion.linkedFilePath);
            reLink();
          } else {
            helperComponent.waitForLinkSize(newVersion.mainVersion, newVersion.fileSize).then(() => {
              reLink();
            }).catch(() => {
              console.warn('waitForLinkSize aborted, continue with next file: ', newVersion);
              nextStep();
            });
          }
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
