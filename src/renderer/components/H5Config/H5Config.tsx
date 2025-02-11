import { Container, Button, TextField, Box, Typography } from '@mui/material';
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { styled } from '@mui/material/styles';
import Utiles from '../../../main/Utiles/Utiles';

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
    backgroundColor: '#14161D',
    border: '2px solid #402649',
    padding: '10px',
    height: '200px',
    overflowY: 'auto',
    marginBottom: '20px',
    '&::-webkit-scrollbar': {
        width: '5px',
    },
    '&::-webkit-scrollbar-track': {
        backgroundColor: '#27192c',
    },
    '&::-webkit-scrollbar-thumb': {
        backgroundColor: '#402649',
        borderRadius: '6px',
        '&:hover': {
            backgroundColor: '#c23099',
        },
    },
});

export default function H5Config(): JSX.Element {
    const [inputFile, setInputFile] = useState('');
    const [outputDir, setOutputDir] = useState('');
    const [logs, setLogs] = useState<string[]>(['需看到生成成功才表示完成！']);
    const logRef = useRef<HTMLDivElement>(null);

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

                const fileName = webSheet.A1.v + '.json';
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

    return (
        <Container fixed sx={{ padding: '20px' }}>
            <Typography variant="h5" sx={{ color: '#C18BC9', marginBottom: '20px' }}>
                H5配置生成
            </Typography>

            <LogBox ref={logRef}>
                {logs.map((log, index) => (
                    <Typography key={index} sx={{ color: '#C18BC9', whiteSpace: 'pre-wrap' }}>
                        {log}
                    </Typography>
                ))}
            </LogBox>

            <Box sx={{ marginBottom: '20px' }}>
                <StyledTextField
                    fullWidth
                    label="输入文件"
                    value={inputFile}
                    InputProps={{
                        readOnly: true,
                    }}
                    sx={{ marginBottom: '10px' }}
                />
                <Button
                    variant="contained"
                    onClick={selectInputFile}
                    sx={{ backgroundColor: '#402649', '&:hover': { backgroundColor: '#C23099' } }}
                >
                    选择文件
                </Button>
            </Box>

            <Box sx={{ marginBottom: '20px' }}>
                <StyledTextField
                    fullWidth
                    label="输出目录"
                    value={outputDir}
                    InputProps={{
                        readOnly: true,
                    }}
                    sx={{ marginBottom: '10px' }}
                />
                <Button
                    variant="contained"
                    onClick={selectOutputDir}
                    sx={{ backgroundColor: '#402649', '&:hover': { backgroundColor: '#C23099' } }}
                >
                    选择目录
                </Button>
            </Box>

            <Box sx={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <Button
                    variant="contained"
                    onClick={() => processExcel(false)}
                    sx={{ backgroundColor: '#402649', '&:hover': { backgroundColor: '#C23099' } }}
                >
                    生成
                </Button>
                <Button
                    variant="contained"
                    onClick={() => processExcel(true)}
                    sx={{ backgroundColor: '#402649', '&:hover': { backgroundColor: '#C23099' } }}
                >
                    压缩生成
                </Button>
            </Box>
        </Container>
    );
}

