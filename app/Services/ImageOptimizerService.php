<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class ImageOptimizerService
{
    /**
     * Compress and optimize an uploaded image.
     * Resizes if dimensions exceed max dimensions, converts to WebP/JPEG or compresses with GD.
     *
     * @param UploadedFile $file
     * @param string $destinationDir Absolute directory path (e.g. public_path('uploads/...'))
     * @param string|null $customFileName Optional custom file name
     * @param int $maxWidth Maximum width in pixels (default 1920)
     * @param int $maxHeight Maximum height in pixels (default 1080)
     * @param int $quality Compression quality (0-100, default 80)
     * @return string The saved filename
     */
    public static function compressAndSave(
        UploadedFile $file,
        string $destinationDir,
        ?string $customFileName = null,
        int $maxWidth = 1920,
        int $maxHeight = 1080,
        int $quality = 80
    ): string {
        if (!File::exists($destinationDir)) {
            File::makeDirectory($destinationDir, 0755, true);
        }

        $extension = strtolower($file->getClientOriginalExtension());
        $mime = $file->getMimeType();

        // If not GD available or not a supported raster image (e.g. gif/svg), move directly
        if (!extension_loaded('gd') || !in_array($extension, ['jpg', 'jpeg', 'png', 'webp'])) {
            $fileName = $customFileName ?? (time() . '_' . uniqid() . '.' . $extension);
            $file->move($destinationDir, $fileName);
            return $fileName;
        }

        try {
            $sourcePath = $file->getRealPath();
            $image = null;

            switch ($extension) {
                case 'jpg':
                case 'jpeg':
                    $image = @imagecreatefromjpeg($sourcePath);
                    break;
                case 'png':
                    $image = @imagecreatefrompng($sourcePath);
                    break;
                case 'webp':
                    $image = @imagecreatefromwebp($sourcePath);
                    break;
            }

            if (!$image) {
                // Fallback to normal move
                $fileName = $customFileName ?? (time() . '_' . uniqid() . '.' . $extension);
                $file->move($destinationDir, $fileName);
                return $fileName;
            }

            // Get original dimensions
            $origWidth = imagesx($image);
            $origHeight = imagesy($image);

            // Calculate scaled dimensions while preserving aspect ratio
            $ratio = min($maxWidth / $origWidth, $maxHeight / $origHeight, 1.0);
            $newWidth = (int)round($origWidth * $ratio);
            $newHeight = (int)round($origHeight * $ratio);

            $targetImage = imagecreatetruecolor($newWidth, $newHeight);

            // Handle transparency for PNG and WebP
            if ($extension === 'png' || $extension === 'webp') {
                imagealphablending($targetImage, false);
                imagesavealpha($targetImage, true);
                $transparent = imagecolorallocatealpha($targetImage, 255, 255, 255, 127);
                imagefilledrectangle($targetImage, 0, 0, $newWidth, $newHeight, $transparent);
            }

            // Resample image
            imagecopyresampled(
                $targetImage,
                $image,
                0, 0, 0, 0,
                $newWidth,
                $newHeight,
                $origWidth,
                $origHeight
            );

            // Generate filename (keep original extension or webp if desired)
            $fileName = $customFileName ?? (time() . '_' . uniqid() . '.' . $extension);
            $targetFilePath = rtrim($destinationDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $fileName;

            // Save with compression
            switch ($extension) {
                case 'jpg':
                case 'jpeg':
                    imagejpeg($targetImage, $targetFilePath, $quality);
                    break;
                case 'png':
                    // PNG quality is 0 (no compression) to 9 (max compression)
                    $pngQuality = (int)round((100 - $quality) / 10);
                    $pngQuality = max(0, min(9, $pngQuality));
                    imagepng($targetImage, $targetFilePath, $pngQuality);
                    break;
                case 'webp':
                    imagewebp($targetImage, $targetFilePath, $quality);
                    break;
            }

            imagedestroy($image);
            imagedestroy($targetImage);

            return $fileName;
        } catch (\Throwable $e) {
            Log::warning('Image optimization failed, falling back to direct move: ' . $e->getMessage());
            $fileName = $customFileName ?? (time() . '_' . uniqid() . '.' . $extension);
            $file->move($destinationDir, $fileName);
            return $fileName;
        }
    }
}
