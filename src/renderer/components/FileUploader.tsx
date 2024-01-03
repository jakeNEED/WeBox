import React, { ReactEventHandler } from 'react';
import { Button } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
interface FileUploaderProps {
    onFileChange: ReactEventHandler;
}
const FileUploader: React.FC<FileUploaderProps> = ({ onFileChange }) => {
    return (
        <Button style={{ backgroundColor: '#A76BBB' }} component="label" variant="contained" startIcon={<CloudUploadIcon />} onClick={onFileChange}>
            <label style={{ color: '#351353' }}>选择文件</label>
        </Button>
    );
};

export default FileUploader;
