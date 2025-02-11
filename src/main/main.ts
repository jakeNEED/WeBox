import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import * as path from 'path';
import * as url from 'url';
const fs = require('fs');

let mainWindow: Electron.BrowserWindow | null;
let isDialogHandlerRegistered = false;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 700,
        backgroundColor: '#2F384B',
        fullscreenable: false,
        frame: true,
        useContentSize: false,
        resizable: true,
        webPreferences: {
            nodeIntegration: true,
            backgroundThrottling: false,
            contextIsolation: false,
            devTools: true,
            // devTools: process.env.NODE_ENV === 'production',
            // devTools: process.env.NODE_ENV !== 'production',
            // devTools: process.env.NODE_ENV === 'development',

        },
    });
    // mainWindow.webContents.openDevTools();

    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:4000');
    } else {
        mainWindow.loadURL(
            url.format({
                pathname: path.join(__dirname, 'renderer/index.html'),
                protocol: 'file:',
                slashes: true,
            })
        );
    }
    if (!isDialogHandlerRegistered) {
      regHandle();
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function getAllImagesRecursively(dirPath: string) {
    let results: any = [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            // 如果是文件夹，继续递归
            results = results.concat(getAllImagesRecursively(fullPath));
        } else {
            // 只匹配常见图片后缀
            if (/\.(png|PNG|jpg|JPG|jpeg|JPEG)$/i.test(entry.name)) {
                results.push(fullPath);
            }
        }
    }
    return results;
}

function regHandle() {
    // 打开选择对话框 音频
    ipcMain.handle('open-dialog', async (e: any, data) => {
        // 用switch判断data是不是音频 还是图片
        console.log('===data====', data);
        // switch(data) {
        //     case 'sound'
        //       break
        // }
        if (data === 'sound') {
            try {
                const result = await dialog.showOpenDialog({
                    title: '选择保存目录',
                    properties: ['openFile', 'openDirectory', 'multiSelections'],
                    filters: [
                        { name: 'Audio files', extensions: ['mp3', 'wav'] },
                        { name: 'All files', extensions: ['*'] },
                    ],
                });
    
                let filePaths = result.filePaths;
    
                // If a directory is selected, retrieve all .mp3 and .wma files in the directory
                if (result.filePaths.length === 1 && fs.statSync(result.filePaths[0]).isDirectory()) {
                    filePaths = fs.readdirSync(result.filePaths[0]).filter((file: any) => {
                        return file.endsWith('.mp3') || file.endsWith('.wav');
                    });
    
                    filePaths = filePaths.map((file) => path.join(result.filePaths[0], file));
                }
    
                return filePaths;
            } catch (error) {
                console.error(error);
                return [];
            }
        } else if (data === 'image') {
            try {
                const result = await dialog.showOpenDialog({
                    title: '选择保存目录',
                    properties: ['openFile', 'openDirectory', 'multiSelections'],
                    filters: [
                        { name: 'Image files', extensions: ['png', 'PNG', 'jpg','JPG', 'jpeg', 'JPEG'] },
                        { name: 'All files', extensions: ['*'] },
                    ],
                });
    
                let filePaths = result.filePaths;
    
                // 2. 如果只选中1个且它是文件夹，则递归获取它下面所有子文件夹的图片
                if (result.filePaths.length === 1 && fs.statSync(result.filePaths[0]).isDirectory()) {
                    filePaths = getAllImagesRecursively(result.filePaths[0]);
                }
    
                return filePaths;
            } catch (error) {
                console.error(error);
                return [];
            }
        }
       
    });

    ipcMain.handle('open-directory-dialog', async () => {
        return dialog.showOpenDialog({
            properties: ['openDirectory']
        });
    });

    ipcMain.handle('open-file-dialog', async () => {
        return dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }]
        });
    });

    isDialogHandlerRegistered = true;
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On OS X it"s common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
});

// ipcMain.on('ondragstart',(event,file)=>{
//   event.sender.startDrag({
//       file:file,
//       icon:__dirname+'icon.png'
//   })
// })
