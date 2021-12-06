<script>
  const fs = cep_node.require('fs');
  const http = cep_node.require('http');
  const https = cep_node.require('https');

  import { csInterface } from "./stores/general.js";

  export function loadJSX(scriptName) {
    var extensionRoot = $csInterface.getSystemPath(SystemPath.EXTENSION) + "/client/public/libs";
    runJsx('$.evalFile("' + extensionRoot + "/" + scriptName + '")');
  }

  export async function runJsx(command) {
    return new Promise((resolve, reject) => {
      $csInterface.evalScript(
        command,
        (evalScriptReturnValue) => {
          if (evalScriptReturnValue === EvalScript_ErrMessage) {
            runJsx('sendEvent("io.pixx.csxs.events.showError", "")');
            reject();
          } else {
            resolve(evalScriptReturnValue);
          }
        }
      );
    });
  }

  export async function download(url, filePath) {
    const protocol = !url.charAt(4).localeCompare("s") ? https : http;
    let totalSizeToDownload = 0;
    let currentDownloadedSize = 0;

    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(filePath);
      let fileInfo = null;

      const request = protocol.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
          return;
        }

        totalSizeToDownload = parseInt(response.headers["content-length"], 10);

        response.on("data", function (chunk) {
          currentDownloadedSize += chunk.length;
          const progressInPercent = Math.round(
            (currentDownloadedSize / totalSizeToDownload) * 100
          );
          runJsx('sendEvent("io.pixx.csxs.events.updateDownloadProgress", ' + progressInPercent + ')');
        });

        fileInfo = {
          mime: response.headers["content-type"],
          size: parseInt(response.headers["content-length"], 10),
        };

        response.pipe(file);
      });

      file.on("finish", () => {
        totalSizeToDownload = 0;
        currentDownloadedSize = 0;
        runJsx('sendEvent("io.pixx.csxs.events.updateDownloadProgress", 0)');
        resolve(fileInfo);
      });

      request.on("error", (err) => {
        fs.unlink(filePath, () => reject(err));
      });

      file.on("error", (err) => {
        fs.unlink(filePath, () => reject(err));
      });

      request.end();
    });
  }
</script>
