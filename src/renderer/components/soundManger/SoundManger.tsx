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

export default function App(): JSX.Element {
    let fileSum = 0;
    let filesSizeSum = 0;
    let curFilesSizeSum = 0;
    // 声明一个 reduceRate 状态并初始化为 90
    const [reduceRate, setReduceRate] = useState(32);
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
        Utiles.openMessageBox('sound', (files: any) => {
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
          // 全部处理完毕
          console.log('All files processed');
          openAlert(
            '音频压缩',
            `所有音频都已压缩完成，请检查文件。\n\n 原文件大小${filesSizeSum}kb,现在文件大小${curFilesSizeSum}kb\n 共节省了${100 - Math.ceil((curFilesSizeSum / filesSizeSum) * 100)}%空间`
          );
          setTimeout(() => {
            endStartReduceState();
          }, 10);
          return;
        }
      
        const file = files[index];
        console.log('Selected File:', Math.floor(Utiles.fileSize(file) / 1024) + 'kb');
      
        // 识别后缀
        const lowerFile = file.toLowerCase();
        const isMp3 = lowerFile.endsWith('.mp3');
        const isWav = lowerFile.endsWith('.wav');
        
        // 生成临时输出文件名
        let tmpOutputFile = '';
        if (isMp3) {
          // 原文件是 mp3，就生成临时 mp3
          tmpOutputFile = file.replace(/\.mp3$/i, '') + 'temp.mp3';
        } else if (isWav) {
          // 原文件是 wav，就生成临时 wav
          tmpOutputFile = file.replace(/\.wav$/i, '') + 'temp.wav';
        } else {
          // 如果还有别的格式，建议你额外处理
          // 这里简单抛个错误或忽略
          console.error('Unrecognized file format:', file);
          await processFilesSequentially(files, index + 1);
          return;
        }
      
        try {
          // 根据不同后缀，执行不同的 FFmpeg 命令
          if (isMp3) {
            // 1) MP3 压缩
            await ShellUtil.shell(
              Utiles.getFfmpeg(),
              '-i', file,
              '-codec:a', 'libmp3lame',
              '-b:a', `${reduceRate}k`,     // 这里用你的 reduceRate
              tmpOutputFile
            );
          } else if (isWav) {
            // 2) WAV 压缩示例
            // ========== 示例 A: 使用 ADPCM 压缩成有损 WAV（体积更小，但要看兼容性）==========
            await ShellUtil.shell(
              Utiles.getFfmpeg(),
              '-i', file,
              '-c:a', 'adpcm_ima_wav',  // or adpcm_ms
              '-ar', '44100',           // 采样率，可自行调低
              '-ac', '2',               // 声道，可自行改成单声道 '1'
              tmpOutputFile
            );
            
            // ========== 或者, 示例 B: 仅重新采样, 依旧是无损 PCM_s16le, 文件大小不会小多少 ==========
            // await ShellUtil.shell(
            //   Utiles.getFfmpeg(),
            //   '-i', file,
            //   '-c:a', 'pcm_s16le',
            //   '-ar', '44100',   // 采样率
            //   '-ac', '2',       // 声道
            //   tmpOutputFile
            // );
          }
      
          // 统计文件大小
          curFilesSizeSum += Math.floor(Utiles.fileSize(tmpOutputFile) / 1024);
      
          // 替换原文件
          await Utiles.replaceFile(tmpOutputFile, file);
      
          // 更新进度条
          setselectedFilesProgress((prevProgress: any) => {
            const newProgressValues = [...prevProgress];
            newProgressValues[index] = 100;
            return newProgressValues;
          });
      
          // 更新总进度
          const totalProgress = Math.ceil(((index + 1) / files.length) * 100);
          setProgress(totalProgress);
      
          await processFilesSequentially(files, index + 1);
        } catch (error) {
          // 出错处理
          console.error('Error:', error);
          setTitle('文件错误');
          setContent('处理文件时出错' + error);
          setOpen(true);
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
                    <label> 压缩码率: </label>
                    <label style={{ color: '#C23099' }}>{reduceRate}kb</label>
                </div>
                <Box sx={{ width: 550, height: 30 }}>
                    <Slider aria-label="Temperature" value={reduceRate} getAriaValueText={valuetext} valueLabelDisplay="auto" color="secondary" step={16} marks min={16} max={160} onChange={handleSliderChange} />
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
