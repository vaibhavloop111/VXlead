export interface CroppedArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Creates a cropped image blob from a source image and crop area.
 */
export default function getCroppedImg(
    imageSrc: string,
    pixelCrop: CroppedArea
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = pixelCrop.width;
            canvas.height = pixelCrop.height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('No canvas context'));
                return;
            }

            ctx.drawImage(
                image,
                pixelCrop.x,
                pixelCrop.y,
                pixelCrop.width,
                pixelCrop.height,
                0,
                0,
                pixelCrop.width,
                pixelCrop.height
            );

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Canvas toBlob failed'));
                    }
                },
                'image/jpeg',
                0.92
            );
        };
        image.onerror = () => reject(new Error('Failed to load image'));
        image.src = imageSrc;
    });
}
