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

// 使用TinyPNG压缩图片
async function compressImage(inputFile: string, outputFile: string, retryCount = 0): Promise<void> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1秒延迟

    try {
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
                    timeout: 10000 // 10秒超时
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
                                    console.log(`Image compressed successfully: ${outputFile}`);
                                    resolve();
                                });
                            }).on('error', reject);
                        } else {
                            const error = JSON.parse(data);
                            if (error.error === 'Too many requests') {
                                // 当前key已达到限制，尝试下一个key
                                compressImage(inputFile, outputFile, retryCount + 1)
                                    .then(resolve)
                                    .catch(reject);
                            } else {
                                reject(new Error(`TinyPNG API error: ${error.message}`));
                            }
                        }
                    });
                });

                req.on('error', (error: any) => {
                    if (retryCount < MAX_RETRIES) {
                        setTimeout(() => {
                            compressImage(inputFile, outputFile, retryCount + 1)
                                .then(resolve)
                                .catch(reject);
                        }, RETRY_DELAY);
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
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
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
    const [selectedFilesProgress, setselectedFilesProgress] = useState<Array<number> | null>(null);

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
                setselectedFilesProgress(progress);

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
            // Start processing files sequentially
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

    const processFilesSequentially = async (files: string[], index: number): Promise<void> => {
        if (index >= files.length) {
            console.log('All files processed');
            openAlert(
                '图片压缩',
                `所有图片都已压缩完成，请检查文件。\n\n` + 
                `原文件大小${formatFileSize(filesSizeSum)},` +
                `现在文件大小${formatFileSize(curFilesSizeSum)}\n` +
                `共节省了${100 - Math.ceil((curFilesSizeSum / filesSizeSum) * 100)}%空间`
            );
            setTimeout(() => {
                endStartReduceState();
            }, 10);
            return;
        }

        const file = files[index];
        console.log('Selected File:', Math.floor(Utiles.fileSize(file) / 1024) + 'kb');

        const tmpOutputFile: string = file.replace(/\.(jpg|jpeg|png|JPG|JPEG|PNG)$/i, '_temp$&');

        try {
            await compressImage(file, tmpOutputFile);

            curFilesSizeSum += Math.floor(Utiles.fileSize(tmpOutputFile) / 1024);
            await Utiles.replaceFile(tmpOutputFile, file);

            setselectedFilesProgress((prevProgress: any) => {
                const newProgressValues = [...prevProgress];
                newProgressValues[index] = 100;
                return newProgressValues;
            });
            
            const totalProgress = Math.ceil(((index + 1) / files.length) * 100);
            setProgress(totalProgress);

            await processFilesSequentially(files, index + 1);
        } catch (error: any) {
            if (error.message.includes('免费压缩次数已用完')) {
                openAlert('API限制', error.message);
                endStartReduceState();
                return;
            }
            console.error('Error:', error);
            openAlert('文件错误', `处理文件时出错: ${error.message}`);
            endStartReduceState();
        }
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

        // Simulating progress value (replace it with actual progress)
        const progress = 0; // Replace with your actual progress value

        return (
            <ListItem style={style} key={index} component="div" disablePadding>
                <ListItemButton>
                    <ListItemText style={{fontSize: '12px', color: '#C23099', textAlign: 'left',}} primary={`${index + 1}.`}></ListItemText>
                    <ListItemText style={{fontSize: '12px', color: '#C23099', textAlign: 'left',position: "relative" , left: "-45px"}} primary={`..........${selectedFiles ? selectedFiles[index].slice(selectedFiles[index].length -15 > 0 ? selectedFiles[index].length -15 : 0, selectedFiles[index].length) : ''}`} />
                    <LinearProgress
                        variant="determinate"
                        value={selectedFilesProgress ? selectedFilesProgress[index] : 0}
                        sx={{
                            position: 'relative',
                            top: '-5',
                            left: '5px',
                            width: '80px',
                            height: 4,
                            mt: 2,
                            borderRadius: 2,
                            bgcolor: '#402649',
                            '& .MuiLinearProgress-bar': {
                                bgcolor: '#C23099', // Set the bar color
                            },
                        }}
                    />
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
    return (
        // 居中
        <Container
            fixed
            sx={{
                border: '2px solid #402649',
                bgcolor: '#14161D',
                width: '100%',
                height: '550',
            }}>
            {/* <PinkSwitch {...label} defaultChecked /> */}
            <div
                style={{
                    display: '',
                    position: 'relative',
                    height: '100px',
                    top: '40px',
                }}>
                {/* <Button style={{ backgroundColor: '#A76BBB' }} component="label" variant="contained" startIcon={<CloudUploadIcon />} onClick={handleFileChange}>
                    <label style={{ color: '#351353' }}>选择文件</label>
                </Button> */}
                <FileUploader onFileChange={handleFileChange} />

                {/* 目录框 */}
                <Container
                    fixed
                    sx={{
                        display: 'inline-block',
                        border: '2px solid #402649',
                        bgcolor: '#14161D',
                        width: '400px',
                        height: '30',
                        position: 'relative',
                        // top: "-10",
                        left: '20',
                    }}>
                    <label
                        style={{
                            color: '#C18BC9',
                            position: 'relative',
                            left: '-15',
                            fontWeight: 'bold',
                        }}>
                        目录:{' '}
                    </label>
                    <label style={{ color: '#C23099', position: 'relative', left: '-15' }}> {selectFilePath} </label>
                </Container>
            </div>
            <div style={{ color: '#C18BC9', fontWeight: 'bold' }}>
                <div style={{ display: 'inline-block' }}>
                    <label> 压缩比率: </label>
                    <label style={{ color: '#C23099' }}>{reduceRate}%</label>
                </div>
                <Box sx={{ width: 550, height: 30 }}>
                    <Slider aria-label="Temperature" value={reduceRate} getAriaValueText={valuetext} valueLabelDisplay="auto" color="secondary" step={10} marks min={10} max={100} onChange={handleSliderChange} />
                </Box>
            </div>
            <Box sx={{ width: '100%', position: 'relative', top: 30 }}>
                {/* <LinearProgress color="secondary" /> */}
                {animation && <LinearProgress color="secondary" />}
            </Box>
            <Container
                fixed
                sx={{
                    border: '2px solid #402649',
                    bgcolor: '#14161D',
                    width: '100%',
                    height: '350',
                    position: 'relative',
                    top: 30,
                }}>
                <Grid container justifyContent="center" alignItems="center">
                    {/* // 虚拟列表 */}
                    {/* <Box sx={{ bgcolor: '#191B24', position: 'relative', top: '10', width: '100%', height: 330, maxWidth: 600 }}> */}
                    <CustomizedScrollbarBox
                        sx={{
                            bgcolor: '#131622', //
                            position: 'relative',
                            top: '10',
                            width: '100%',
                            height: 330,
                            maxWidth: 600,
                            overflowY: 'auto', // Enable vertical scrollbar
                        }}>
                        <FixedSizeList height={330} width={480} itemSize={26} itemCount={selectedFiles ? selectedFiles?.length : 0} overscanCount={5}>
                            {renderRow}
                        </FixedSizeList>
                    </CustomizedScrollbarBox>
                    {/* </Box> */}
                    {/* 总进度 */}
                    <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>{!showButton && <CircularProgressWithLabel size={80} value={progress} />}</div>

                    {showButton && (
                        <Button style={{ position: 'absolute', top: '175' }} variant="contained" color="success" onClick={handleUploadClick}>
                            <label style={{ color: '#2F2931', fontWeight: 'bold' }}>开始压缩</label>
                        </Button>
                    )}
                </Grid>
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
