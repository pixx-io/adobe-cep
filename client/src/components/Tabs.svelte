<script>
  export let activeTabName = null;
  export let tabs = [];

  function changeTab(tabName) {
    if (tabName !== activeTabName) {
      activeTabName = tabName;
    }
  }
</script>

<div class="tab">
  {#each tabs as tab}
    <button
      class="tablinks {tab.name}"
      class:active="{activeTabName === tab.name}"
      on:click={() => changeTab(tab.name)}
    >{tab.label}</button>
  {/each}
</div>

<style lang="scss">
  .tab {
    background-color: var(--background-color-inactive);

    button {
      border: none;
      outline: none;
      cursor: pointer;
      padding: 14px 16px;
      margin: 0;
      color: var(--color-inactive);
      background-color: transparent;

      &.active {
        color: var(--color);
        font-weight: bold;
        background-color: var(--background-color);
      }

      &:disabled {
        cursor: not-allowed;
      }
    }
  }
</style>
