import { Container, Button, TextField, Box, Typography, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Fade } from '@mui/material';
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { styled } from '@mui/material/styles';
import Utiles from '../../../main/Utiles/Utiles';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import { Transitions } from '@mui/material';
import path from 'path';

// 引入node.js相关模块
interface ConfigData {
    wconfs: any[];
    gconfs: any[];
    uconfs: any[];
    [key: string]: any;
}


// 格式化数据
function formatData(v: any, t: string): any {
    if (t === 'string') {
        return String(v);
    } else if (t === 'int') {
        return parseInt(v);
    } else if (t === 'array') {
        if (typeof v === 'string') {
            return JSON.parse(v);
        }
        return v;
    } else if (t === 'ig') {
        return null;
    }
    return v;
}

// 分组工作表
function groupSheets(workbook: XLSX.WorkBook): string[][] {
    const sheetNames = workbook.SheetNames;
    const groups: { [key: string]: string[] } = {};
    
    sheetNames.forEach(name => {
        const parts = name.split('_');
        if (parts.length === 2) {
            const [_, y] = parts;
            if (!groups[y]) {
                groups[y] = [];
            }
            groups[y].push(name);
        }
    });
    
    return Object.values(groups);
}

// 读取配置
function readConfs(sheet: XLSX.WorkSheet): any[] {
    const confs: any[] = [];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const rows = range.e.r + 1;
    const cols = range.e.c + 1;
    const pcolIdx = 4;
    
    // 获取所有单元格数据
    const data: any = [];
    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
            const cell = sheet[XLSX.utils.encode_cell({r: r, c: c})];
            row.push(cell ? cell.v : null);
        }
        data.push(row);
    }

    // 从第pcolIdx + 2行开始处理数据
    for (let i = pcolIdx + 2; i < rows; i++) {
        if (!data[i][0] || data[i][0] === null) break;
        
        // 使用Map来保持键的顺序
        const pdata = new Map<string, any>();
        
        // 收集所有列
        for (let k = 0; k < cols; k++) {
            const pname = data[pcolIdx][k];
            const ptype = data[pcolIdx + 1][k];
            const value = data[i][k];
            
            if (pname && pname !== '' && value != null && ptype !== 'ig') {
                pdata.set(pname, formatData(value, ptype));
            }
        }

        // 将Map转换为普通对象，保持顺序
        if (pdata.size > 0) {
            const orderedObj = Array.from(pdata).reduce((obj, [key, value]) => {
                obj[key] = value;
                return obj;
            }, {} as {[key: string]: any});
            
            confs.push(orderedObj);
        }
    }
    
    return confs;
}

const StyledTextField = styled(TextField)({
    '& .MuiOutlinedInput-root': {
        '& fieldset': {
            borderColor: '#402649',
        },
        '&:hover fieldset': {
            borderColor: '#C23099',
        },
        '&.Mui-focused fieldset': {
            borderColor: '#C23099',
        },
    },
    '& .MuiInputLabel-root': {
        color: '#C18BC9',
    },
    '& .MuiInputBase-input': {
        color: '#C23099',
    },
});

const LogBox = styled(Box)({
    backgroundColor: 'rgba(20, 22, 29, 0.6)',
    backdropFilter: 'blur(10px)',
    border: '2px solid #402649',
    padding: '10px',
    height: '200px',
    overflowY: 'auto',
    marginBottom: '20px',
    borderRadius: '8px',
    boxShadow: 'inset 0 0 15px rgba(0, 0, 0, 0.2)',
    '&::-webkit-scrollbar': {
        width: '5px',
    },
    '&::-webkit-scrollbar-track': {
        backgroundColor: 'rgba(39, 25, 44, 0.5)',
    },
    '&::-webkit-scrollbar-thumb': {
        backgroundColor: '#402649',
        borderRadius: '6px',
        '&:hover': {
            backgroundColor: '#c23099',
        },
    },
});

