/*
 * ATTENTION! ALWAYS DEFINE VARIABLES WITH "var", NEVER "const" or "let"!
 * There seems to be a problem with "const" and "let" for variable-definitions.
 * If you define a variable any other than "var" the whole script is corrupted
 * and always returns "EvalScript Error." (wut?! O.o)
 */

var errorcodes = {
  NORMALIZE_LOCAL_PATH: 10101,
  HAS_OPEN_DOCUMENT: 10201,
  GET_APPLICATION_NAME: 10301,
  IS_PIXXIO_DOCUMENT: 10401,
  INSERT_LABEL: 10501,
  PLACE_FILE: 10601,
  OPEN_DOCUMENT: 10701,
  SAVE_CURRENT_DOCUMENT: 10801,
  GET_FILE_DIRECTORY: 10901,
  GET_CURRENT_DOCUMENT_INFORMATION: 11001,
  GET_ALL_LINKS_FILE_IDS: 11101,
  GET_SELECTED_LINKS_FILE_IDS: 11201,
  REMOVE_DUPLICATES: 11301,
  RE_LINK: 11401,
  UPDATE_LINK: 11501,
  GET_LINK_INFO: 11601,
  GET_LINKS: 11701,
  GET_OPEN_DOCUMENTS: 11801
};

var applicationNames = {
  INDESIGN: 'Adobe InDesign',
  PHOTOSHOP: 'Adobe Photoshop'
};

function sendEvent(type, data) {
  new ExternalObject("lib:PlugPlugExternalObject");
  var event = new CSXSEvent();
  event.type = type;
  event.data = data || 'empty';
  event.dispatch();
}

function consoleLog(message) {
  sendEvent('io.pixx.csxs.events.consoleLog', message);
}

function sendError(message) {
  sendEvent('io.pixx.csxs.events.showError', message);
}

function sendInfo(message) {
  sendEvent('io.pixx.csxs.events.showInfo', message);
}

function normalizeLocalPath(localPath) {
  try {
    return localPath.split('\\').join('/');
  } catch (e) {
    sendError(e.message + ' (' + localPath + ') (Error ' + errorcodes.NORMALIZE_LOCAL_PATH + ')');
    return JSON.stringify({ success: false, errorMessage: e.message });
  }
}

function hasOpenDocument() {
  try {
    return !!app.documents.length && !!app.activeDocument;
  } catch (e) {
    sendError(e.message + ' (Error ' + errorcodes.HAS_OPEN_DOCUMENT + ')');
    return JSON.stringify({ success: false, errorMessage: e.message });
  }
}

function getApplicationName() {
  try {
    return app.name;
  } catch (e) {
    sendError(e.message + ' (Error ' + errorcodes.GET_APPLICATION_NAME + ')');
    return JSON.stringify({ success: false, errorMessage: e.message });
  }
}

function isPixxioDocument() {
  try {
    if (hasOpenDocument()) {
      if (getApplicationName() === applicationNames.INDESIGN) {
        return app.activeDocument.extractLabel('pixxio.fileID');
      } else if (getApplicationName() === applicationNames.PHOTOSHOP) {
        var currentDocumentInformation = JSON.parse(getCurrentDocumentInformation());
        if (currentDocumentInformation && currentDocumentInformation.labels && currentDocumentInformation.labels.fileID) {
          return currentDocumentInformation.labels.fileID;
        } else {
          return false;
        }
      }
    } else {
      return false;
    }
  } catch (e) {
    sendError(e.message + ' (Error ' + errorcodes.IS_PIXXIO_DOCUMENT + ')');
    return JSON.stringify({ success: false, errorMessage: e.message });
  }
}

function insertLabelToElement(labelName, labelValue, element) {
  try {
    if (!element) {
      element = app.activeDocument;
    }
    element.insertLabel(labelName, labelValue);
  } catch (e) {
    sendError(e.message + ' (' + labelName + ': ' + labelValue + ') (Error ' + errorcodes.INSERT_LABEL + ')');
    return JSON.stringify({ success: false, errorMessage: e.message });
  }
}

function saveFileIDToHiddenFile(localFilePath, fileID) {
  var fileInfo = {
    localFilePath: localFilePath,
    fileID: fileID
  }
  
  sendEvent('io.pixx.csxs.events.saveFileIDToHiddenFile', JSON.stringify(fileInfo));
}

function placeFile(localFilePath, fileID) {
  try {
    var file = new File(localFilePath);

    if (getApplicationName() === applicationNames.INDESIGN) {
      app.activeDocument.place(file, true);
      var link = app.activeDocument.links.lastItem();
      insertLabelToElement('pixxio.fileID', fileID, link);
    } else if (getApplicationName() === applicationNames.PHOTOSHOP) {
      var whereToAdd = app.activeDocument;
      app.load(file); //load it into documents
      var tmpFile = app.activeDocument; //prepare your image layer as active document
      tmpFile.selection.selectAll();
      tmpFile.selection.copy(); //copy image into clipboard
      tmpFile.close(SaveOptions.DONOTSAVECHANGES); //close image without saving changes
      whereToAdd.paste(); //paste selection into your document
    }
    saveCurrentDocument();
  } catch (e) {
    sendError(e.message + ' (' + localFilePath + ') (Error ' + errorcodes.PLACE_FILE + ')');
    return JSON.stringify({ success: false, errorMessage: e.message });
  }
}

