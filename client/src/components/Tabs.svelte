<script>
  import { slide } from 'svelte/transition';

  export let activeTabName = null;
  export let tabs = [];

  function changeTab(tabName) {
    if (tabName !== activeTabName) {
      activeTabName = tabName;
    }
  }
</script>

<div class="tabsContainer" transition:slide>
  <div class="pixxioLogo"></div>
  {#each tabs as tab}
    <button
      class="tabLink {tab.name}"
      class:active="{activeTabName === tab.name}"
      on:click={() => changeTab(tab.name)}
    >
      <span class="tabIcon tabIcon--{tab.class}"></span>
      <span class="label">{tab.label}</span>
    </button>
  {/each}
</div>

<style lang="scss">
  .tabsContainer {
    background-color: var(--background-color-inactive);
    display: flex;

    .pixxioLogo {
      width: 48px;
      background: center no-repeat url(../assets/icons/iconWhite.png);
    }

    .tabLink {
      border: none;
      outline: none;
      cursor: pointer;
      padding: 10px;
      margin: 0;
      color: var(--color-inactive);
      background-color: transparent;
      display: flex;
      align-items: center;
      width: 48px;
      flex: unset;
      transition: flex .5s ease;

      &.active {
        flex: 1;
        color: var(--primary-color);
        background-color: var(--background-color);

        .tabIcon {
          background-color: var(--primary-color);
        }

        .label {
          margin-left: 8px;
        }
      }

      &:disabled {
        cursor: not-allowed;
      }

      .tabIcon {
        width: 32px;
        height: 100%;
        color: var(--primary-color);
        background-color: var(--color);
        mask-position: center;
        mask-repeat: no-repeat;
        mask-size: contain;
        -webkit-mask-position: center;
        -webkit-mask-repeat: no-repeat;
        -webkit-mask-size: contain;

        &--openDocument {
          $maskUrl: '../assets/icons/open_document.svg';
          mask-image: url($maskUrl);
          -webkit-mask-image: url($maskUrl);
        }

        &--placeFile {
          $maskUrl: '../assets/icons/place_file.svg';
          mask-image: url($maskUrl);
          -webkit-mask-image: url($maskUrl);
        }

        &--uploadDocument {
          $maskUrl: '../assets/icons/upload_document.svg';
          mask-image: url($maskUrl);
          -webkit-mask-image: url($maskUrl);
        }

        &--links {
          $maskUrl: '../assets/icons/link.svg';
          mask-image: url($maskUrl);
          -webkit-mask-image: url($maskUrl);
        }
      }

      .label {
        flex: 1;
        text-align: left;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 12px;
        font-family: 'Heebo';
        transition: margin .3s ease;
      }
    }
  }
</style>
