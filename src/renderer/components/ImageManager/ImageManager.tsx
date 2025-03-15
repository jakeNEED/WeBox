import { Grid } from '@mui/material';
import React, { useRef, useState } from 'react';
import Slider from '@mui/material/Slider';
import Box from '@mui/material/Box';
import { alpha, styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import Container from '@mui/material/Container';
import LinearProgress from '@mui/material/LinearProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Slide from '@mui/material/Slide';
import { TransitionProps } from '@mui/material/transitions';
import ErrorIcon from '@mui/icons-material/Error';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import Utiles from '../../../main/Utiles/Utiles';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import ShellUtil from '../../../lib/ShellUtil';
import CircularProgress, { CircularProgressProps } from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import path from 'path';
import CompressIcon from '@mui/icons-material/Compress';

import FileUploader from '../FileUploader';
// import sharp from 'sharp';
const sharp = window.require('sharp');


const Transition = React.forwardRef(function Transition(
    props: TransitionProps & {
        children: React.ReactElement<any, any>;
    },
    ref: React.Ref<unknown>
) {
    return <Slide direction="up" ref={ref} {...props} />;
});
// 虚拟列表内容
function CircularProgressWithLabel(props: CircularProgressProps & { value: number }) {
    return (
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <CircularProgress
                variant="determinate"
                sx={{
                    width: 300, // Set the width
                    height: 300, // Set the height
                    color: '#42b983', // Set the color
                }}
                {...props}
            />
            <Box
                sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                <Typography variant="caption" component="div" sx={{ color: '#42b983', fontWeight: 'bold' }}>
                    {`${Math.round(props.value)}%`}
                </Typography>
            </Box>
        </Box>
    );
}

// TinyPNG API keys，免费压缩次数为5000次
const TINYPNG_API_KEYS = [
    'c2PJ9FTwxNQhpvqPgNcNnJ8Xt0wPvfr0',   // key1
    'JB6xd1KMmfLlNWS1s98wGFsH4K9hMGWZ',   // key2
    'b0lYhNNR3L7763YqSkyDVK9RXvscyRwL',   // key2
    '2Wr6ppH1CL5fXt953N2D9hV7TmkCVk19',   // key2
    'h6fd7ZGHT2HXVC20MH9gFG3cGmvsfZ4x',   // key2
    'J2k8c2kRzzZ5wbNKQ9mv9RD1TvS2gVjf',   // key2
    'VMssgPBsznFpB6Yg9fVR1yTgTkCtKQd0',   // key2
    'qVPTGL9c4TfqhyZfDxj8dYHmRH4MBxxh',   // key2
    'bKVhxL4lklnfRbv2CYJbtfKsFfFS9stX',   // key2
    'Qft6z8SjbMGJsgFvFrsYtjdY2PgbXFy3',   // key2
];

let currentKeyIndex = 0;
const KEY_USAGE_KEY = 'tinypng_key_usage';

interface KeyUsage {
    keyIndex: number;
    usageCount: number;
    lastResetMonth: number;
}

interface KeyUsageDisplay {
    currentKeyIndex: number;
    remainingCount: number;
    totalRemaining: number;
}

// 获取和更新key使用情况
function getKeyUsage(): KeyUsage {
    const usage = localStorage.getItem(KEY_USAGE_KEY);
    if (usage) {
        return JSON.parse(usage);
    }
    return { keyIndex: 0, usageCount: 0, lastResetMonth: new Date().getMonth() };
}

function updateKeyUsage(usage: KeyUsage) {
    localStorage.setItem(KEY_USAGE_KEY, JSON.stringify(usage));
}

// 获取下一个可用的API key
async function getNextApiKey(): Promise<string | null> {
    let usage = getKeyUsage();
    const currentMonth = new Date().getMonth();

    // 检查是否需要重置计数器（新月份）
    if (currentMonth !== usage.lastResetMonth) {
        usage = { keyIndex: 0, usageCount: 0, lastResetMonth: currentMonth };
    }

    // 尝试所有key
    for (let i = 0; i < TINYPNG_API_KEYS.length; i++) {
        const keyIndex = (usage.keyIndex + i) % TINYPNG_API_KEYS.length;
        if (keyIndex === usage.keyIndex && usage.usageCount >= 500) {
            continue; // 当前key已用完
        }
        
        usage.keyIndex = keyIndex;
        if (keyIndex === usage.keyIndex) {
            usage.usageCount++;
        } else {
            usage.usageCount = 1;
        }
        
        updateKeyUsage(usage);
        return TINYPNG_API_KEYS[keyIndex];
    }

    return null; // 所有key都已用完
}

// 获取当前使用情况的显示信息
function getKeyUsageDisplay(): KeyUsageDisplay {
    const usage = getKeyUsage();
    const remainingCount = 500 - usage.usageCount;
    const totalRemaining = (TINYPNG_API_KEYS.length * 500) - 
        (usage.keyIndex * 500 + usage.usageCount);
    
    return {
        currentKeyIndex: usage.keyIndex + 1,
        remainingCount,
        totalRemaining
    };
}

// 添加网络检查函数
const checkNetwork = async () => {
    try {
        const https = window.require('https');
        return new Promise((resolve) => {
            const req = https.get('https://api.tinify.com', (res: any) => {
                resolve(true);
            });
            req.on('error', () => {
                resolve(false);
            });
            req.end();
        });
    } catch (error) {
        return false;
    }
};

// 修改压缩函数，添加重试逻辑
async function compressImage(inputFile: string, outputFile: string, retryCount = 0): Promise<void> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2秒延迟

    try {
        // 检查网络连接
        const isNetworkAvailable = await checkNetwork();
        if (!isNetworkAvailable) {
            throw new Error('网络连接失败，请检查网络后重试');
        }

        const apiKey = await getNextApiKey();
        if (!apiKey) {
            throw new Error('所有API key的本月免费压缩次数已用完！');
        }

        const https = window.require('https');

        return new Promise((resolve, reject) => {
            try {
                const inputBuffer = Utiles.readFileSync(inputFile);
                
                const options = {
                    hostname: 'api.tinify.com',
                    path: '/shrink',
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    timeout: 30000 // 增加超时时间到30秒
                };

                const req = https.request(options, (res: any) => {
                    let data = '';
                    
                    res.on('data', (chunk: any) => {
                        data += chunk;
                    });

                    res.on('end', () => {
                        if (res.statusCode === 201) {
                            const response = JSON.parse(data);
                            
                            // 下载压缩后的图片
                            https.get(response.output.url, (res: any) => {
                                const chunks: any[] = [];
                                
                                res.on('data', (chunk: any) => {
                                    chunks.push(chunk);
                                });

                                res.on('end', () => {
                                    const compressedBuffer = Buffer.concat(chunks);
                                    Utiles.writeFileSyncBuffer(outputFile, compressedBuffer);
                                    resolve();
                                });
                            }).on('error', async (error: any) => {
                                if (retryCount < MAX_RETRIES) {
                                    console.log(`重试第 ${retryCount + 1} 次...`);
                                    await new Promise(r => setTimeout(r, RETRY_DELAY));
                                    resolve(compressImage(inputFile, outputFile, retryCount + 1));
                                } else {
                                    reject(error);
                                }
                            });
                        } else {
                            const error = JSON.parse(data);
                            reject(new Error(error.message || '压缩失败'));
                        }
                    });
                });

                req.on('error', async (error: any) => {
                    if (retryCount < MAX_RETRIES) {
                        console.log(`重试第 ${retryCount + 1} 次...`);
                        await new Promise(r => setTimeout(r, RETRY_DELAY));
                        resolve(compressImage(inputFile, outputFile, retryCount + 1));
                    } else {
                        reject(error);
                    }
                });

                req.write(inputBuffer);
                req.end();

            } catch (error) {
                reject(error);
            }
        });
    } catch (error) {
        if (retryCount < MAX_RETRIES) {
            console.log(`重试第 ${retryCount + 1} 次...`);
            await new Promise(r => setTimeout(r, RETRY_DELAY));
            return compressImage(inputFile, outputFile, retryCount + 1);
        }
        throw error;
    }
}

