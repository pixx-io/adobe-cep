/*
 * ATTENTION! ALWAYS DEFINE VARIABLES WITH "var", NEVER "const" or "let"!
 * There seems to be a problem with "const" and "let" for variable-definitions.
 * If you define a variable any other than "var" the whole script is corrupted
 * and always returns "EvalScript Error." (wut?! O.o)
 */

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
    sendError('normalizeLocalPath error: ' + e.message + ' (' + localPath + ')');
    return JSON.stringify({ success: false, errorMessage: e.message });
  }
}

function hasOpenDocument() {
  try {
    return !!app.documents.length && !!app.activeDocument;
  } catch (e) {
    sendError('hasOpenDocument error: ' + e.message);
    return JSON.stringify({ success: false, errorMessage: e.message });
  }
}

function getApplicationName() {
  try {
    return app.name;
  } catch (e) {
    sendError('getApplicationName error: ' + e.message);
    return JSON.stringify({ success: false, errorMessage: e.message });
  }
}

function isPixxioDocument() {
  try {
    if (hasOpenDocument()) {
      return app.activeDocument.extractLabel('pixxio.fileID');
    } else {
      return false;
    }
  } catch (e) {
    sendError('isPixxioDocument error: ' + e.message);
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
    sendError('insertLabelToElement error: ' + e.message + ' (' + labelName + ': ' + labelValue + ')');
    return JSON.stringify({ success: false, errorMessage: e.message });
  }
}

function placeFile(localFilePath, fileID) {
  try {
    var file = new File(localFilePath);
    app.activeDocument.place(file, true);

    if (getApplicationName() === applicationNames.INDESIGN) {
      var link = app.activeDocument.links.lastItem();
      insertLabelToElement('pixxio.fileID', fileID, link);
    }
    saveCurrentDocument();
  } catch (e) {
    sendError('placeFile error: ' + e.message + ' (' + localFilePath + ')');
    return JSON.stringify({ success: false, errorMessage: e.message });
  }
}

function openDocument(localFilePath, fileID) {
  try {
    var file = new File(localFilePath);
    app.open(file);

    if (getApplicationName() === applicationNames.INDESIGN) {
      insertLabelToElement('pixxio.fileID', fileID);

      saveCurrentDocument();
    }
  } catch (e) {
    sendError('openDocument error: ' + e.message + ' (' + localFilePath + ')');
    return JSON.stringify({ success: false, errorMessage: e.message });
  }
}

function saveCurrentDocument() {
  try {
    app.activeDocument.save();
  } catch (e) {
    sendError('saveCurrentDocument error: ' + e.message);
    return JSON.stringify({ success: false, errorMessage: e.message });
  }
}

function getFileDirectory() {
  try {
    var folderName = normalizeLocalPath(Folder.userData.fsName) + '/pixx.io/AdobeExtension/cache';
    Folder(folderName).create();
    return folderName;
  } catch (e) {
    sendError('getFileDirectory error: ' + e.message);
    return JSON.stringify({ success: false, errorMessage: e.message });
  }
}

function getCurrentDocumentInformation() {
  try {
    var activeDocument = app.activeDocument;
    if (!activeDocument) {
      return false;
    }

    var labels = {
      fileID: activeDocument.extractLabel('pixxio.fileID'),
      fileName: activeDocument.extractLabel('pixxio.fileName')
    };

    var currentDocumentInformation = {
      name: activeDocument.name,
      directory: normalizeLocalPath(activeDocument.filePath.fsName),
      labels: labels
    };

    return JSON.stringify(currentDocumentInformation);
  } catch (e) {
    sendError('getCurrentDocumentInformation error: ' + e.message);
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
    sendError('getAllLinksFileIDs error: ' + e.message);
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
    sendError('getSelectedLinksFileIDs error: ' + e.message);
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
    sendError('removeDuplicatesFromArray error: ' + e.message + ' (' + JSON.stringify(array) + ')');
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
    sendError('reLink error: ' + e.message + ' (currentFileID: ' + currentFileID + ' / newFileID:' + newFileID + ' / localFilePath: ' + localFilePath + ')');
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
    sendError('updateLink error: ' + e.message + ' (' + fileID + ')');
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
    sendError('getLinkSize error: ' + e.message + ' (' + fileID + ')');
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
    sendError('getLinks error: ' + e.message);
    return JSON.stringify({ success: false, errorMessage: e.message });
  }
}

function getOpenDocuments() {
  try {
    var openDocuments = [];
    
    if (hasOpenDocument()) {
      for (var i = 0; i < app.documents.length; i++) {
        var document = app.documents[i];
        openDocuments.push({
          id: document.id,
          name: document.name,
          filePath: normalizeLocalPath(document.filePath.fsName)
        });
      }
    }
    
    return JSON.stringify(openDocuments);
  } catch (e) {
    sendError('getOpenDocuments error: ' + e.message);
    return JSON.stringify({ success: false, errorMessage: e.message });
  }
}