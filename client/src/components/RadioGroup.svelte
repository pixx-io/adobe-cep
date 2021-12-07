<script>
  export let options = [];
  export let activeOptionName = options.length ? options[0].name : null;

  function changeOption(option) {
    activeOptionName = option.name;
  }
</script>

<div class="radiosWrapper">
  {#each options as option}
    <label>
      <input
        class="radioOption {option.name}"
        class:active="{activeOptionName === option.name}"
        type="radio"
        name="radioOptions"
        value="{option}"
        checked="{activeOptionName === option.name}"
        on:click={() => changeOption(option)}
      >
      <span>{option.label}</span>
    </label>
  {/each}
</div>

<style lang="scss">
  .radiosWrapper {
    display: flex;
    flex-direction: column;
    margin-top: 10px;

    label {
      display: flex;
      flex-direction: row;
      align-items: center;
      padding: 10px 20px 10px 20px;
      cursor: pointer;

      input[type="radio"] {
        --size: 20px;
        width: var(--size);
        height: var(--size);
        margin: 0;
        cursor: pointer;

        &:after {
          content: "";
          position: relative;
          background-color: var(--background-color-inactive);
          display: inline-block;
          visibility: visible;
          width: var(--size);
          height: var(--size);
          border-radius: 4px;
          box-sizing: border-box;
        }

        &:checked:after {
          background-color: var(--primary-color);
          content: "\e913";
          font-family: "pixxioIcons";
          font-size: 20px;
          color: var(--background-color);
        }
      }

      span {
        flex: 1;
        margin-left: 10px;
      }
    }
  }
</style>
