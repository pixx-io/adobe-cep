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
      class="tabLink {tab.name} {tab.class}"
      class:active="{activeTabName === tab.name}"
      on:click={() => changeTab(tab.name)}
    >
      <span class="label">{tab.label}</span>
    </button>
  {/each}
</div>

<style lang="scss">
  .tabsContainer {
    background-color: var(--background-color-inactive);
    display: flex;

    .pixxioLogo {
      display: none;
      width: 56px;
      background: center no-repeat url(../assets/icons/iconWhite.png);
    }

    .tabLink {
      border: none;
      outline: none;
      cursor: pointer;
      padding: 14px 16px 18px 16px;
      margin: 0;
      color: var(--color-inactive);
      background-color: transparent;
      display: flex;
      align-items: center;
      width: 56px;
      flex: unset;
      transition: flex .5s ease;

      &.active {
        flex: 1;
        color: var(--primary-color);
        background-color: var(--background-color);
      }

      &:disabled {
        cursor: not-allowed;
      }

      .label {
        width: 100%;
        text-align: left;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 12px;
        font-family: 'Heebo';
        margin-left: 8px;
      }
    }
  }

  @media (min-width: 380px) {
    .tabsContainer .pixxioLogo {
      display: block;
    }
  }
</style>
