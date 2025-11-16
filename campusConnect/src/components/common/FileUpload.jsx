import { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { FaUpload, FaTimes, FaFile, FaFilePdf, FaFileWord, FaFileImage } from 'react-icons/fa';
import { formatFileSize } from '../../utils/helpers';

const FileUpload = ({ 
  onFilesChange, 
  maxFiles = 5, 
  maxSize = 10485760, // 10MB
  acceptedTypes = ['image/*', 'application/pdf', '.doc', '.docx', '.txt'],
  label = 'Upload Files',
  hint = 'Drag and drop files here, or click to browse'
}) => {
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateFile = (file) => {
    // Check file size
    if (file.size > maxSize) {
      return `File ${file.name} is too large. Maximum size is ${formatFileSize(maxSize)}`;
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    const fileType = file.type;
    
    const isAccepted = acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return fileExtension === type;
      }
      if (type.includes('/*')) {
        return fileType.startsWith(type.split('/')[0]);
      }
      return fileType === type;
    });

    if (!isAccepted) {
      return `File ${file.name} is not an accepted file type`;
    }

    return null;
  };

  const handleFiles = (newFiles) => {
    const fileArray = Array.from(newFiles);
    const errors = [];
    const validFiles = [];

    // Check if adding these files exceeds max
    if (files.length + fileArray.length > maxFiles) {
      alert(`You can only upload up to ${maxFiles} files`);
      return;
    }

    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      alert(errors.join('\n'));
    }

    if (validFiles.length > 0) {
      const updatedFiles = [...files, ...validFiles];
      setFiles(updatedFiles);
      onFilesChange(updatedFiles);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (index) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const getFileIcon = (file) => {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    if (fileType.startsWith('image/')) return <FaFileImage className="text-blue-500" />;
    if (fileType === 'application/pdf') return <FaFilePdf className="text-red-500" />;
    if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) return <FaFileWord className="text-blue-700" />;
    return <FaFile className="text-gray-500" />;
  };

  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>}
      
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleChange}
          accept={acceptedTypes.join(',')}
          className="hidden"
        />

        <div className="text-center">
          <FaUpload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">{hint}</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
          >
            Browse Files
          </button>
          <p className="mt-2 text-xs text-gray-500">
            Max {maxFiles} files, {formatFileSize(maxSize)} each
          </p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="text-2xl">{getFileIcon(file)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="ml-3 text-red-600 hover:text-red-800 transition"
              >
                <FaTimes />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

FileUpload.propTypes = {
  onFilesChange: PropTypes.func.isRequired,
  maxFiles: PropTypes.number,
  maxSize: PropTypes.number,
  acceptedTypes: PropTypes.arrayOf(PropTypes.string),
  label: PropTypes.string,
  hint: PropTypes.string
};

export default FileUpload;
