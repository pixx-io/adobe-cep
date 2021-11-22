<script>
  import { onMount } from "svelte";
  import { csInterface } from "./stores/general.js";

  // pixx.io JSDK
  import "@pixx.io/jsdk/build/pixxio.jsdk.css";
  import PIXXIO from "@pixx.io/jsdk";

  // components
  import Helper from "./Helper.svelte";
  import ThemeManager from "./ThemeManager.svelte";
  import Tabs from "./components/Tabs.svelte";
  import ProgressBar from "./components/ProgressBar.svelte";

  let themeManagerComponent;
  let helperComponent;
  let pixxio;
  let userIsAuthenticated = true;
  let errorMessage = null;
  let userDataPath = null;
  let appDataFolder = null;
  let applicationName = null;
  let activeMainTabName = null;
  const mainTabs = [
    { name: "openFile", label: "Open document" },
    { name: "placeFile", label: "Place file" },
    { name: "uploadFile", label: "Upload file" },
  ];
  let activeGetMediaPromise = null;
  let downloadProgressInPercent = 0;

  // variable changes
  $: if (activeMainTabName) {
    if (activeMainTabName === "openFile" || activeMainTabName === "placeFile") {
      getMedia(activeMainTabName);
    }
  }

  onMount(async () => {
    initPixxioJSDK();
    
    helperComponent.loadJSX('json2.js');
    initApplicationName().then(() => {
      console.log('applicationName: ', applicationName);
      themeManagerComponent.init();
      initEventListeners();
      initFileSystemStructure();

    });


    activeMainTabName = "openFile";
  });

  function initPixxioJSDK() {
    pixxio = new PIXXIO({
      appKey: "70aK0pH090EyxHgS1sSg3Po8M",
      element: document.getElementById("pixxioWrapper"),
      modal: false,
    });
  }

  function getMedia(tabName) {
    if (activeGetMediaPromise) {
      activeGetMediaPromise.current = false;
    }

    let allowedTypes = null;
    if (tabName === "openFile") {
      allowedTypes = ["indd"];
    } else if (tabName === "placeFile") {
      allowedTypes = ["jpg", "png"];
    }

    const currentPromise = pixxio.getMedia({
      max: 1,
      allowedFormats: ["original"],
      allowedTypes: allowedTypes,
      additionalResponseFields: ["id", "fileName"],
    });
    currentPromise.current = true;

    activeGetMediaPromise = currentPromise;

    currentPromise.then((value) => {
      if (currentPromise.current) {
        if (activeMainTabName === "openFile") {
            openDocument(value[0]);
        } else if (activeMainTabName === "placeFile") {
            placeImage(value[0]);
        }

        getMedia(activeMainTabName);
      }
    });
  }

  function openDocument(selectedFile) {
    const remoteFilePath = selectedFile.url;
    const localFileName = selectedFile.file.fileName;
    const localFilePath = appDataFolder + "/" + localFileName;
    helperComponent.download(remoteFilePath, localFilePath).then(function (downloadInfo) {
      helperComponent.runJsx('openDocument("' + encodeURI(localFilePath) + '", "' + encodeURI(remoteFilePath) + '", "' + localFileName + '", "' + selectedFile.file.id + '")');
    }, function (error) {
      console.log("=> download error: ", error);
      helperComponent.runJsx('sendEvent("io.pixx.csxs.events.showError", "' + error + '")');
    });
  }

  function placeImage(selectedFile) {
    helperComponent.runJsx("hasOpenDocument()").then((hasOpenDocumentString) => {
        const hasOpenDocument = hasOpenDocumentString === "true";
        if (hasOpenDocument) {
            const remoteFilePath = selectedFile.url;
            const localFileName = selectedFile.file.fileName;
            const localFilePath = appDataFolder + "/" + localFileName;
            helperComponent.download(remoteFilePath, localFilePath).then(function (downloadInfo) {
              helperComponent.runJsx('placeFile("' + encodeURI(localFilePath) + '", "' + encodeURI(remoteFilePath) + '", "' + localFileName + '", "' + selectedFile.file.id + '")');
            }, function (error) {
              console.log("=> download error: ", error);
              helperComponent.runJsx('sendEvent("io.pixx.csxs.events.showError", "' + error + '")');
            });
        } else {
          const error = 'You have to open a document first';
          helperComponent.runJsx('sendEvent("io.pixx.csxs.events.showError", "' + error + '")');
        }
    });
  }

  function updateProgressBar(progressInPercent) {
    downloadProgressInPercent = progressInPercent;
  }

  function showError(message) {
    const defaultMessage = 'An error occured. Please try again later or contact us at support@pixxio.com';
    errorMessage = message ? message : defaultMessage;

    setTimeout(() => {
      errorMessage = null;
    }, 5000);
  }

  function initApplicationName() {
    return new Promise((resolve, reject) => {
      helperComponent.runJsx('getApplicationName()').then((name) => {
        applicationName = name;
        resolve(applicationName);
      });
    });
  }

  function initFileSystemStructure() {
    userDataPath = $csInterface.getSystemPath(SystemPath.USER_DATA);
    appDataFolder = userDataPath + '/' + $csInterface.getExtensionID();
    window.cep.fs.makedir(appDataFolder);
  }

  function initEventListeners() {
    /*
    *  Adobe Events
    */
    $csInterface.addEventListener('documentAfterActivate', function (evt) {
      //updateUploadFileRadios();
      //getLinkedFiles();
    });
    
    $csInterface.addEventListener('documentAfterDeactivate', function (evt) {
      //updateUploadFileRadios();
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
  }
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
      style="opacity: {activeMainTabName === 'openFile' || activeMainTabName === 'placeFile' ? 1 : 0}"
    />
  </div>

  <!-- ERROR OVERLAY -->
  {#if errorMessage}
    <div id="errorOverlay">{errorMessage}</div>
  {/if}
</main>

<style lang="scss">
  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: auto;
  }

  /*
  * ERROR OVERLAY
  */
  #errorOverlay {
    position: absolute;
    bottom: 15px;
    right: 10px;
    left: 10px;
    padding: 15px;
    border-radius: 6px;
    font-size: 14px;
    background-color: red;
    transition: 0.3s;
  }
</style>
