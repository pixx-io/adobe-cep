const fs = cep_node.require('fs');
const http = cep_node.require('http');
const https = cep_node.require('https');

let csInterface = null;
let pixxio = null;
let userDataPath = null;
let appDataFolder = null;
let applicationName = null;

let activeTab = null;
let activePromise = null;

let totalSizeToDownload = 0;
let currentDownloadedSize = 0;

const applicationNames = {
    INDESIGN: 'Adobe InDesign'
};

function init() {
    initCSInterface();
    loadJSX('json2.js');
    initApplicationName().then(() => {
        console.log('applicationName: ', applicationName);

        initThemeManager();
        initEventListeners();
        initPixxioJSDK();
        initFileSystemStructure();
        updateUploadFileRadios();

        setIsLoggedInClass(true);   // TODO: call this function after jsdk supports loggedIn-Event

        if (applicationName === applicationNames.INDESIGN) {
            getLinkedFiles();
        }
    
        document.getElementsByClassName("tablinks")[0].click();
    });
}

function setIsLoggedInClass(isLoggedIn) {
    if (isLoggedIn) {
        document.body.classList.add('isLoggedIn');
    } else {
        document.body.classList.remove('isLoggedIn');
    }
}

function showMainContent(event, tabName) {
    if (tabName !== activeTab) {
        const tablinks = document.getElementsByClassName("tablinks");
        for (i = 0; i < tablinks.length; i++) {
            tablinks[i].className = tablinks[i].className.replace(" active", "");
        }
        event.currentTarget.className += " active";

        activeTab = tabName;

        const pixxioWrapperEl = document.getElementById('pixxioWrapper');
        const uploadFileWrapperEl = document.getElementById('uploadFileWrapper');
        
        if (tabName === 'openFile' || tabName === 'placeFile') {
            uploadFileWrapperEl.style.display = 'none';
            pixxioWrapperEl.style.display = 'flex';
            getMedia(tabName);
        } else if (tabName === 'uploadFile') {
            pixxioWrapperEl.style.display = 'none';
            uploadFileWrapperEl.style.display = 'flex';
        }
    }
}

function getMedia(tabName) {
    if (activePromise) {
        activePromise.current = false;
    }

    let allowedTypes = null;
    if (tabName === 'openFile') {
        allowedTypes = ['indd'];
    }
    else if (tabName === 'placeFile') {
        allowedTypes = ['jpg', 'png'];
    }

    const currentPromise = pixxio.getMedia({
        max: 1,
        allowedFormats: ['original'],
        allowedTypes: allowedTypes,
        additionalResponseFields: ['id', 'fileName']
    });
    currentPromise.current = true;

    activePromise = currentPromise;

    currentPromise.then((value) => {
        if (currentPromise.current) {
            if (activeTab === 'openFile') {
                openDocument(value[0]);
            }
            else if (activeTab === 'placeFile') {
                placeImage(value[0]);
            }

            getMedia(activeTab);
        }
    });
}

function getLinkedFiles() {
    runJsx('getLinkFileIDs()').then((fileIDs) => {
        console.log('fileIDs: ', fileIDs);
        // TODO: check these fileIDs for new versions
    });
}

function loadJSX(scriptName) {
    var extensionRoot = csInterface.getSystemPath(SystemPath.EXTENSION) + "/client/libs";
    runJsx('$.evalFile("' + extensionRoot + '/' + scriptName + '")');
}

function initCSInterface() {
    csInterface = new CSInterface();
}

function initThemeManager() {
    themeManager.init();
}

function initPixxioJSDK() {
    pixxio = new PIXXIO({
        appKey: '70aK0pH090EyxHgS1sSg3Po8M',
        element: document.getElementById('pixxioWrapper'),
        modal: false
    });
}

function initFileSystemStructure() {
    userDataPath = csInterface.getSystemPath(SystemPath.USER_DATA);
    appDataFolder = userDataPath + '/' + csInterface.getExtensionID();
    window.cep.fs.makedir(appDataFolder);
}

function initEventListeners() {
    /*
     *  Adobe Events
     */
    csInterface.addEventListener('documentAfterActivate', function (evt) {
        updateUploadFileRadios();
        getLinkedFiles();
    });
    
    csInterface.addEventListener('documentAfterDeactivate', function (evt) {
        updateUploadFileRadios();
    });

    /*
     *  Custom Events
     */
    csInterface.addEventListener('io.pixx.csxs.events.consoleLog', function (evt) {
        console.log('JSX console: ', evt.data);
    });
}

function initApplicationName() {
    return new Promise((resolve, reject) => {
        runJsx('getApplicationName()').then((name) => {
            applicationName = name;
            resolve(applicationName);
        });
    });
}

