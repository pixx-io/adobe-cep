<script>
  import { createEventDispatcher } from 'svelte';

  import { linkStatuses} from "../stores/general.js";

  export let link = null;
  export let isSelected = false;

  const dispatch = createEventDispatcher();

  const selectLink = (clickEvent) => {
    // only pixx.io links can be selected
    if (link.fileID) {
      dispatch('selectLink', {
        clickEvent,
        link
      });
    }
  };

  const doubleClickError = (clickEvent) => {
    if (link.fileID) {
      dispatch('doubleClickError', {
        clickEvent,
        link
      });
    }
  };

  const doubleClickWarning = (clickEvent) => {
    if (link.fileID) {
      dispatch('doubleClickWarning', {
        clickEvent,
        link
      });
    }
  };
</script>

<div
  class="linkWrapper"
  class:selected="{isSelected}"
  style="cursor: {link.fileID ? 'pointer' : 'not-allowed'}"
  on:click="{selectLink}"
>
  {#if link.fileID}
    <div class="isPixxioIndicator"></div>
  {:else}
    <div class="isPixxioIndicatorPlaceholder"></div>
  {/if}
  <div class="name">{link.name}</div>
  {#if link.status === $linkStatuses.LINK_MISSING}
    <div
      class="linkStatusIndicator linkStatusIndicator--error"
      on:click|stopPropagation="{e => null}"
      on:dblclick="{doubleClickError}"
    ></div>
  {:else if link.status === $linkStatuses.LINK_OUT_OF_DATE}
    <div
      class="linkStatusIndicator linkStatusIndicator--warning"
      on:click|stopPropagation="{e => null}"
      on:dblclick|stopPropagation="{doubleClickWarning}"
    ></div>
  {/if}
</div>

<style lang="scss">
  .linkWrapper {
    padding: 6px 20px;
    position: relative;
    display: flex;
    flex-direction: row;
    align-items: stretch;
    border-bottom: 1px solid rgba(var(--color-rgb), .1);
    position: relative;

    &.selected {
      background-color: rgba(var(--primary-color-rgb), .5);
    }

    .isPixxioIndicator {
      width: 18px;
      background: center / contain no-repeat url(../assets/icons/iconWhite.png);
    }
    .isPixxioIndicatorPlaceholder {
      width: 18px;
    }

    .name {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-left: 4px;
    }

    .linkStatusIndicator {
      width: 18px;
      margin-left: 8px;
      background-size: 30px;
      background-position: center;

      &--warning {
        background-image: url(../assets/icons/link_out_of_date.svg);
      }

      &--error {
        background-image: url(../assets/icons/link_missing.svg);
      }
    }
  }
</style>
