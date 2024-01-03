const { shell, clipboard, BrowserWindow, ipcRenderer } = window.require('electron');
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
export default class Utiles {
    /** mac or windows */
    public static isMac: boolean = /macintosh|mac os x/i.test(navigator.userAgent);
    public static openMessageBox(s: string, call?: Function) {
        ipcRenderer.invoke('open-dialog', s).then((filePaths) => {
            console.log('Selected Paths:', s);
            if (call) call(filePaths);
            // Handle the selected paths as needed
        });
    }

    public static fileSize(file: any): any {
        const originalFileSize = fs.statSync(file).size;
        return originalFileSize;
    }

    // 替换文件
    public static async replaceFile(sourceFilePath: string, targetFilePath: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
          // 读取源文件内容
          fs.readFile(sourceFilePath, (readError, data) => {
            if (readError) {
              reject(readError);
              return;
            }
      
            // 写入目标文件
            fs.writeFile(targetFilePath, data, (writeError) => {
              if (writeError) {
                reject(writeError);
                return;
              }
      
              // 删除源文件
              fs.unlink(sourceFilePath, (unlinkError) => {
                if (unlinkError) {
                  reject(unlinkError);
                  return;
                }
      
                resolve();
              });
            });
          });
        });
      }

    public static getFfmpeg(): any {
        const url = path.join(__dirname, './ffmpeg');
        console.log('process.env.PATH', url);
        if ( process.env.NODE_ENV !== 'production') {
          // return '../../renderer/ffmpeg';
          return 'ffmpeg';
        } else {
          return url;
        }
        
        return 'ffmpeg';
        const appPath = app.getAppPath();
        const ffmpegPath = path.join(appPath, 'path', 'to', 'ffmpeg');
        return ffmpegPath;
    }
}
