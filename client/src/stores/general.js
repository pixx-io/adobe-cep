import { readable, writable } from 'svelte/store';

export let csInterface = readable(new window.CSInterface);
export const pixxio = writable(null);