// 添加文件大小格式化函数
function formatFileSize(sizeInKB: number): string {
    if (sizeInKB >= 1024) {
        return `${(sizeInKB / 1024).toFixed(2)}MB`;
    }
    return `${sizeInKB}KB`;
}

// 添加并发控制参数
const MAX_CONCURRENT = 3;  // 最大并发数

// 添加拖拽区域样式
const DropZone = styled('div')(({ theme }) => ({
    width: '100%',
    height: '350px',
    border: '2px dashed #402649',
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14161D',
    transition: 'all 0.3s ease',
    '&.dragover': {
        borderColor: '#42b983',
        backgroundColor: 'rgba(66, 185, 131, 0.1)',
    }
}));

// 添加错误状态类型
interface FileProgress {
    progress: number;
    status: 'pending' | 'success' | 'fail';
    error?: string;
    originalSize?: number;  // 原始大小 (KB)
    compressedSize?: number;  // 压缩后大小 (KB)
}

// 添加旋转进度条组件
const CircularBorderProgress = () => {
    return (
        <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 10,
        }}>
            {/* 顶部边框 */}
            <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '2px',
                overflow: 'hidden',
            }}>
                <Box sx={{
                    position: 'absolute',
                    width: '30%',
                    height: '100%',
                    background: 'linear-gradient(90deg, rgba(194, 48, 153, 0) 0%, rgba(194, 48, 153, 1) 50%, rgba(194, 48, 153, 0) 100%)',
                    animation: 'moveRightToLeft 1.2s infinite ease-in-out',
                    boxShadow: '0 0 8px rgba(194, 48, 153, 0.8)',
                    '@keyframes moveRightToLeft': {
                        '0%': { left: '-30%' },
                        '100%': { left: '100%' }
                    }
                }} />
            </Box>

            {/* 右侧边框 */}
            <Box sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '2px',
                height: '100%',
                overflow: 'hidden',
            }}>
                <Box sx={{
                    position: 'absolute',
                    width: '100%',
                    height: '30%',
                    background: 'linear-gradient(180deg, rgba(194, 48, 153, 0) 0%, rgba(194, 48, 153, 1) 50%, rgba(194, 48, 153, 0) 100%)',
                    animation: 'moveTopToBottom 1.2s infinite ease-in-out',
                    boxShadow: '0 0 8px rgba(194, 48, 153, 0.8)',
                    animationDelay: '0.3s',
                    '@keyframes moveTopToBottom': {
                        '0%': { top: '-30%' },
                        '100%': { top: '100%' }
                    }
                }} />
            </Box>

            {/* 底部边框 */}
            <Box sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '100%',
                height: '2px',
                overflow: 'hidden',
            }}>
                <Box sx={{
                    position: 'absolute',
                    width: '30%',
                    height: '100%',
                    background: 'linear-gradient(90deg, rgba(194, 48, 153, 0) 0%, rgba(194, 48, 153, 1) 50%, rgba(194, 48, 153, 0) 100%)',
                    animation: 'moveLeftToRight 1.2s infinite ease-in-out',
                    boxShadow: '0 0 8px rgba(194, 48, 153, 0.8)',
                    animationDelay: '0.6s',
                    '@keyframes moveLeftToRight': {
                        '0%': { right: '-30%' },
                        '100%': { right: '100%' }
                    }
                }} />
            </Box>

            {/* 左侧边框 */}
            <Box sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '2px',
                height: '100%',
                overflow: 'hidden',
            }}>
                <Box sx={{
                    position: 'absolute',
                    width: '100%',
                    height: '30%',
                    background: 'linear-gradient(180deg, rgba(194, 48, 153, 0) 0%, rgba(194, 48, 153, 1) 50%, rgba(194, 48, 153, 0) 100%)',
                    animation: 'moveBottomToTop 1.2s infinite ease-in-out',
                    boxShadow: '0 0 8px rgba(194, 48, 153, 0.8)',
                    animationDelay: '0.9s',
                    '@keyframes moveBottomToTop': {
                        '0%': { bottom: '-30%' },
                        '100%': { bottom: '100%' }
                    }
                }} />
            </Box>
        </Box>
    );
};

