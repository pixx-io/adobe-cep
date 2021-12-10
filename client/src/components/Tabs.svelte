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

<div class="tab" transition:slide>
  {#each tabs as tab}
    <button
      class="tablinks {tab.name} {tab.class}"
      class:active="{activeTabName === tab.name}"
      data-tooltip={tab.label}
      on:click={() => changeTab(tab.name)}
    >
      <span class="label">{tab.label}</span>
    </button>
  {/each}
</div>

<style lang="scss">
  .tab {
    background-color: var(--background-color-inactive);
    display: flex;

    .tablinks {
      flex: 1;
      border: none;
      outline: none;
      cursor: pointer;
      padding: 14px 16px 18px 16px;
      margin: 0;
      color: var(--color-inactive);
      background-color: transparent;
      position: relative;

      &.active {
        color: var(--primary-color);
        background-color: var(--background-color);

        .label {
          opacity: 1;
        }
      }

      &:disabled {
        cursor: not-allowed;
      }

      &:hover {
        .label {
          opacity: 1;
        }
      }

      .label {
        opacity: 0;
        position: absolute;
        bottom: 4px;
        left: 0;
        font-size: 8px;
        width: 100%;
        font-family: 'Heebo';
        transition: opacity .3s ease;
      }
    }
  }
</style>
