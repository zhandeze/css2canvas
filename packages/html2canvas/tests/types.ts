export interface PlatformDetails {
    name: string;
    version: string;
}

export interface ScreenshotRequest {
    screenshot: string;
    test: string;
    platform: PlatformDetails;
    devicePixelRatio: number;
    windowWidth: number;
    windowHeight: number;
}

export interface ImageSize {
    width: number;
    height: number;
}

export interface PixelSample {
    r: number;
    g: number;
    b: number;
    a: number;
}

export interface FirstDiff {
    x: number;
    y: number;
    reference: PixelSample;
    actual: PixelSample;
}

export interface ImageCompareResult {
    identical: boolean;
    diffPixels: number;
    diffRatio: number;
    totalPixels: number;
    overlapSize: ImageSize;
    referenceSize: ImageSize;
    actualSize: ImageSize;
    firstDiff?: FirstDiff;
}

export interface ExtractedRenderCompare {
    identical: boolean;
    originalSize: ImageSize;
    extractedSize: ImageSize;
    diffPixels: number;
}

export interface ExtractedRenderInputEntry {
    name: string;
    compare?: ExtractedRenderCompare;
    input: {
        renderOptions: {
            scale?: number;
            width: number;
            height: number;
            canvas?: {
                width: number;
                height: number;
            };
        };
    };
}

export interface MiniAppCompareRequest {
    exampleName: string;
    actualImage: string;
    exampleBaseUrl?: string;
}

export interface MiniAppCompareResponse {
    exampleName: string;
    requestId: string;
    browser: {
        referenceUrl: string;
        extractedUrl: string;
        extractedCompare?: ExtractedRenderCompare;
        generatedCompare: ExtractedRenderCompare;
    };
    actual: {
        url: string;
    };
    diff: {
        url: string;
        compare: ImageCompareResult;
    };
    metadataUrl: string;
}
