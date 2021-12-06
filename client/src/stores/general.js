import { readable } from 'svelte/store';

export let csInterface = readable(new window.CSInterface);