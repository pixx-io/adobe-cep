import { readable, writable } from 'svelte/store';

export let csInterface = readable(new window.CSInterface);
export const pixxio = writable(null);
export const appDataFolder = writable(null);
export const applicationName = writable(null);
export const helper = writable(null);

/*
 * ENUMS
 */
export const applicationNames = readable({
  INDESIGN: 'Adobe InDesign',
  PHOTOSHOP: 'Adobe Photoshop'
});

export const linkStatuses = readable({
  LINK_EMBEDDED: 'LINK_EMBEDDED',
  LINK_INACCESSIBLE: 'LINK_INACCESSIBLE',
  LINK_MISSING: 'LINK_MISSING',
  LINK_OUT_OF_DATE: 'LINK_OUT_OF_DATE',
  LINK_NORMAL: 'LINK_NORMAL'
});

export const errorcodes = readable({
  // codes 10101 - 11801 specified in index.jsx
  OPEN_DOCUMENT_DOWNLOAD: 11901,
  PLACE_IMAGE_DOWNLOAD: 12001
});