function openDocument(localFilePath, fileID) {
  try {
    var file = new File(localFilePath);
    app.open(file);

    if (getApplicationName() === applicationNames.INDESIGN) {
      insertLabelToElement('pixxio.fileID', fileID);
    } else if (getApplicationName() === applicationNames.PHOTOSHOP) {
      saveFileIDToHiddenFile(localFilePath, fileID);
    }
    saveCurrentDocument();
  } catch (e) {
    sendError(e.message + ' (' + localFilePath + ') (Error ' + errorcodes.OPEN_DOCUMENT + ')');
    return JSON.stringify({ success: false, errorMessage: e.message });
  }
}

function saveCurrentDocument() {
  try {
    app.activeDocument.save();
  } catch (e) {
    sendError(e.message + ' (Error ' + errorcodes.SAVE_CURRENT_DOCUMENT + ')');
    return JSON.stringify({ success: false, errorMessage: e.message });
  }
}

function getFileDirectory() {
  try {
    var folderName = normalizeLocalPath(Folder.userData.fsName) + '/pixx.io/AdobeExtension/cache';
    Folder(folderName).create();
    return folderName;
  } catch (e) {
    sendError(e.message + ' (Error ' + errorcodes.GET_FILE_DIRECTORY + ')');
    return JSON.stringify({ success: false, errorMessage: e.message });
  }
}

function getCurrentDocumentInformation() {
  try {
    var activeDocument = app.activeDocument;
    if (!activeDocument) {
      return false;
    }

    var directory;
    var fileID;
    if (getApplicationName() === applicationNames.INDESIGN) {
      try {
        directory = normalizeLocalPath(activeDocument.filePath.fsName);
        fileID = activeDocument.extractLabel('pixxio.fileID');
      } catch(e) {}
    } else if (getApplicationName() === applicationNames.PHOTOSHOP) {
      try {
        directory = normalizeLocalPath(app.activeDocument.path.fsName);

        const localFilePath = normalizeLocalPath(app.activeDocument.fullName.fsName);
        const localFileName = localFilePath.split('/').pop();
        const hiddenFilePath = localFilePath.replace(new RegExp(escapeRegExp(localFileName) + '$'), '.fileID_' + localFileName);

        var hiddenFile = new File(hiddenFilePath);
        if (hiddenFile.exists) {
          hiddenFile.open('r');
          fileID = hiddenFile.read();
          hiddenFile.close();
        }
      } catch(e) {}
    }

    var labels = {};
    if (fileID) {
      labels.fileID = fileID;
    }

    var currentDocumentInformation = {
      name: activeDocument.name,
      directory: directory,
      labels: labels
    };

    return JSON.stringify(currentDocumentInformation);
  } catch (e) {
    sendError(e.message + ' (Error ' + errorcodes.GET_CURRENT_DOCUMENT_INFORMATION + ')');
    return JSON.stringify({ success: false, errorMessage: e.message });
  }
}

function getAllLinksFileIDs() {
  try {
    var fileIDs = [];

    var allLinks = app.activeDocument.links;
    for (var linkIndex = 0; linkIndex < allLinks.length; linkIndex++) {
      var fileID = allLinks[linkIndex].extractLabel('pixxio.fileID');
      if (fileID) {
        fileIDs.push(parseInt(fileID));
      }
    }

    return JSON.stringify(removeDuplicatesFromArray(fileIDs));
  } catch (e) {
    sendError(e.message + ' (Error ' + errorcodes.GET_ALL_LINKS_FILE_IDS + ')');
    return JSON.stringify({ success: false, errorMessage: e.message });
  }
}

function getSelectedLinksFileIDs() {
  try {
    var selectedFileIDs = [];

    var documentSelection = app.activeDocument.selection;
    for (var selectionIndex = 0; selectionIndex < documentSelection.length; selectionIndex++) {
      var selection = documentSelection[selectionIndex];
      var selectionName = selection.constructor.name;
      
      var itemLink = null;
      
      if (selectionName == 'Rectangle') {
        var selectionGraphics = selection.allGraphics;
        if (selectionGraphics.length > 0) {
          itemLink = selectionGraphics[0].itemLink;
        }
      } else if (selectionName == 'Image') {
        itemLink = selection.itemLink;
      }

      if (itemLink) {
        var fileID = itemLink.extractLabel('pixxio.fileID');
        if (fileID) {
          selectedFileIDs.push(parseInt(fileID));
        }
      }
    }

    return JSON.stringify(removeDuplicatesFromArray(selectedFileIDs));
  } catch (e) {
    sendError(e.message + ' (Error ' + errorcodes.GET_SELECTED_LINKS_FILE_IDS + ')');
    return JSON.stringify({ success: false, errorMessage: e.message });
  }
}

