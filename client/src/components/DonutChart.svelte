<script>
  import { onMount } from 'svelte';

  export let filledPercent = 0;

  let primaryColor = null;
  let canvas = null;
  let drawDount = null;
  let config = {
    numberOfParts: 2,
    parts:{"pt": [filledPercent , (100 - filledPercent)]},
    colors:{"cs": ['gray', "transparent"]},
    radius: 50,
    lineWidth: 8
  };
  
  $: if (filledPercent) {
    config.parts.pt[0] = filledPercent;
    if (drawDount) {
      drawDount.draw(config);
    }
  }

  onMount(() => {
    primaryColor = getComputedStyle(document.body).getPropertyValue('--primary-color').trim();
    if (primaryColor) {
      config.colors.cs[0] = primaryColor;
    }

    const chart = canvas.getContext("2d");

    function drawdountChart() {
      this.x , this.y , this.radius , this.lineWidth , this.strokeStyle , this.from , this.to = null;
      this.set = function( x, y, radius, from, to, lineWidth, strokeStyle) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.from=from;
        this.to= to;
        this.lineWidth = lineWidth;
        this.strokeStyle = strokeStyle; 
      }

      this.draw = function(data) {
        chart.clearRect(0, 0, canvas.width, canvas.height); 
        chart.beginPath();
        chart.lineWidth = this.lineWidth;
        chart.strokeStyle = this.strokeStyle;
        chart.arc(this.x , this.y , this.radius , this.from , this.to);
        chart.stroke();
        var numberOfParts = data.numberOfParts;
        var parts = data.parts.pt;
        var colors = data.colors.cs;
        var df = -(Math.PI / 2);
        for(var i = 0; i<numberOfParts; i++) {
          chart.beginPath();
          chart.strokeStyle = colors[i];
          chart.arc(this.x, this.y, this.radius, df, df + (Math.PI * 2) * (parts[i] / 100));
          chart.stroke();
          df += (Math.PI * 2) * (parts[i] / 100);
        }

        const fontSize = 16;
        chart.font = chart.font.replace(/\d+px/, fontSize + 'px');
        chart.fillStyle = colors[0];
        chart.textAlign = 'center';
        chart.fillText(parts[0] + '%', (canvas.width / 2), (canvas.height / 2) + (fontSize / 4));
      }
    }

    drawDount = new drawdountChart(chart);
    drawDount.set((
      config.radius + config.lineWidth),
      (config.radius + config.lineWidth),
      config.radius,
      0,
      Math.PI*2,
      config.lineWidth,
      "transparent"
    );
    drawDount.draw(config);
  });
</script>

<canvas
  width="120"
  height="120"
	bind:this={canvas}
></canvas>

<style lang="scss"></style>