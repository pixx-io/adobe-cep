<script>
  // pixx.io JSDK
  import "@pixx.io/jsdk/build/pixxio.jsdk.css";
  import PIXXIO from "@pixx.io/jsdk";

  // TIPPY
  import 'tippy.js/dist/tippy.css'; // optional for styling
  
  // STORE
  import { csInterface, pixxio, appDataFolder, applicationName, applicationNames, helper, errorcodes } from "./stores/general.js";

  // COMPONENTS
  import Helper from "./Helper.svelte";
  import ThemeManager from "./ThemeManager.svelte";
  import Tabs from "./components/Tabs.svelte";
  import ProgressBar from "./components/ProgressBar.svelte";
  import RadioGroup from "./components/RadioGroup.svelte";
  import ReLink from "./components/ReLink.svelte";

  const versionNumber = 'v2.0.3';

  let themeManagerComponent;
  let helperComponent;
  let relinkComponent;
  let userIsAuthenticated = false;
  let downloadProgressInPercent = 0;

  // TABS CONFIG
  let mainTabs = [
    { name: "openFile", label: "Open", class: "openDocument", availableForApplication: [$applicationNames.INDESIGN, $applicationNames.PHOTOSHOP] },
    { name: "placeFile", label: "Place", class: "placeFile", availableForApplication: [$applicationNames.INDESIGN, $applicationNames.PHOTOSHOP] },
    { name: "uploadFile", label: "Upload", class: "uploadDocument", availableForApplication: [$applicationNames.INDESIGN, $applicationNames.PHOTOSHOP] },
    { name: "relink", label: "Links", class: "links", availableForApplication: [$applicationNames.INDESIGN] }
  ];
  let activeMainTabName = mainTabs[0].name;

  // UPLOAD OPTIONS CONFIG
  const allUploadOptions = [
    { name: 'uploadNewFile', label: "New file" },
    { name: 'versionizeFile', label: "New version" },
    { name: 'variantFile', label: "New variant" },
    { name: 'replaceFile', label: "Replace current" }
  ];
  let uploadOptions = allUploadOptions;
  let activeUploadOptionName = uploadOptions[0].name;

  // VARIABLE CHANGES
  $: if (activeMainTabName) {
    onChangeTab(activeMainTabName);
  }

  $: if (helperComponent) {
    helper.set(helperComponent);
  }

  // ENTRY POINT IN APP: INIT APP AFTER HELPER-COMPONENT IS AVAILABLE IN GENERAL-STORE
  $: if ($helper) {
    init();
  }

  const init = () => {
    initEventListeners();
    $helper.loadJSX('json2.js');
    initApplicationName().then(() => {
      updateAvailableTabs();
      themeManagerComponent.init();
      initFileSystemStructure();
      initPixxioJSDK();
      addFlyoutMenu();
      getMedia(activeMainTabName);
      updateUploadOptions();
    });
  };

  const initPixxioJSDK = () => {
    pixxio.set(new PIXXIO({
      appKey: "70aK0pH090EyxHgS1sSg3Po8M",
      element: document.getElementById("pixxioWrapper"),
      modal: false,
      compact: true
    }));

    $pixxio.on('authState', function(authState) {
      userIsAuthenticated = authState.login;
    });
  };

  const addFlyoutMenu = () => {
    var flyoutXML = '\
      <Menu> \
        <MenuItem Id="emptyCacheDirectory" Label="Empty cache directory"/> \
        <MenuItem Id="logout" Label="Logout"/> \
        <MenuItem Id="versionNumber" Label="' + versionNumber + '" Enabled="false"/> \
      </Menu>'
    ;
    $csInterface.setPanelFlyoutMenu(flyoutXML);
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
    mainTabs = mainTabs.filter(tab => tab.availableForApplication.includes($applicationName));
  };

  const getMedia = (tabName) => {
    let allowTypes = null;

    if ($applicationName === $applicationNames.INDESIGN) {
      if (tabName === "openFile") {
        allowTypes = ['indd'];
      } else if (tabName === "placeFile") {
        allowTypes = ['indd','jpg','jpeg','png','psd','tif','tiff','ai','eps','pdf','svg'];
      }
    } else if ($applicationName === $applicationNames.PHOTOSHOP) {
      if (tabName === "openFile") {
        allowTypes = ['psd','tif','tiff','eps','gif','jpeg','jpg','png','png00','png8','png24','png32','png48','png64','psb','pdf'];
      } else if (tabName === "placeFile") {
        allowTypes = ['jpeg','jpg','png','png00','png8','png24','png32','png48','png64','pdf','tif','tiff','bmp','svg','eps','ai','heic','heif','psd'];
      }
    }
    
    let allowFormats = null;
    if (tabName === "openFile") {
      allowFormats = ['original'];
    } else if (tabName === "placeFile") {
      allowFormats = ['original', 'preview'];
    }

    $pixxio.getMedia({
      max: 1,
      allowFormats: allowFormats,
      allowTypes: allowTypes,
      showFileName: false,
      showFileSize: false,
      showFileType: true,
      showSubject: true
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
    const localFilePath = $appDataFolder + "/" + selectedFile.file.fileName;
    $helper.download(remoteFilePath, localFilePath).then((downloadInfo) => {
      $helper.runJsx('openDocument("' + encodeURI(localFilePath) + '", "' + selectedFile.file.id + '")');
    }).catch((error) => {
      $helper.showError(error + ' (Error ' + $errorcodes.OPEN_DOCUMENT_DOWNLOAD + ')');
    });
  };

  const placeImage = (selectedFile) => {
    $helper.runJsx("hasOpenDocument()").then((hasOpenDocument) => {
      if (hasOpenDocument) {
        const remoteFilePath = selectedFile.url;
        const localFilePath = $appDataFolder + "/" + selectedFile.file.fileName;
        $helper.download(remoteFilePath, localFilePath).then((downloadInfo) => {
          $helper.runJsx('placeFile("' + encodeURI(localFilePath) + '", "' + selectedFile.file.id + '")');
        }).catch((error) => {
          $helper.showError(error + ' (Error ' + $errorcodes.PLACE_IMAGE_DOWNLOAD + ')');
        });
      } else {
        $helper.showError('You have to open a document first');
      }
    });
  };

  const updateProgressBar = (progressInPercent) => {
    downloadProgressInPercent = progressInPercent;
  };

  const updateUploadOptions = () => {
    Promise.all([
      $helper.runJsx('isPixxioDocument()'),
      $helper.runJsx('hasOpenDocument()')
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
    $helper.uploadFile(activeUploadOptionName).then(() => {
      $helper.showInfo('Upload complete');
    });
  };

  const initApplicationName = () => {
    return new Promise((resolve, reject) => {
      $helper.runJsx('getApplicationName()').then((name) => {
        applicationName.set(name);
        resolve($applicationName);
      });
    });
  };

  const initFileSystemStructure = () => {
    $helper.runJsx('getFileDirectory()').then((fileDirectory) => {
      appDataFolder.set(fileDirectory);
    });
  };

  const initEventListeners = () => {
    /*
    *  Adobe Events
    */
    $csInterface.addEventListener('documentAfterActivate', () => {
      updateUploadOptions();

      if (relinkComponent) {
        relinkComponent.fetchLinks();
      }
    });
    
    $csInterface.addEventListener('documentAfterDeactivate', () => {
      updateUploadOptions();
    });
    
    $csInterface.addEventListener('com.adobe.csxs.events.flyoutMenuClicked', (event) => {
      switch(event.data.menuId) {
        case 'logout': {
          const confirmMessage = 'Do you want to log out?';
          $helper.confirm(confirmMessage, 'yes', 'no').then(() => {
            $pixxio.forceLogout();
            getMedia(activeMainTabName);
          }).catch(() => {});
          break;
        }
        case 'emptyCacheDirectory': {
          const confirmMessage = 'Do you want to empty the cache directory?';
          $helper.confirm(confirmMessage, 'yes', 'no').then(() => {
            $helper.emptyCacheDirectory().then(() => {
              if (relinkComponent) {
                relinkComponent.fetchLinks();
              }
            });
          }).catch(() => {});
          break;
        }
      }
    });

    /*
    *  Custom Events
    */
    $csInterface.addEventListener('io.pixx.csxs.events.consoleLog', (event) => {
      console.log('JSX console: ', event.data);
    });
    
    $csInterface.addEventListener('io.pixx.csxs.events.updateDownloadProgress', (event) => {
      updateProgressBar(event.data === 'empty' ? 0 : event.data);
    });

    $csInterface.addEventListener('io.pixx.csxs.events.saveFileIDToHiddenFile', (event) => {
      if (event.data !== 'empty') {
        const localFilePath = event.data.localFilePath;
        const localFileName = localFilePath.split('/').pop();
        $helper.escapeRegExp(localFileName).then((escapedLocalFileName) => {
          const hiddenFilePath = localFilePath.replace(new RegExp(escapedLocalFileName + '$'), '.fileID_' + localFileName);
          saveFileIDToHiddenFile(hiddenFilePath, event.data.fileID);
        });
      }
    });
  };

  const saveFileIDToHiddenFile = (localHiddenFilePath, fileID) => {
    window.cep.fs.writeFile(decodeURI(localHiddenFilePath), fileID);
  };
</script>

<main>
  <ThemeManager bind:this={themeManagerComponent} />
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
      <ReLink bind:this={relinkComponent} />
    {/if}
  </div>

  <!-- GLOBAL OVERLAY -->
  {#if downloadProgressInPercent > 0}
    <div class="backdrop"></div>
  {/if}

  
  <Helper bind:this={helperComponent} />
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
</style>