function removeDuplicatesFromArray(array) {
  try {
    var checkedElements = {};
    var uniqueArray = [];

    for (var i = 0; i < array.length; i++) {
      if (!(array[i] in checkedElements)) {
        uniqueArray.push(array[i]);
        checkedElements[array[i]] = true;
      }
    }

    return uniqueArray;
  } catch (e) {
    sendError(e.message + ' (' + JSON.stringify(array) + ') (Error ' + errorcodes.REMOVE_DUPLICATES + ')');
    return JSON.stringify({ success: false, errorMessage: e.message });
  }
}

function reLink(currentFileID, newFileID, localFilePath) {
  try {
    for (var i = 0; i < app.activeDocument.links.length; i++) {
      if (app.activeDocument.links[i].extractLabel('pixxio.fileID') === currentFileID) {
        app.activeDocument.links[i].relink(new File(localFilePath));
        insertLabelToElement('pixxio.fileID', newFileID, app.activeDocument.links[i]);
        app.activeDocument.links[i].update();
      }
    }
  } catch (e) {
    sendError(e.message + ' (currentFileID: ' + currentFileID + ' / newFileID:' + newFileID + ' / localFilePath: ' + localFilePath + ') (Error ' + errorcodes.RE_LINK + ')');
    return JSON.stringify({ success: false, errorMessage: e.message });
  }
}

function updateLink(fileID) {
  try {
    for (var i = 0; i < app.activeDocument.links.length; i++) {
      if (app.activeDocument.links[i].extractLabel('pixxio.fileID') === fileID) {
        app.activeDocument.links[i].update();
      }
    }
  } catch (e) {
    sendError(e.message + ' (' + fileID + ') (Error ' + errorcodes.UPDATE_LINK + ')');
    return JSON.stringify({ success: false, errorMessage: e.message });
  }
}

function getLinkInfo(fileID) {
  try {
    var info = [];
    for (var i = 0; i < app.activeDocument.links.length; i++) {
      if (app.activeDocument.links[i].extractLabel('pixxio.fileID') === fileID) {
        info.push({
          linkedFilePath: normalizeLocalPath(app.activeDocument.links[i].filePath),
          linkedFileName: normalizeLocalPath(app.activeDocument.links[i].name),
          linkSize: app.activeDocument.links[i].size,
          linkStatus: linkStatusObjectToString(app.activeDocument.links[i].status)
        });
      }
    }
    return JSON.stringify(info);
  } catch (e) {
    sendError(e.message + ' (' + fileID + ') (Error ' + errorcodes.GET_LINK_INFO + ')');
    return JSON.stringify({ success: false, errorMessage: e.message });
  }
}

function linkStatusObjectToString(status) {
  var link_status = 'unknown';
  if (status == LinkStatus.NORMAL) {
    link_status = 'NORMAL';
  }
  else if (status == LinkStatus.LINK_EMBEDDED) {
    link_status = 'LINK_EMBEDDED';
  }
  else if (status == LinkStatus.LINK_INACCESSIBLE) {
    link_status = 'LINK_INACCESSIBLE';
  }
  else if (status == LinkStatus.LINK_MISSING) {
    link_status = 'LINK_MISSING';
  }
  else if (status == LinkStatus.LINK_OUT_OF_DATE) {
    link_status = 'LINK_OUT_OF_DATE';
  }

  return link_status;
}

function getLinks() {
  try {
    var links = [];
    
    if (hasOpenDocument()) {
      for (var i = 0; i < app.activeDocument.links.length; i++) {
        var link = app.activeDocument.links[i];
        links.push({
          id: link.id,
          name: link.name,
          filePath: link.filePath,
          size: link.size,
          status: linkStatusObjectToString(link.status),
          fileID: link.extractLabel('pixxio.fileID')
        });
      }
    }
    
    return JSON.stringify(links);
  } catch (e) {
    sendError(e.message + ' (Error ' + errorcodes.GET_LINKS + ')');
    return JSON.stringify({ success: false, errorMessage: e.message });
  }
}

function getOpenDocuments() {
  try {
    var openDocuments = [];
    
    if (hasOpenDocument()) {
      for (var i = 0; i < app.documents.length; i++) {
        var document = app.documents[i];

        var filePath;
        if (getApplicationName() === applicationNames.INDESIGN) {
          try {
            filePath = normalizeLocalPath(document.filePath.fsName);
          } catch(e) {}
        } else if (getApplicationName() === applicationNames.PHOTOSHOP) {
          try {
            filePath = normalizeLocalPath(document.path.fsName);
          } catch(e) {}
        }

        openDocuments.push({
          id: document.id,
          name: document.name,
          filePath: filePath
        });
      }
    }
    
    return JSON.stringify(openDocuments);
  } catch (e) {
    sendError(e.message + ' (Error ' + errorcodes.GET_OPEN_DOCUMENTS + ')');
    return JSON.stringify({ success: false, errorMessage: e.message });
  }
}

function escapeRegExp(stringToGoIntoTheRegex) {
  return stringToGoIntoTheRegex.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}