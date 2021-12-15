<script>
  import { onMount } from "svelte";
  import Link from "./Link.svelte";
  
  import { pixxio, appDataFolder, helper} from "../stores/general.js";

  let links = [];
  let selectedLinks = [];
  let sortButtons = [{
    label: '',
    sortProperty: 'fileID',
    icon: './assets/icons/iconWhite.png'
  }, {
    label: 'Name',
    sortProperty: 'name'
  }, {
    label: '',
    sortProperty: 'status',
    icon: './assets/icons/status.svg'
  }];
  let sortProperty = 'name';
  let sortDirection = 'ascending';

  onMount(async () => {
    fetchLinks();
  });

  export const fetchLinks = () => {
    $helper.getLinks().then((getLinksResponse) => {
      links = removeDuplicateLinks(getLinksResponse);
      sortLinks();
    });
  };

  const removeDuplicateLinks = (linksArray) => {
    const uniqueArray = [];
    const seenFileIDs = {};
    linksArray.forEach((link) => {
      if (!seenFileIDs.hasOwnProperty(link.fileID)) {
        uniqueArray.push(link);
        seenFileIDs[link.fileID] = true;
      }
    });
    return uniqueArray;
  };

  const sortLinks = () => {
    const sortAscending = () => {
      links.sort((a, b) => {
        if (a[sortProperty] < b[sortProperty]) {
          return -1;
        }
        if (a[sortProperty] > b[sortProperty]) {
          return 1;
        }
        return 0;
      });
    };
    const sortDescending = () => {
      links.sort((a, b) => {
        if (a[sortProperty] > b[sortProperty]) {
          return -1;
        }
        if (a[sortProperty] < b[sortProperty]) {
          return 1;
        }
        return 0;
      });
    };

    if (sortDirection === 'ascending') {
      sortAscending();
    }
    else if (sortDirection === 'descending') {
      sortDescending();
    }

    links = [...links];
  };

  const preSyncLinks = (clickEvent, relinkOptionName, presetFileIDs = null) => {
    if (relinkOptionName === 'links') {
      relinkOptionName = clickEvent.altKey ? 'allLinks': 'selectedLinks';
    }

    $helper.runJsx('saveCurrentDocument()').then(() => {
      let fileIDs = [];

      const afterGetFileIDs = () => {
        if (fileIDs.length) {
          $pixxio.bulkMainVersionCheck(fileIDs).then((bulkMainVersionResponse) => {
            getFilesToUpdate(bulkMainVersionResponse, relinkOptionName).then((filesToUpdate) => {
              if (filesToUpdate.length) {
                syncLinks(filesToUpdate);
              } else {
                if (relinkOptionName === 'allUpdatedLinks') {
                  $helper.showInfo('No updated links available.');
                } else {
                  $helper.showInfo('Selected links not found in pixx.io.');
                }
              }
            });
          });
        } else {
          $helper.showInfo('No pixx.io links found. Select a pixx.io link and try again.');
        }
      };

      if (relinkOptionName === 'presetFileIDs') {
        fileIDs = presetFileIDs ?? [];
        afterGetFileIDs();
      } else if (relinkOptionName === 'selectedLinks') {
        fileIDs = selectedLinks.map(link => link.fileID);

        if (fileIDs.length > 0) {
          afterGetFileIDs();
        } else {
          $helper.showInfo('No pixx.io links selected. Select a pixx.io link and try again.');
        }
      } else {
        $helper.getAllLinkedFileIDs().then((allLinkedFileIDs) => {
          fileIDs = allLinkedFileIDs;
          afterGetFileIDs();
        });
      }
    });
  };

  const syncLinks = (filesToUpdate) => {
    let totalFileSize = 0;
    filesToUpdate.forEach((file) => {
      totalFileSize += file.mainVersionFileSize;
    });

    let confirmMessage = 'You are about to download ' + filesToUpdate.length + ' ' + (filesToUpdate.length === 1 ? 'file' : 'files');
    confirmMessage += ' with a total file size of ' + $helper.fileSizeRenderer(totalFileSize) + '.';
    confirmMessage += '<br>';
    confirmMessage += 'Do you want to continue?';

    $helper.confirm(confirmMessage).then(() => {
      downloadNewVersionOfFiles(filesToUpdate).then((newVersions) => {
        console.log('SYNC DOWNLOAD DONE: ', newVersions);

        $helper.updateDownloadProgress('pending');

        reLinkNewVersions(newVersions).then(() => {
          console.log('SYNC RELINK DONE');
          fetchLinks();
        });
      });
    }).catch(() => {});
  };

  const getFilesToUpdate = (bulkMainVersionResponse, relinkOptionName) => {
    return new Promise(async (resolve, reject) => {
      let filesToUpdate = [];

      const loopThroughBulkMainVersionReponse = (loopIndex) => {
        const nextStep = () => {
          loopIndex++;
          loopThroughBulkMainVersionReponse(loopIndex);
        };

        const file = bulkMainVersionResponse[loopIndex];
        if (file) {
          $helper.getLinkInfo(file.id).then((linkInfo) => {
            filesToUpdate.push({
              ...file,
              linkedFileName: linkInfo.length ? linkInfo[0].linkedFileName : null,
              linkedFilePath: linkInfo.length ? linkInfo[0].linkedFilePath : null
            });
            nextStep();
          });
        } else {
          if (relinkOptionName === 'allUpdatedLinks') { // only use the files where isMainVersion is false or the fileName changed (e.g. file was replaced)
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

  const downloadNewVersionOfFiles = (filesToUpdate) => {
    return new Promise(async (resolve, reject) => {
      $helper.updateDownloadProgress('pending');

      const newVersions = [];

      const loopThroughFileIDs = (loopIndex) => {
        const fileToUpdate = filesToUpdate[loopIndex];
        if (fileToUpdate) {
          const nextStep = () => {
            loopIndex++;
            loopThroughFileIDs(loopIndex);
          };
          
          $helper.showInfo('Download: ' + (loopIndex + 1) + ' / ' + filesToUpdate.length);

          const remoteFilePath = fileToUpdate.mainVersionOriginalFileURL;
          const localFileName = fileToUpdate.mainVersionFileName;
          const localFilePath = $appDataFolder + "/" + localFileName;
          $helper.download(remoteFilePath, localFilePath).then((downloadInfo) => {
            newVersions.push({
              ...fileToUpdate,
              localFilePath: localFilePath,
              fileSize: downloadInfo.size
            });
            nextStep();
          }, (error) => {
            $helper.showError(error);
            nextStep();
          });
        } else {
          $helper.updateDownloadProgress(0);
          $helper.showInfo(null);
          resolve(newVersions);
        }
      };
      loopThroughFileIDs(0);
    });
  };

  const reLinkNewVersions = (newVersions) => {
    return new Promise(async (resolve, reject) => {
      $helper.updateDownloadProgress('pending');

      const loopThroughNewVersionsToRelink = (loopIndex) => {
        const newVersion = newVersions[loopIndex];
        if (newVersion) {
          console.log('loopThroughNewVersionsToRelink...: ', newVersion);

          const nextStep = () => {
            loopIndex++;
            loopThroughNewVersionsToRelink(loopIndex);
          };

          const reLink = () => {
            $helper.runJsx('reLink("' + newVersion.id + '", "' + newVersion.mainVersion + '", "' + encodeURI(newVersion.localFilePath) + '")').then(() => {
              console.log('=> reLink complete');
              nextStep();
            }).catch((error) => {
              console.error('=> reLink failed; ', newVersion);
              nextStep();
            });
          };
          
          $helper.showInfo('Relink: ' + (loopIndex + 1) + ' / ' + newVersions.length);

          if (newVersion.linkedFilePath !== newVersion.localFilePath) {  // local filePath changed
            $helper.deleteLocalFile(newVersion.linkedFilePath);
            reLink();
          } else {
            $helper.waitForLinkSize(newVersion.mainVersion, newVersion.fileSize).then(() => {
              reLink();
            }).catch(() => {
              console.warn('waitForLinkSize aborted, continue with next file: ', newVersion);
              nextStep();
            });
          }
        } else {
          $helper.updateDownloadProgress(0);
          $helper.showInfo(null);
          resolve();
        }
      }
      loopThroughNewVersionsToRelink(0);
    });
  };

  const selectLink = (event) => {
    const clickEvent = event.detail.clickEvent;
    const link = event.detail.link;

    const foundIndex = selectedLinks.map(link => link.id).indexOf(link.id);
    if (foundIndex > -1) {
      selectedLinks.splice(foundIndex, 1);
    } else {
      if (!clickEvent.ctrlKey && !clickEvent.shiftKey) {
        selectedLinks = [];
      }

      if (clickEvent.shiftKey && selectedLinks.length) {
        const previousSelectedIndex = links.map(link => link.id).indexOf(selectedLinks[selectedLinks.length - 1].id);
        const selectedIndex = links.map(link => link.id).indexOf(link.id);
        const rangeLinks = links.slice(
          previousSelectedIndex <= selectedIndex ? previousSelectedIndex + 1 : selectedIndex,
          (selectedIndex >= previousSelectedIndex ? selectedIndex : previousSelectedIndex) + 1
        ).filter(link => link.fileID);
        selectedLinks.push(...rangeLinks);
      } else {
        selectedLinks.push(link);
      }
    }
    console.log('selectedLinks 1: ', selectedLinks);
    selectedLinks = removeDuplicateLinks(selectedLinks);
    console.log('selectedLinks 2: ', selectedLinks);

    // to trigger change detection, otherwise UI is not updated
    selectedLinks = [...selectedLinks];
  };

  const doubleClickError = (event) => {
    const clickEvent = event.detail.clickEvent;
    const link = event.detail.link;
    
    preSyncLinks(clickEvent, 'presetFileIDs', [link.fileID]);
  };

  const doubleClickWarning = (event) => {
    const clickEvent = event.detail.clickEvent;
    const link = event.detail.link;
    
    preSyncLinks(clickEvent, 'presetFileIDs', [link.fileID]);
  };

  const changeSorting = (button) => {
    if (sortProperty === button.sortProperty) {
      sortDirection = sortDirection === 'ascending' ? 'descending' : 'ascending';
    } else {
      sortProperty = button.sortProperty;
      sortDirection = 'ascending';
    }

    sortLinks();
  }
</script>

<div class="linksSorter">
  {#each sortButtons as button}
    <button class="button" on:click="{e => changeSorting(button)}">
      {#if button.icon}
        <div class="icon" style="background-image: url({button.icon})"></div>
      {/if}
      {#if button.label}
        <div class="label">{button.label}</div>
      {/if}
      {#if sortProperty === button.sortProperty}
        {#if sortDirection === 'ascending'}
          <div class="arrow arrow--down"></div>
        {:else if sortDirection === 'descending'}
          <div class="arrow arrow--up"></div>
        {/if}
      {/if}
    </button>
  {/each}
</div>
<div class="linksWrapper">
  {#each links as link}
    <Link
      bind:link
      isSelected="{selectedLinks.map(link => link.fileID).includes(link.fileID)}"
      on:selectLink="{selectLink}"
      on:doubleClickError="{doubleClickError}"
      on:doubleClickWarning="{doubleClickWarning}"
    />
  {/each}
</div>
<div class="footer">
  <div class="linksCount">
    {#if selectedLinks.length === 0}
      { links.length } { links.length === 1 ? 'link' : 'links' }
    {:else if selectedLinks.length > 0}
      { selectedLinks.length } selected  { selectedLinks.length === 1 ? 'link' : 'links' }
    {/if}
  </div>
  <div class="flexSpacer"></div>
  <button
    class="button"
    on:click="{e => preSyncLinks(e, 'allUpdatedLinks')}"
    disabled={!links.length}
    title="Relink all updated pixx.io links"
  >
    <div class="icon icon--updateAndCheck"></div>
  </button>
  <button
    class="button"
    on:click="{e => preSyncLinks(e, 'links')}"
    disabled={!links.length}
    title="Relink selected pixx.io links. Alt-key + click to relink all"
  >
    <div class="icon icon--update"></div>
  </button>
</div>


<style lang="scss">
  .linksSorter {
    margin-top: 20px;
    padding: 6px 20px;
    display: flex;
    flex-direction: row;
    align-items: stretch;

    button {
      flex: 1;
      text-align: left;
      line-height: 1.6em;
      text-transform: unset;
      padding: 0 8px;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: flex-start;
      border-right: 1px solid rgba(var(--color-rgb), .3);
      border-radius: 0;
      letter-spacing: normal;

      &:first-of-type,
      &:last-of-type {
        flex: unset;
        width: 28px;
        padding: 0;
      }

      .icon {
        height: 100%;
        width: 18px;
        background-position: center;
        background-repeat: no-repeat;
        background-size: contain;
      }

      .label {
        flex: 1;
      }

      .arrow {
        border: 4px solid transparent;

        &--up {
          border-bottom-color: var(--color);
          margin-bottom: 6px;
        }
        &--down {
          border-top-color: var(--color);
          margin-top: 2px;
        }
      }
    }
  }

  .linksWrapper {
    flex: 1;
    overflow: auto;
  }

  .footer {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    padding: 0px 20px 10px 20px;
    margin-top: 10px;

    .button {
      padding: 0px 8px;
      
      .icon {
        width: 32px;
        height: 100%;
        background-color: var(--color);
        mask-position: center;
        mask-repeat: no-repeat;
        mask-size: contain;
        -webkit-mask-position: center;
        -webkit-mask-repeat: no-repeat;
        -webkit-mask-size: contain;

        &--updateAndCheck {
          $maskUrl: '../assets/icons/update_and_check.svg';
          mask-image: url($maskUrl);
          -webkit-mask-image: url($maskUrl);
        }

        &--update {
          $maskUrl: '../assets/icons/update.svg';
          mask-image: url($maskUrl);
          -webkit-mask-image: url($maskUrl);
        }
      }
    }
  }
</style>