function updateUploadFileRadios() {
    Promise.all([
        runJsx('isPixxioDocument()'),
        runJsx('hasOpenDocument()')
    ]).then((values) => {
        const fileID = values[0];
        const hasOpenDocument = values[1] === 'true';
        const versionizeFileWrapperEl = document.getElementById('versionizeFileWrapper');
        const showVersionizeFile = fileID ? true : false;

        // if activeDocument has fileID-label, then show versionizeFile-radio else hide it
        if (showVersionizeFile) {
            versionizeFileWrapperEl.style.display = 'flex';
            document.getElementById('versionizeFile').checked = true;
        } else {
            versionizeFileWrapperEl.style.display = 'none';

            // if versionizeFile-radio is checked and hidden, check uploadNewFile-radio
            if (document.getElementById('versionizeFile').checked) {
                document.getElementById('uploadNewFile').checked = true;
            }
        }

        // disable upload-button if no document is open
        const uploadButtonEl = document.querySelector('#uploadFileWrapper .button--upload');
        uploadButtonEl.disabled = !hasOpenDocument;
    });
}

function showError(message) {
    const defaultMessage = 'An error occured. Please try again later or contact us at support@pixxio.com';
    const messageToSet = message ? message : defaultMessage;

    const errorEl = document.getElementById('errorOverlay');
    errorEl.innerHTML = messageToSet;
    errorEl.style.visibility = 'visible';

    setTimeout(() => {
        errorEl.style.visibility = 'hidden';
    }, 5000);
}

function openDocument(selectedFile) {
    const remoteFilePath = selectedFile.url;
    const localFileName = selectedFile.file.fileName;
    const localFilePath = appDataFolder + '/' + localFileName;
    download(remoteFilePath, localFilePath).then(function (downloadInfo) {
        runJsx('openDocument("' + encodeURI(localFilePath) + '", "' + encodeURI(remoteFilePath) + '", "' + localFileName + '", "' + selectedFile.file.id + '")');
    }, function (error) {
        console.log('=> download error: ', error);
        showError(error);
    });
}

function placeImage(selectedFile) {
    runJsx('hasOpenDocument()').then((hasOpenDocumentString) => {
        const hasOpenDocument = hasOpenDocumentString === 'true';
        if (hasOpenDocument) {
            const remoteFilePath = selectedFile.url;
            const localFileName = selectedFile.file.fileName;
            const localFilePath = appDataFolder + '/' + localFileName;
            download(remoteFilePath, localFilePath).then(function (downloadInfo) {
                runJsx('placeFile("' + encodeURI(localFilePath) + '", "' + encodeURI(remoteFilePath) + '", "' + localFileName + '", "' + selectedFile.file.id + '")');
            }, function (error) {
                console.log('=> download error: ', error);
                showError(error);
            });
        } else {
            showError('You have to open a document first');
        }
    });


}

async function download(url, filePath) {
    const protocol = !url.charAt(4).localeCompare('s') ? https : http;

    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filePath);
        let fileInfo = null;

        const request = protocol.get(url, response => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                return;
            }

            totalSizeToDownload = parseInt(response.headers['content-length'], 10);

            currentDownloadedSize = 0;
            response.on("data", function (chunk) {
                currentDownloadedSize += chunk.length;
                const progressInPercent = Math.round((currentDownloadedSize / totalSizeToDownload) * 100);
                updateProgressBar(progressInPercent);
            });

            fileInfo = {
                mime: response.headers['content-type'],
                size: parseInt(response.headers['content-length'], 10),
            };

            response.pipe(file);
        });

        file.on('finish', () => {
            totalSizeToDownload = 0;
            currentDownloadedSize = 0;
            updateProgressBar(0);
            resolve(fileInfo);
        });

        request.on('error', err => {
            fs.unlink(filePath, () => reject(err));
        });

        file.on('error', err => {
            fs.unlink(filePath, () => reject(err));
        });

        request.end();
    });
}

function updateProgressBar(progressInPercent) {
    const downloadProgressCurrentEl = document.querySelector('.downloadProgressTotal > .downloadProgressCurrent');
    downloadProgressCurrentEl.style.width = progressInPercent + '%';

    const globalOverlayEl = document.getElementById('globalOverlay');
    globalOverlayEl.style.visibility = progressInPercent === 0 ? 'hidden' : 'unset';
}

async function runJsx(command) {
    return new Promise((resolve, reject) => {
        csInterface.evalScript(command, function (evalScriptReturnValue, param1, param2) {
            if (evalScriptReturnValue === EvalScript_ErrMessage) {
                showError();
                reject();
            } else {
                resolve(evalScriptReturnValue);
            }
        });
    });
}