// 添加闪光按钮组件
const GlowingButton = styled(Button)(({ theme }) => ({
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: '#42b983',
  borderRadius: '8px',
  padding: '10px 30px',
  transition: 'all 0.3s ease',
  boxShadow: '0 0 15px rgba(66, 185, 131, 0.5)',
  '&:hover': {
    backgroundColor: '#3da876',
    transform: 'translateY(-2px)',
    boxShadow: '0 0 20px rgba(66, 185, 131, 0.7)',
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: 'linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%)',
    transform: 'rotate(30deg)',
    animation: 'glowingEffect 3s infinite',
  },
  '@keyframes glowingEffect': {
    '0%': {
      transform: 'rotate(30deg) translateX(-300%)',
    },
    '100%': {
      transform: 'rotate(30deg) translateX(300%)',
    },
  },
}));

export default function App(): JSX.Element {
    let fileSum = 0;
    let filesSizeSum = 0;
    let curFilesSizeSum = 0;
    // 声明一个 reduceRate 状态并初始化为 90
    const [reduceRate, setReduceRate] = useState(80);
    // 总进度
    const [progress, setProgress] = useState<number>(0);

    const [selectFilePath, setselectFilePath] = useState('~');
    const [animation, setAnimation] = useState(false);
    const [showButton, setShowButton] = useState(true);
    // 对话框
    const [open, setOpen] = React.useState(false);
    const [openTitle, setTitle] = React.useState('文件错误');
    const [openContent, setContent] = React.useState('文件错误');
    const [selectedFiles, setSelectedFiles] = useState<Array<string> | null>(null);
    const [selectedFilesProgress, setselectedFilesProgress] = useState<FileProgress[]>([]);
    const [keyUsage, setKeyUsage] = useState<KeyUsageDisplay>(getKeyUsageDisplay());
    const [completedCount, setCompletedCount] = useState(0);  // 添加完成计数状态
    const [isDragging, setIsDragging] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);  // 存储错误信息

    const handleFileChange = (event: any) => {
        // eslint-disable-next-line no-console
        Utiles.openMessageBox('image', (files: any) => {
            if (files === undefined || files.length <= 0) {
                // 报错
                // setOpen(true);
                setselectFilePath('~');
                setSelectedFiles(null);
            } else {
                // 选择音频文件
                const progress: Array<number> = [];
                    for (let i = 0; i < files.length; i++) {
                    progress.push(0);
                    }
                fileSum = progress.length;
                setselectedFilesProgress(progress.map(p => ({ progress: p, status: 'pending' })));

                    setSelectedFiles(files);
                    setselectFilePath(files[0].slice(0, 30));
            }
        });
    };
    const setStartReduceState = () => {
        setAnimation(true);
        setShowButton(false);
        setProgress(0);
    };
    const endStartReduceState = () => {
        setAnimation(false);
        setShowButton(true);
        setProgress(0);
        filesSizeSum = 0;
        curFilesSizeSum = 0;
    };
    // 开始压缩
    const handleUploadClick = async () => {
        if (selectedFiles) {
            setStartReduceState();
            setCompletedCount(0);  // 重置完成计数
            updateKeyUsageDisplay();
            selectedFiles.forEach((f: any): void => {
                filesSizeSum += Math.floor(Utiles.fileSize(f) / 1024);
            });
            await processFilesSequentially(selectedFiles, 0);
        } else {
            openAlert('文件错误', '当前文件不存在，请选择正确的文件夹或文件');
        }
    };

    const openAlert = (title: string, content: string) => {
        setTitle(title);
        setContent(content);
        setOpen(true);
    };

    // 修改处理文件的函数
    const processFilesSequentially = async (files: string[], index: number): Promise<void> => {
        if (index >= files.length) {
            console.log('All files processed');
            // 如果有错误，在所有文件处理完后显示
            if (errors.length > 0) {
                openAlert('压缩警告', `${errors.length}个文件压缩失败:\n${errors.join('\n')}`);
            }
            openAlert(
                '图片压缩',
                `所有图片处理完成，请检查文件。\n\n` + 
                `原文件大小${formatFileSize(filesSizeSum)},` +
                `现在文件大小${formatFileSize(curFilesSizeSum)}kb\n` +
                `共节省了${100 - Math.ceil((curFilesSizeSum / filesSizeSum) * 100)}%空间`
            );
            setTimeout(() => {
                endStartReduceState();
            }, 10);
            return;
        }

        const tasks: Promise<void>[] = [];
        for (let i = 0; i < MAX_CONCURRENT && index + i < files.length; i++) {
            const currentIndex = index + i;
            const file = files[currentIndex];
            const tmpOutputFile = file.replace(/\.(jpg|jpeg|png|JPG|JPEG|PNG)$/i, '_temp$&');

            // 获取原始文件大小
            const originalSize = Math.floor(Utiles.fileSize(file) / 1024);
            
            // 更新文件大小信息
            setselectedFilesProgress((prevProgress) => {
                const newProgress = [...prevProgress];
                newProgress[currentIndex] = { 
                    ...newProgress[currentIndex],
                    progress: 0, 
                    originalSize 
                };
                return newProgress;
            });

            const task = (async () => {
                try {
                    await compressImage(file, tmpOutputFile);
                    updateKeyUsageDisplay();
                    
                    // 获取压缩后文件大小
                    const compressedSize = Math.floor(Utiles.fileSize(tmpOutputFile) / 1024);
                    curFilesSizeSum += compressedSize;
            await Utiles.replaceFile(tmpOutputFile, file);

                    setselectedFilesProgress((prevProgress) => {
                        const newProgress = [...prevProgress];
                        newProgress[currentIndex] = { 
                            progress: 100, 
                            status: 'success',
                            originalSize,
                            compressedSize
                        };
                        return newProgress;
                    });

                    setCompletedCount(prev => {
                        const newCount = prev + 1;
                        const totalProgress = Math.ceil((newCount / files.length) * 100);
            setProgress(totalProgress);
                        return newCount;
                    });

                } catch (error: any) {
            console.error('Error:', error);
                    setselectedFilesProgress((prevProgress) => {
                        const newProgress = [...prevProgress];
                        newProgress[currentIndex] = { 
                            progress: 100, 
                            status: 'fail',
                            error: error.message,
                            originalSize
                        };
                        return newProgress;
                    });
                    setErrors(prev => [...prev, `${path.basename(file)}: ${error.message}`]);
                }
            })();

            tasks.push(task);
        }

        await Promise.all(tasks);
        await processFilesSequentially(files, index + MAX_CONCURRENT);
    };

    const handleClose = () => {
        setOpen(false);
    };

    // 修改 valuetext 函数，使用 reduceRate 来更新文本
    function valuetext(value: number) {
        return `${value}%`;
    }
    const handleSliderChange = (event: Event, value: number | number[]) => {
        setReduceRate(value as number);
    };

    function selectFile(path: string) {
        setselectFilePath(path);
    }

    // 需要压缩的资源
    function renderRow(props: ListChildComponentProps) {
        const { index, style } = props;
        const fileProgress = selectedFilesProgress?.[index] || { 
            progress: 0, 
            status: 'pending',
            originalSize: 0,
            compressedSize: 0
        };
        
        // 格式化文件大小
        const formatSize = (size?: number) => {
            if (size === undefined || size === null) return '0KB';
            return size >= 1024 ? `${(size / 1024).toFixed(1)}MB` : `${size}KB`;
        };
        
        // 计算压缩比例
        const getCompressionRate = () => {
            if (!fileProgress.originalSize || !fileProgress.compressedSize || fileProgress.status !== 'success') {
                return '0%';
            }
            const rate = Math.round((fileProgress.compressedSize - fileProgress.originalSize) / fileProgress.originalSize * 100);
            return `${rate}%`;
        };
        
        // 获取文件名
        const getFileName = (filePath: string) => {
            return path.basename(filePath);
        };

        // 获取行背景色
        const getRowBackground = (index: number, status: string) => {
            // 基础颜色
            const baseColor = index % 2 === 0 ? 
                'linear-gradient(90deg, rgba(32, 34, 45, 0.7) 0%, rgba(26, 29, 36, 0.7) 100%)' : 
                'linear-gradient(90deg, rgba(26, 29, 36, 0.7) 0%, rgba(22, 25, 31, 0.7) 100%)';
            
            // 根据状态添加额外的颜色
            if (status === 'success') {
                return `${baseColor}, linear-gradient(90deg, rgba(66, 185, 131, 0.05) 0%, rgba(66, 185, 131, 0.1) 100%)`;
            } else if (status === 'fail') {
                return `${baseColor}, linear-gradient(90deg, rgba(255, 77, 79, 0.05) 0%, rgba(255, 77, 79, 0.1) 100%)`;
            }
            
            return baseColor;
        };

        return (
            <ListItem 
                        style={{
                    ...style,
                    margin: '2px 0',
                    transition: 'all 0.2s ease',
                    borderLeft: fileProgress.status === 'success' ? '3px solid #42b983' : 
                               fileProgress.status === 'fail' ? '3px solid #ff4d4f' : 
                               '3px solid transparent',
                }} 
                sx={{
                    background: getRowBackground(index, fileProgress.status),
                    borderRadius: '4px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    '&:hover': {
                        background: 'linear-gradient(90deg, rgba(64, 38, 73, 0.2) 0%, rgba(64, 38, 73, 0.3) 100%)',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                    }
                }}
                key={index} 
                component="div" 
                disablePadding
            >
                <ListItemButton sx={{ padding: '4px 8px' }}>
                    <Grid container alignItems="center" spacing={1}>
                        {/* 序号 */}
                        <Grid item xs={0.5}>
                            <Typography sx={{ fontSize: '12px', color: '#C18BC9' }}>
                                {index + 1}.
                            </Typography>
                        </Grid>
                        
                        {/* 文件名 */}
                        <Grid item xs={4.5}>
                            <Typography 
                                noWrap 
                                sx={{ 
                            fontSize: '12px',
                            color: '#C23099',
                                    textOverflow: 'ellipsis'
                                }}
                            >
                                {selectedFiles ? getFileName(selectedFiles[index]) : ''}
                            </Typography>
                        </Grid>
                        
                        {/* 原始大小 */}
                        <Grid item xs={1.5}>
                            <Typography sx={{ fontSize: '12px', color: '#8b8b8b' }}>
                                {formatSize(fileProgress.originalSize)}
                            </Typography>
                        </Grid>
                        
                        {/* 进度条 */}
                        <Grid item xs={2.5}>
                    <LinearProgress
                        variant="determinate"
                                value={fileProgress.progress}
                        sx={{
                                    width: '100%',
                            height: 4,
                            borderRadius: 2,
                                    bgcolor: 'rgba(64, 38, 73, 0.3)',
                            '& .MuiLinearProgress-bar': {
                                        bgcolor: fileProgress.status === 'fail' ? '#ff4d4f' : 
                                               fileProgress.status === 'success' ? '#42b983' : '#C23099',
                                        boxShadow: fileProgress.status === 'success' ? '0 0 5px rgba(66, 185, 131, 0.5)' : 
                                                  fileProgress.status === 'fail' ? '0 0 5px rgba(255, 77, 79, 0.5)' : 
                                                  '0 0 5px rgba(194, 48, 153, 0.5)',
                            },
                        }}
                    />
                        </Grid>
                        
                        {/* 压缩后大小 */}
                        <Grid item xs={1.5}>
                            <Typography sx={{ 
                                fontSize: '12px', 
                                color: fileProgress.status === 'success' ? '#42b983' : '#8b8b8b',
                                fontWeight: fileProgress.status === 'success' ? 'bold' : 'normal'
                            }}>
                                {fileProgress.status === 'success' ? formatSize(fileProgress.compressedSize) : '0KB'}
                            </Typography>
                        </Grid>
                        
                        {/* 压缩比例 */}
                        <Grid item xs={1.5}>
                            <Typography sx={{ 
                                fontSize: '12px', 
                                color: fileProgress.status === 'success' ? '#42b983' : 
                                      fileProgress.status === 'fail' ? '#ff4d4f' : '#8b8b8b',
                                fontWeight: 'bold'
                            }}>
                                {fileProgress.status === 'success' ? getCompressionRate() : 
                                 fileProgress.status === 'fail' ? 'FAIL' : '0%'}
                            </Typography>
                        </Grid>
                    </Grid>
                </ListItemButton>
            </ListItem>
        );
    }
    const CustomizedScrollbarBox = styled(Box)`
        /* Customize the right-hand scrollbar styles */
        & > div::-webkit-scrollbar {
            width: 5px;
        }

        & > div::-webkit-scrollbar-track {
            background-color: #27192c;
        }

        & > div::-webkit-scrollbar-thumb {
            background-color: #402649;
            border-radius: 6px;
        }

        & > div::-webkit-scrollbar-thumb:hover {
            background-color: #c23099;
        }
    `;

    // 更新显示信息的函数
    const updateKeyUsageDisplay = () => {
        setKeyUsage(getKeyUsageDisplay());
    };

    // 处理拖拽文件
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const items = Array.from(e.dataTransfer.items);
        const files = Array.from(e.dataTransfer.files);  // 需要这个来处理直接拖拽的文件
        if (!items.length && !files.length) return;

        const imageFiles = new Set<string>();

        // 处理直接拖拽的文件
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                imageFiles.add(file.path);
            }
        }

        // 处理文件夹和文件系统项
        const getAllFiles = async (entry: any): Promise<void> => {
            if (!entry) return;
            
            if (entry.isFile) {
                const file = await new Promise<File>((resolve) => {
                    entry.file(resolve);
                });
                if (file.type.startsWith('image/')) {
                    imageFiles.add(file.path);
                }
            } else if (entry.isDirectory) {
                const reader = entry.createReader();
                const entries = await new Promise<any[]>((resolve) => {
                    reader.readEntries(resolve);
                });
                
                for (const subEntry of entries) {
                    await getAllFiles(subEntry);
                }
            }
        };

        // 处理所有拖入的项目
        for (const item of items) {
            const entry = item.webkitGetAsEntry?.();
            if (entry) {
                await getAllFiles(entry);
            }
        }

        const uniqueFiles = Array.from(imageFiles);
        if (uniqueFiles.length > 0) {
            const progress: Array<number> = new Array(uniqueFiles.length).fill(0);
            setselectedFilesProgress(progress.map(p => ({ progress: p, status: 'pending' })));
            setSelectedFiles(uniqueFiles);
            
            // 设置路径显示
            let displayPath = path.dirname(uniqueFiles[0]);
            
            // 处理长路径
            const maxLength = 50;
            if (displayPath.length > maxLength) {
                const start = displayPath.slice(0, 20);
                const end = displayPath.slice(-30);
                displayPath = `${start}...${end}`;
            }
            
            setselectFilePath(displayPath);
        }
    };

    // 拖拽事件处理
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    return (
        <Container fixed sx={{
                border: '2px solid #402649',
                bgcolor: '#14161D',
                width: '100%',
                height: '550',
            position: 'relative',  // 添加相对定位
        }}>
            {/* 添加旋转进度条 */}
            {animation && <CircularBorderProgress />}

            {/* API使用情况显示 */}
            <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '20px',
                marginTop: '10px',
                marginBottom: '-30px',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#C18BC9',
                paddingRight: '80px',
            }}>
                <span>
                    当前key: <span style={{ color: '#42b983' }}>{keyUsage.currentKeyIndex}/{TINYPNG_API_KEYS.length}</span>
                </span>
                <span>
                    剩余次数: <span style={{ color: '#42b983' }}>{keyUsage.remainingCount}</span>
                </span>
                <span>
                    总剩余: <span style={{ color: '#42b983' }}>{keyUsage.totalRemaining}</span>
                </span>
            </div>

            <div style={{
                display: 'flex',  // 改为flex布局
                alignItems: 'center',  // 垂直居中对齐
                gap: '20px',  // 元素之间的间距
                    position: 'relative',
                    height: '100px',
                top: '0px',
            }}>
                <FileUploader onFileChange={handleFileChange} />
                {/* 目录框 */}
                <Container fixed sx={{
                    // display: 'inline-block',
                        border: '2px solid #402649',
                        bgcolor: '#14161D',
                        width: '400px',
                    height: '36px',  // 调整高度以匹配按钮
                    overflow: 'hidden',
                    display: 'flex',  // 使用flex布局
                    alignItems: 'center',  // 垂直居中
                    padding: '0 15px',  // 添加内边距
                }}>
                    <label
                        style={{
                            color: '#C18BC9',
                            fontWeight: 'bold',
                            marginRight: '8px',  // 添加右边距
                        }}>
                        目录:
                    </label>
                    <label 
                        style={{ 
                            color: '#C23099',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: 'calc(100% - 50px)',  // 减去"目录:"的宽度
                            flex: 1,  // 占据剩余空间
                        }}
                    > 
                        {selectFilePath}
                    </label>
                </Container>
            </div>

            <div style={{ color: '#C18BC9', fontWeight: 'bold' }}>
                <div style={{ display: 'inline-block' }}>
                    <label> 压缩比率: </label>
                    <label style={{ color: '#C23099' }}>{reduceRate}%</label>
                </div>
                <Box sx={{ width: 550, height: 30 }}>
                    <Slider
                        aria-label="Temperature"
                        value={reduceRate}
                        getAriaValueText={valuetext}
                        valueLabelDisplay="auto"
                        color="secondary"
                        step={10}
                        marks
                        min={10}
                        max={100}
                        onChange={handleSliderChange}
                    />
                </Box>
            </div>

            <Box sx={{ width: '100%', position: 'relative', top: 30 }}>
                {/* 移除原有的进度条 */}
                {/* {animation && <LinearProgress color="secondary" />} */}
            </Box>
            <Container
                fixed
                sx={{
                    width: '100%',
                    height: '350',
                    position: 'relative',
                    top: 10,
                    padding: 0,
                }}>
                <DropZone
                    className={isDragging ? 'dragover' : ''}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
            >
                <Grid container justifyContent="center" alignItems="center">
                        {/* 原有的内容 */}
                    <CustomizedScrollbarBox
                        sx={{
                            bgcolor: '#131622',
                            position: 'relative',
                                top: '0',
                            width: '100%',
                                height: 320,
                            maxWidth: 600,
                            overflowY: 'auto',
                            }}>
                            <FixedSizeList height={330} width={480} itemSize={26} itemCount={selectedFiles ? selectedFiles?.length : 0} overscanCount={5}>
                            {renderRow}
                        </FixedSizeList>
                    </CustomizedScrollbarBox>
                        
                        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
                        {!showButton && <CircularProgressWithLabel size={80} value={progress} />}
                    </div>

                    {showButton && (
                            <GlowingButton 
                                style={{ position: 'absolute', top: '175px' }} 
                            variant="contained"
                            onClick={handleUploadClick}
                        >
                                <Typography sx={{ 
                                    color: '#14161D', 
                                    fontWeight: 'bold',
                                    textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                    fontSize: '16px',
                                    letterSpacing: '1px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <CompressIcon fontSize="small" />
                                    开始压缩
                                </Typography>
                            </GlowingButton>
                    )}
                </Grid>
                </DropZone>
            </Container>

            {/* <Alert style={{position: "absolute", left: "300px" }} severity="error">请选择正确的文件或文件夹</Alert> */}
            <Dialog
                open={open}
                TransitionComponent={Transition}
                keepMounted
                onClose={handleClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
                PaperProps={{
                    sx: {
                        backgroundColor: '#1B1527', // Your desired background color
                    },
                }}>
                {/*TODO: 对话框 */}
                <DialogTitle id="alert-dialog-title">
                    <AcUnitIcon style={{ position: 'relative', top: '7', color: '#FFF9DF' }} />
                    <label style={{ position: 'relative', left: '5' }}>{openTitle}</label>
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">{openContent}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    {/* <Button onClick={handleClose}>Disagree</Button> */}
                    <Button onClick={handleClose} autoFocus>
                        知道了
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