// 修改拖拽区域样式，添加更炫酷的动画效果
const DropZone = styled('div')(({ theme }) => ({
  width: '100%',
  height: '36px',
  border: '2px solid #402649',
  borderRadius: '8px', // 增加圆角
  display: 'flex',
  alignItems: 'center',
  backgroundColor: 'rgba(20, 22, 29, 0.6)', // 半透明背景
  backdropFilter: 'blur(10px)', // 雾面玻璃效果
  transition: 'all 0.3s ease',
  padding: '0 15px',
  overflow: 'hidden', // 确保内容不会溢出
  position: 'relative', // 为流光效果定位
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.1)', // 立体感阴影
  '&:hover': {
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
    transform: 'translateY(-1px)',
    borderColor: '#C23099',
  },
  '&.dragover': {
    borderColor: '#C23099',
    backgroundColor: 'rgba(194, 48, 153, 0.1)',
    boxShadow: '0 0 20px rgba(194, 48, 153, 0.5), inset 0 0 10px rgba(194, 48, 153, 0.2)',
    transform: 'scale(1.01)',
  },
  // 边框发光效果
  '&::before': {
    content: '""',
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: '10px',
    background: 'linear-gradient(45deg, #C23099, #402649, #42b983, #402649, #C23099)',
    backgroundSize: '400% 400%',
    zIndex: -1,
    filter: 'blur(5px)',
    opacity: 0.5,
    transition: '0.3s',
    animation: 'borderGlow 10s ease infinite',
  },
  // 第一道流光效果
  '&::after': {
    content: '""',
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: 'linear-gradient(to right, rgba(194, 48, 153, 0) 0%, rgba(194, 48, 153, 0.2) 50%, rgba(194, 48, 153, 0) 100%)',
    transform: 'rotate(30deg)',
    animation: 'flowingLight1 8s infinite linear',
    opacity: 0.3,
  },
  '@keyframes borderGlow': {
    '0%': { backgroundPosition: '0% 50%' },
    '50%': { backgroundPosition: '100% 50%' },
    '100%': { backgroundPosition: '0% 50%' }
  },
  '@keyframes flowingLight1': {
    '0%': {
      transform: 'rotate(30deg) translateX(-100%)',
    },
    '100%': {
      transform: 'rotate(30deg) translateX(100%)',
    },
  },
}));

// 添加文本输入动画效果
const AnimatedText = styled(Typography)(({ theme }) => ({
  color: '#C23099',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  width: '100%',
  zIndex: 1,
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    left: 0,
    bottom: -2,
    width: '100%',
    height: '1px',
    background: 'linear-gradient(90deg, #C23099, #42b983)',
    transform: 'scaleX(0)',
    transformOrigin: 'left',
    transition: 'transform 0.5s ease',
  },
  '&:hover::after': {
    transform: 'scaleX(1)',
  }
}));

// 添加雾面玻璃容器
const GlassContainer = styled(Container)(({ theme }) => ({
  border: '2px solid rgba(64, 38, 73, 0.5)',
  backgroundColor: 'rgba(20, 22, 29, 0.7)',
  backdropFilter: 'blur(15px)',
  width: '100%',
  height: '550',
  position: 'relative',
  overflow: 'hidden',
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  padding: '20px',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
  }
}));

