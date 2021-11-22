var themeManager = (function () {
    'use strict';
    var csInterface = new CSInterface();

    /* Convert the Color object to string in hexadecimal format; */
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

        switch (sentinelColor) {
            case 240: // Light Gray Theme code
                document.getElementById('theme').href = "./styles/themes/lightlight.css";
                break;
            case 184: // Mid Gray Theme code
                document.getElementById('theme').href = "./styles/themes/light.css";
                break;
            case 50: // Black Theme code
                document.getElementById('theme').href = "./styles/themes/darkdark.css";
                break;
            default: // Dark Gray Theme code
                document.getElementById('theme').href = "./styles/themes/dark.css";
                break;
        }

        const themeIsLight = sentinelColor > 128;
        const fontColor = (themeIsLight) ? { red: 51, green: 51, blue: 51 } : { red: 221, green: 221, blue: 221 };

        const styleId = "hostStyle";
        insertRule(styleId, "body", "--color: #" + toHex(fontColor));
        insertRule(styleId, "body", "--color-inactive: rgba(" + fontColor.red + ", " + fontColor.green + ", " + fontColor.blue + ", .5)");
        insertRule(styleId, "body", "--background-color: #" + toHex(appSkinInfo.panelBackgroundColor.color));
        insertRule(styleId, "body", "--highlight-color: #" + toHex(appSkinInfo.systemHighlightColor));
    }

    function onAppThemeColorChanged() {
        var appSkinInfo = csInterface.getHostEnvironment().appSkinInfo;
        updateThemeWithAppSkinInfo(appSkinInfo);
    }

    function init() {
        onAppThemeColorChanged();
        csInterface.addEventListener(CSInterface.THEME_COLOR_CHANGED_EVENT, onAppThemeColorChanged);
    }

    return {
        init: init
    };

}())