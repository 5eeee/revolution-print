const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error('Ошибка при создании директории uploads:', error);
  }
}

function generateUniqueFileName(originalName) {
  const ext = path.extname(originalName).replace(/[^a-zA-Z0-9.]/g, '');
  const name = path.basename(originalName, path.extname(originalName));
  const sanitized = name.replace(/[^а-яa-z0-9\-]/gi, '_').slice(0, 50);
  const fileName = `${sanitized}_${uuidv4()}${ext}`;
  // Block path traversal
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return `file_${uuidv4()}${ext}`;
  }
  return fileName;
}

async function saveFile(fileBuffer, originalName) {
  await ensureUploadDir();

  const fileName = generateUniqueFileName(originalName);
  const filePath = path.join(UPLOAD_DIR, fileName);

  try {
    await fs.writeFile(filePath, fileBuffer);
    return {
      fileName,
      filePath,
      url: `/uploads/${fileName}`,
      originalName,
    };
  } catch (error) {
    console.error('Ошибка при сохранении файла:', error);
    throw error;
  }
}

async function deleteFile(fileName) {
  const filePath = path.join(UPLOAD_DIR, fileName);

  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error('Ошибка при удалении файла:', error);
    return false;
  }
}

module.exports = {
  saveFile,
  deleteFile,
  generateUniqueFileName,
  ensureUploadDir,
};
