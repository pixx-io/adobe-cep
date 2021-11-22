<script>
    export let progress = 0;
</script>




<div class="progressTotal">
    <div
        class="progressCurrent"
        style="width: {progress}%;"
    ></div>
</div>

<style lang="scss">
    .progressTotal {
        height: 2px;
        background-color: var(--background-color);

        .progressCurrent {
            height: inherit;
            background-color: var(--highlight-color);
            transition: width .3s linear;
        }
    }
</style>