// 添加闪光按钮组件
const GlowingButton = styled(Button)(({ theme, color }) => ({
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: color === 'primary' ? 'rgba(66, 185, 131, 0.8)' : 'rgba(194, 48, 153, 0.8)',
  backdropFilter: 'blur(5px)',
  borderRadius: '12px',
  padding: '10px 20px',
  transition: 'all 0.3s ease',
  boxShadow: color === 'primary' 
    ? '0 0 15px rgba(66, 185, 131, 0.5)' 
    : '0 0 15px rgba(194, 48, 153, 0.5)',
  '&:hover': {
    backgroundColor: color === 'primary' ? 'rgba(66, 185, 131, 0.9)' : 'rgba(194, 48, 153, 0.9)',
    transform: 'translateY(-3px) scale(1.02)',
    boxShadow: color === 'primary' 
      ? '0 0 25px rgba(66, 185, 131, 0.7)' 
      : '0 0 25px rgba(194, 48, 153, 0.7)',
  },
  '&:active': {
    transform: 'translateY(1px)',
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

export default function H5Config(): JSX.Element {
    const [inputFile, setInputFile] = useState('');
    const [outputDir, setOutputDir] = useState('');
    const [outputSuffix, setOutputSuffix] = useState('t1');
    const [logs, setLogs] = useState<string[]>(['需看到生成成功才表示完成！']);
    const logRef = useRef<HTMLDivElement>(null);
    const [isDraggingInput, setIsDraggingInput] = useState(false);
    const [isDraggingOutput, setIsDraggingOutput] = useState(false);
    const [open, setOpen] = useState(false);
    const [openTitle, setOpenTitle] = useState('');
    const [openContent, setOpenContent] = useState('');

    const addLog = (message: string) => {
        setLogs(prev => [...prev, message]);
        setTimeout(() => {
            if (logRef.current) {
                logRef.current.scrollTop = logRef.current.scrollHeight;
            }
        }, 100);
    };

    const selectInputFile = async () => {
        const result = await Utiles.openFile();
        if (!result.canceled && result.filePaths.length > 0) {
            setInputFile(result.filePaths[0]);
        }
    };

    const selectOutputDir = async () => {
        const result = await Utiles.openDirectory();
        
        if (!result.canceled && result.filePaths.length > 0) {
            setOutputDir(result.filePaths[0]);
        }
    };

    const processExcel = async (compress: boolean = false) => {
        if (!inputFile || !outputDir) {
            addLog('请选择输入文件和输出目录！');
            return;
        }

        try {
            addLog('开始处理...');
            const workbook = XLSX.read(Utiles.readFileSync(inputFile));
            const groups = groupSheets(workbook);

            for (const sheets of groups) {
                let gameSheet, webSheet, urlSheet;

                // 按照固定顺序处理sheet
                for (const sheetName of sheets) {
                    if (sheetName.startsWith('game')) {
                        gameSheet = workbook.Sheets[sheetName];
                    } else if (sheetName.startsWith('web')) {
                        webSheet = workbook.Sheets[sheetName];
                    } else if (sheetName.startsWith('url')) {
                        urlSheet = workbook.Sheets[sheetName];
                    }
                }

                if (!webSheet || !gameSheet || !urlSheet) {
                    throw new Error('缺少必要的工作表');
                }

                const fileName = `webconfig_${outputSuffix}.json`;
                const outputPath = Utiles.pathJoin(outputDir, fileName);

                // 使用Map来保持输出顺序
                const orderedData = new Map<string, any>();
                
                // 按照指定顺序添加属性
                orderedData.set('gconfs', readConfs(gameSheet));
                orderedData.set('uconfs', readConfs(urlSheet));
                orderedData.set('wconfs', readConfs(webSheet));
                
                // 最后添加version
                const key = webSheet[`A2`]?.v;
                const value = webSheet[`B2`]?.v;
                if (key) {
                    orderedData.set(key, value);
                }

                // 将Map转换为对象，保持顺序
                const data = Array.from(orderedData).reduce((obj, [key, value]) => {
                    obj[key] = value;
                    return obj;
                }, {} as ConfigData);

                // 写入JSON文件，保持紧凑格式
                const jsonStr = compress 
                    ? JSON.stringify(data, null, 0)
                    : JSON.stringify(data, null, 2);
                Utiles.writeFileSync(outputPath, jsonStr, 'utf8');

                addLog(`已生成文件: ${outputPath}`);
            }

            addLog('\n********** 生成成功！**********');
        } catch (error) {
            addLog(`错误: ${(error as Error).message}`);
        }
    };

    // 处理拖拽文件到输入框
    const handleInputDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingInput(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            setInputFile(files[0].path);
        }
    };

    // 处理拖拽文件夹到输出框
    const handleOutputDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOutput(false);

        const items = e.dataTransfer.items;
        if (items && items.length > 0) {
            // 尝试获取文件夹
            const entry = items[0].webkitGetAsEntry();
            if (entry && entry.isDirectory) {
                // 这是一个文件夹
                setOutputDir(e.dataTransfer.files[0].path);
            } else if (e.dataTransfer.files.length > 0) {
                // 如果不是文件夹，使用文件的目录
                setOutputDir(path.dirname(e.dataTransfer.files[0].path));
            }
        }
    };

    // 拖拽事件处理
    const handleDragOver = (e: React.DragEvent, setDragging: React.Dispatch<React.SetStateAction<boolean>>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent, setDragging: React.Dispatch<React.SetStateAction<boolean>>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
    };

    // 修改背景动画，增加更多元素
    const BackgroundAnimation = () => (
        <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'hidden',
            zIndex: -1,
        }}>
            {/* 主背景渐变 */}
            <Box sx={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #14161D 0%, #1B1527 50%, #14161D 100%)',
            }} />
            
            {/* 旋转渐变 */}
            <Box sx={{
                position: 'absolute',
                width: '150%',
                height: '150%',
                top: '-25%',
                left: '-25%',
                background: 'radial-gradient(ellipse at center, rgba(194, 48, 153, 0.15) 0%, rgba(66, 185, 131, 0.1) 50%, rgba(20, 22, 29, 0) 70%)',
                animation: 'rotate 60s linear infinite',
                '@keyframes rotate': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                }
            }} />
            
            {/* 脉冲效果 */}
            <Box sx={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(45deg, rgba(194, 48, 153, 0.05) 0%, rgba(66, 185, 131, 0.05) 100%)',
                animation: 'pulse 15s ease-in-out infinite alternate',
                '@keyframes pulse': {
                    '0%': { opacity: 0.3 },
                    '100%': { opacity: 0.7 }
                }
            }} />
            
            {/* 浮动粒子 */}
            {Array.from({ length: 20 }).map((_, i) => (
                <Box
                    key={i}
                    sx={{
                        position: 'absolute',
                        width: Math.random() * 4 + 1 + 'px',
                        height: Math.random() * 4 + 1 + 'px',
                        borderRadius: '50%',
                        backgroundColor: i % 2 === 0 ? 'rgba(194, 48, 153, 0.4)' : 'rgba(66, 185, 131, 0.4)',
                        boxShadow: i % 2 === 0 ? '0 0 10px rgba(194, 48, 153, 0.7)' : '0 0 10px rgba(66, 185, 131, 0.7)',
                        left: Math.random() * 100 + '%',
                        top: Math.random() * 100 + '%',
                        animation: `float${i} ${Math.random() * 20 + 10}s ease-in-out infinite alternate`,
                        [`@keyframes float${i}`]: {
                            '0%': {
                                transform: `translate(${Math.random() * 50 - 25}px, ${Math.random() * 50 - 25}px)`,
                                opacity: Math.random() * 0.5 + 0.3
                            },
                            '100%': {
                                transform: `translate(${Math.random() * 50 - 25}px, ${Math.random() * 50 - 25}px)`,
                                opacity: Math.random() * 0.5 + 0.3
                            }
                        }
                    }}
                />
            ))}
        </Box>
    );

    const handleClose = () => {
        setOpen(false);
    };

    return (
        <GlassContainer>
            {/* 添加背景动画 */}
            <BackgroundAnimation />

            {/* 修改标题区域，添加输入框 */}
            <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginBottom: '20px', 
                marginTop: '15px',
                gap: '15px'
            }}>
                <Typography variant="h5" sx={{ 
                    color: '#C18BC9', 
                    textShadow: '0 0 15px rgba(193, 139, 201, 0.7)',
                    fontWeight: 'bold',
                    letterSpacing: '2px',
                    animation: 'titleGlow 3s ease-in-out infinite alternate',
                    '@keyframes titleGlow': {
                        '0%': { textShadow: '0 0 10px rgba(193, 139, 201, 0.5)' },
                        '100%': { textShadow: '0 0 20px rgba(193, 139, 201, 0.8)' }
                    }
                }}>
                    H5配置生成
                </Typography>
                
                {/* 修复输入框，使其可以正常输入 */}
                <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    backgroundColor: 'rgba(20, 22, 29, 0.6)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '4px',
                    border: '1px solid #402649',
                    padding: '0 8px',
                    height: '32px',
                    width: '110px',
                    '&:hover': {
                        borderColor: '#C23099',
                    },
                    '&:focus-within': {
                        borderColor: '#C23099',
                        boxShadow: '0 0 8px rgba(194, 48, 153, 0.5)',
                    }
                }}>
                    <Typography sx={{ 
                        color: '#C18BC9', 
                        fontSize: '12px',
                        whiteSpace: 'nowrap'
                    }}>
                        webconfig_
                    </Typography>
                    
                    <input
                        value={outputSuffix}
                        onChange={(e) => setOutputSuffix(e.target.value)}
                        placeholder="t1"
                        style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: '#C23099',
                            fontSize: '12px',
                            width: '25px',
                            padding: '0 4px'
                        }}
                    />
                </Box>
            </Box>

            <LogBox ref={logRef} sx={{
                position: 'relative',
                boxShadow: '0 0 15px rgba(64, 38, 73, 0.3) inset',
                borderRadius: '8px',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '1px',
                    background: 'linear-gradient(90deg, transparent, rgba(194, 48, 153, 0.5), transparent)',
                }
            }}>
                {logs.map((log, index) => (
                    <Typography key={index} sx={{ 
                        color: '#C18BC9', 
                        whiteSpace: 'pre-wrap',
                        fontSize: '13px',
                        lineHeight: 1.5,
                        padding: '2px 0'
                    }}>
                        {log}
                    </Typography>
                ))}
            </LogBox>

            {/* 修改文件选择区域 */}
            <Box sx={{ marginBottom: '20px', marginTop: '20px' }}>
                <Typography sx={{ 
                    color: '#C18BC9', 
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                }}>
                    {/* <span role="img" aria-label="file" style={{ fontSize: '16px' }}></span> */}
                    输入文件 (拖拽Excel文件到此处)
                </Typography>
                <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    gap: '10px', 
                    alignItems: 'center' 
                }}>
                    <DropZone
                        className={isDraggingInput ? 'dragover' : ''}
                        onDragOver={(e) => handleDragOver(e, setIsDraggingInput)}
                        onDragLeave={(e) => handleDragLeave(e, setIsDraggingInput)}
                        onDrop={handleInputDrop}
                        title={inputFile || '拖拽Excel文件到此处...'}
                    >
                        <AnimatedText>
                            {inputFile || '拖拽Excel文件到此处...'}
                        </AnimatedText>
                    </DropZone>
                    <Button
                        variant="contained"
                        onClick={selectInputFile}
                        sx={{ 
                            backgroundColor: 'rgba(64, 38, 73, 0.8)', 
                            backdropFilter: 'blur(5px)',
                            borderRadius: '8px',
                            boxShadow: '0 0 10px rgba(64, 38, 73, 0.5)',
                            whiteSpace: 'nowrap',
                            minWidth: '90px',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 5px 15px rgba(64, 38, 73, 0.7)',
                                backgroundColor: 'rgba(194, 48, 153, 0.8)'
                            }
                        }}
                    >
                        选择文件
                    </Button>
                </Box>
            </Box>

            {/* 修改目录选择区域 */}
            <Box sx={{ marginBottom: '20px' }}>
                <Typography sx={{ 
                    color: '#C18BC9', 
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                }}>
                    输出目录 (拖拽文件夹到此处)
                </Typography>
                <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    gap: '10px', 
                    alignItems: 'center' 
                }}>
                    <DropZone
                        className={isDraggingOutput ? 'dragover' : ''}
                        onDragOver={(e) => handleDragOver(e, setIsDraggingOutput)}
                        onDragLeave={(e) => handleDragLeave(e, setIsDraggingOutput)}
                        onDrop={handleOutputDrop}
                        title={outputDir || '拖拽文件夹到此处...'}
                    >
                        <AnimatedText>
                            {outputDir || '拖拽文件夹到此处...'}
                        </AnimatedText>
                    </DropZone>
                    <Button
                        variant="contained"
                        onClick={selectOutputDir}
                        sx={{ 
                            backgroundColor: 'rgba(64, 38, 73, 0.8)', 
                            backdropFilter: 'blur(5px)',
                            borderRadius: '8px',
                            boxShadow: '0 0 10px rgba(64, 38, 73, 0.5)',
                            whiteSpace: 'nowrap',
                            minWidth: '90px',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 5px 15px rgba(64, 38, 73, 0.7)',
                            }
                        }}
                    >
                        选择目录
                    </Button>
                </Box>
            </Box>

            <Box sx={{ 
                display: 'flex', 
                gap: '20px', 
                justifyContent: 'center',
                marginTop: '30px'
            }}>
                <GlowingButton
                    color="primary"
                    variant="contained"
                    onClick={() => processExcel(false)}
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
                        <span role="img" aria-label="generate">⚙️</span>
                        标准生成
                    </Typography>
                </GlowingButton>
                <GlowingButton
                    color="secondary"
                    variant="contained"
                    onClick={() => processExcel(true)}
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
                        <span role="img" aria-label="compress">🚀</span>
                        压缩生成
                    </Typography>
                </GlowingButton>
            </Box>

            {/* 对话框也添加雾面玻璃效果 */}
            <Dialog
                open={open}
                TransitionComponent={Fade}
                keepMounted
                onClose={handleClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
                PaperProps={{
                    sx: {
                        backgroundColor: 'rgba(27, 21, 39, 0.8)',
                        backdropFilter: 'blur(15px)',
                        boxShadow: '0 0 30px rgba(64, 38, 73, 0.7)',
                        border: '1px solid rgba(64, 38, 73, 0.5)',
                        borderRadius: '12px',
                    },
                }}>
                <DialogTitle id="alert-dialog-title" sx={{
                    display: 'flex',
                    alignItems: 'center',
                    color: '#C18BC9',
                    fontWeight: 'bold',
                }}>
                    <AcUnitIcon sx={{ color: '#FFF9DF', marginRight: '8px' }} />
                    {openTitle}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description" sx={{ color: '#C23099' }}>
                        {openContent}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={handleClose} 
                        autoFocus
                        sx={{ 
                            color: '#C18BC9',
                            '&:hover': { 
                                color: '#C23099',
                                textShadow: '0 0 8px rgba(194, 48, 153, 0.5)'
                            } 
                        }}
                    >
                        知道了
                    </Button>
                </DialogActions>
            </Dialog>
        </GlassContainer>
    );
}

