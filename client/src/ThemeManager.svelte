<script>
    import {csInterface} from "./stores/general.js";

    export function init() {
        onAppThemeColorChanged();
        $csInterface.addEventListener(CSInterface.THEME_COLOR_CHANGED_EVENT, onAppThemeColorChanged);
    }

    function toHex(color, delta) {
        function computeValue(value, delta) {
            var computedValue = !isNaN(delta) ? value + delta : value;
            if (computedValue < 0) {
                computedValue = 0;
            } else if (computedValue > 255) {
                computedValue = 255;
            }
            computedValue = Math.floor(computedValue);
            computedValue = computedValue.toString(16);
            return computedValue.length === 1 ? "0" + computedValue : computedValue;
        }
        var hex = "";
        if (color) {
            hex = computeValue(color.red, delta) + computeValue(color.green, delta) + computeValue(color.blue, delta);
        }
        return hex;
    }

    function hexToRgb(hex) {
      var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        red: parseInt(result[1], 16),
        green: parseInt(result[2], 16),
        blue: parseInt(result[3], 16)
      } : null;
    }

    function insertRule(stylesheetId, selector, rule) {
        var stylesheet = document.getElementById(stylesheetId);
        if (stylesheet) {
            stylesheet = stylesheet.sheet;
            stylesheet.insertRule(selector + ' { ' + rule + ' }', stylesheet.cssRules.length);
        }
    }

    /* Update the theme with the AppSkinInfo retrieved from the host product. */
    function updateThemeWithAppSkinInfo(appSkinInfo) {
        const sentinelColor = appSkinInfo.panelBackgroundColor.color.red;

        const themeIsLight = sentinelColor > 128;
        const fontColor = (themeIsLight) ? { red: 51, green: 51, blue: 51 } : { red: 221, green: 221, blue: 221 };

        const pixxioPrimaryColor = '#00628D';
        const pixxioSecondaryColor = '#64D3CA';

        const primaryColorHex = themeIsLight ? pixxioPrimaryColor : pixxioSecondaryColor;
        const secondaryColorHex = themeIsLight ? pixxioSecondaryColor : pixxioPrimaryColor;
        const primaryColorRGB = hexToRgb(primaryColorHex);
        const secondaryColorRGB = hexToRgb(secondaryColorHex);

        const styleId = "hostStyle";
        insertRule(styleId, "body", "--color: #" + toHex(fontColor));
        insertRule(styleId, "body", "--color-rgb: " + fontColor.red + ', ' + fontColor.green + ', ' + fontColor.blue);
        insertRule(styleId, "body", "--color-inactive: rgba(" + fontColor.red + ", " + fontColor.green + ", " + fontColor.blue + ", .5)");
        insertRule(styleId, "body", "--background-color: #" + toHex(appSkinInfo.panelBackgroundColor.color));
        insertRule(styleId, "body", "--highlight-color: #" + toHex(appSkinInfo.systemHighlightColor));
        insertRule(styleId, "body", "--primary-color: " + primaryColorHex);
        insertRule(styleId, "body", "--primary-color-rgb: " + primaryColorRGB.red + ', ' + primaryColorRGB.green + ', ' + primaryColorRGB.blue);
        insertRule(styleId, "body", "--secondary-color: " + secondaryColorHex);
        insertRule(styleId, "body", "--secondary-color-rgb: " + secondaryColorRGB.red + ', ' + secondaryColorRGB.green + ', ' + secondaryColorRGB.blue);

        switch (sentinelColor) {
            case 240: // Light Gray Theme code
                insertRule(styleId, "body", "--background-color-inactive: rgb(219, 219, 219)");
                break;
            case 184: // Mid Gray Theme code
                insertRule(styleId, "body", "--background-color-inactive: rgb(163, 163, 163)");
                break;
            case 50: // Black Theme code
                insertRule(styleId, "body", "--background-color-inactive: rgb(38, 38, 38)");
                break;
            default: // Dark Gray Theme code
                insertRule(styleId, "body", "--background-color-inactive: rgb(66, 66, 66)");
                break;
        }
    }

    function onAppThemeColorChanged() {
        var appSkinInfo = $csInterface.getHostEnvironment().appSkinInfo;
        updateThemeWithAppSkinInfo(appSkinInfo);
    }
</script>