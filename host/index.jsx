const applicationNames = {
  INDESIGN: 'Adobe InDesign'
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

function isPixxioDocument() {
  if (hasOpenDocument()) {
    return app.activeDocument.extractLabel('pixxio.fileID');
  } else {
    return;
  }
}

function getLinkFileIDs() {
  const fileIDs = [];

  if (isPixxioDocument()) {
    const allLinks = app.activeDocument.links;
    for (var linkIndex = 0; linkIndex < allLinks.length; linkIndex++) {
      var fileID = allLinks[linkIndex].extractLabel('pixxio.fileID');
      if (fileID) {
        fileIDs.push(fileID);
      }
    }
  }
  return JSON.stringify(fileIDs);
}

function placeFile(localFilePath, remoteFilePath, fileName, fileID) {
  const file = new File(localFilePath);
  app.activeDocument.place(file, true);

  if (getApplicationName() === applicationNames.INDESIGN) {
    const link = app.activeDocument.links.lastItem();
    link.insertLabel('pixxio.remoteUrl', remoteFilePath);
    link.insertLabel('pixxio.fileName', fileName);
    link.insertLabel('pixxio.fileID', fileID);
  }
}

function openDocument(localFilePath, remoteFilePath, fileName, fileID) {
  var file = new File(localFilePath);
  app.open(file);

  if (getApplicationName() === applicationNames.INDESIGN) {
    const activeDocument = app.activeDocument;
    activeDocument.insertLabel('pixxio.remoteUrl', remoteFilePath);
    activeDocument.insertLabel('pixxio.fileName', fileName);
    activeDocument.insertLabel('pixxio.fileID', fileID);
  }
}

function hasOpenDocument() {
  return !!app.documents.length && !!app.activeDocument;
}

function getApplicationName() {
  return app.name;
}

/*
function closeProgressBar() {
  sendEvent('io.pixx.attachment_browser.close_progress_bar');
}

function syncAttachment(attachment_url, filename, item_id) {
  // CEP 5 has a bug with sending JSON or JSON.stringify(data) through events
  // So for now we have to do this crap because we can only send a simple string
  //var data = attachment_url + 'SUPEROBVIOUSSPLITPOINT' + filename + 'SUPEROBVIOUSSPLITPOINT' + item_id;
  const data = JSON.stringify({
      attachment_url,
      filename,
      item_id
  });
  sendEvent('io.pixx.attachment_browser.sync_attachment', data);
}

function hasOpenDocument() {
  var open_document = !!app.documents.length && !!app.activeDocument;
  return escape(open_document);
}

function getFileDirectory() {
  // $USER/Library/Application Support/pixx.io/AdobeExtension/cache
  var folderName = Folder.userData.fsName + '/pixx.io/AdobeExtension/cache';
  folderName     = folderName.split('\\').join('/');
  Folder(folderName).create();
  return folderName;
}

function locateFile(filename) {
  var filepath = getFileDirectory() + '/' + filename;
  return new File(filepath);
}

function placeFile(attachment_url, filename) {
  var file  = locateFile(filename);
  var image = app.activeWindow.activePage.place(file)[0];
  var link  = image.itemLink;
  link.insertLabel('pixxio.url', attachment_url);
  link.insertLabel('pixxio.filename', filename);
  closeProgressBar();
}

function syncFiles() {
  if (!!app.activeDocument) {
    var attachment_url, filename;
    enumerateLinks(app.activeDocument.links, function(link) {
      if(isLinked(link)) {
        attachment_url = link.extractLabel('pixxio.url');
        filename = link.extractLabel('pixxio.filename');
        syncAttachment(attachment_url, filename, link.id);
      }
    })
  }
}

function enumerateLinks(links, callback) {
  for (var linkIndex = 0; linkIndex < links.length; ++linkIndex) {
    callback(links[linkIndex]);
  }
}

function isLinked(link) {
  return !!link.extractLabel('pixxio.url');
}

function relink(link_id, filename) {
  var file = locateFile(filename);
  var link = app.activeDocument.links.itemByID(parseInt(link_id));
  link.relink(file);
  link.update();
}
*/
