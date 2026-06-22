// ============================================
// Image Compression Utility (Phase 8 — Chat)
// ============================================
//
// Compresses user-selected images client-side before upload to Firebase Storage.
// Target: ≤ 500KB per image, max 1920px on the longer edge.
//
// Library: browser-image-compression (~7KB gzipped)
// - Runs in Web Worker (useWebWorker: true) to avoid blocking main thread
// - Converts HEIC → JPEG automatically
// - Returns a File object compatible with Firebase Storage upload

import imageCompression from 'browser-image-compression';

const TARGET_SIZE_BYTES = 500 * 1024; // 500KB

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5,                  // 500KB target
  maxWidthOrHeight: 1920,          // Cap longer edge for mobile camera outputs
  useWebWorker: true,              // Offload to worker — keeps UI responsive
  fileType: 'image/jpeg',          // Normalize HEIC/PNG → JPEG
  initialQuality: 0.85,            // Good visual quality at this size
};

/**
 * Compress a single image File to ≤ 500KB.
 * - Returns original file if already under 500KB (skip unnecessary work)
 * - Throws on compression failure (caller should show error toast)
 */
export async function compressImage(file: File): Promise<File> {
  if (file.size <= TARGET_SIZE_BYTES) {
    return file;
  }
  try {
    const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
    return compressed;
  } catch (err) {
    console.error('[imageCompress] Compression failed:', err);
    throw new Error('圖片壓縮失敗，請重試或揀另一張圖');
  }
}

/**
 * Get image dimensions by loading it into an off-screen Image element.
 * Returns null on error (caller can fallback to "unknown").
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const dims = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(dims);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Compress multiple images in parallel. Returns array of compressed Files.
 * Use Promise.allSettled to ensure partial failures don't kill the batch.
 */
export async function compressImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map((f) => compressImage(f)));
}