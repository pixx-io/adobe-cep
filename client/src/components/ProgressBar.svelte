<script>
    export let progress = 0;
    let isPending = false;

    $: {
      updatePending(progress);
    }

    function updatePending(progress) {
      isPending = progress === 'pending' ? true : false;
    }
</script>

<div class="progressTotal">
  {#if isPending}
    <div class="progressPending"></div>
  {:else}
    <div
        class="progressCurrent"
        style="width: {progress}%;"
    ></div>
  {/if}
</div>

<style lang="scss">
  @mixin pendingMixin($elementWidth) {
    animation-name: pending;
    animation-duration: 2s;
    animation-fill-mode: both;
    animation-timing-function: linear;
    animation-iteration-count: infinite;

    @keyframes pending {
      0%   { margin-left: $elementWidth * -1; }
      100% { margin-left: 100% }
    }
  }

  .progressTotal {
    height: 2px;
    background-color: var(--background-color);

    .progressCurrent,
    .progressPending {
      height: inherit;
      background-color: var(--primary-color);
    }

    .progressCurrent {
      transition: width .3s linear;
    }

    .progressPending {
      $elementWidth: 10%;
      width: $elementWidth;
      @include pendingMixin($elementWidth);
    }
  }
</style>