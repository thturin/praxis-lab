
const LAB_HOST = process.env.REACT_APP_API_LAB_HOST?.replace('/api', '') ?? '';


//this function takes an image src and resolves it to a full URL if it's a relative path, or returns it unchanged if it's already an absolute URL or a data URI. It handles three cases:
//1. If the src is a data URI (starts with "data:"), it returns null, indicating that no change is needed.
//2. If the src is an absolute URL (starts with "http://" or "https://"), it returns the src unchanged.
//3. If the src is a relative path (starts with "/"), it prepends the LAB_HOST to create a full URL pointing to the lab server's image endpoint.

const resolveImageSrc = (src: string | null, labHost: string = LAB_HOST): string | null => {
    //"data:image/png;base64,iVBO
    if (!src || src.startsWith('data:')) return null; // already embedded data URI

   //image from the internet
    if (/^https?:\/\//i.test(src)) return src; // already absolute

    //"/images/bae25eb7e1121019b44210660f5a831c.png"
    // to "http://localhost:14000/images/bae25eb7e1121019b44210660f5a831c.png"
    if (src.startsWith('/')) return `${labHost}${src}`; // server-hosted upload
    return src;
};


//this is used for rendering explanations and question prompts in the lab preview and student view. It replaces any image src that starts with
// /images/ with the full URL to the lab server so that the images can be displayed correctly.
// or example, it converts src="/images/bae25eb7e1121019b44210660f5a831c.png"
// to src="http://localhost:14000/images/bae25eb7e1121019b44210660f5a831c.png". It also leaves data URIs and absolute URLs unchanged.
// -/images/bae25eb7e1121019b44210660f5a831c.png" --> localhost:14000/images/bae...png
export const getImageUrlsFromHtml = (htmlString: string = ''): string => {
    if (!htmlString) return '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    doc.querySelectorAll('img').forEach((img) => {
        const resolvedSrc = resolveImageSrc(img.getAttribute('src'));
        if (resolvedSrc) {
            img.setAttribute('src', resolvedSrc);
        }
    });
    return doc.body.innerHTML;
};

const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
});


//for exporting json in lab builder .. the image urls must be
export const inlineImagesAsDataUrls = async (htmlString: string = ''): Promise<string> => {
    if (!htmlString) return '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const images = Array.from(doc.querySelectorAll('img')); //find all <img>

    //<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHMAAABMCAYAAABeb4ieAAAABHNCSVQICAgIfAhkiAAAABl0RVh0U29mdHdhcmU…
    //	'<p><img src="/images/bae25eb7e1121019b44210660f5a831c.png"></p>'

    //each image make an asyn request
    await Promise.all(images.map(async (img) => {
        const resolvedSrc = resolveImageSrc(img.getAttribute('src'));
        if (!resolvedSrc) return;
        try {
            const response = await fetch(resolvedSrc);
            if (!response.ok) throw new Error(`Failed to fetch ${resolvedSrc}`);
            const blob = await response.blob();
            const dataUrl = await blobToDataUrl(blob);
            img.setAttribute('src', dataUrl);
        } catch (error) {
            console.error('Unable to inline image for export', error);
        }
    }));

    return doc.body.innerHTML;
};

//================image to text for vision LLM================
interface ImageData {
    base64Data: string | null;
    mimeType: string | null;
    imageUrl: string | null;
}

const extractImageDataFromSrc = (src: string): ImageData | null => {
    if (!src) return null;

    // Case 1: freshly pasted base64 image — extract data directly
    if (src.startsWith('data:')) {
        const match = src.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!match) return null;
        return { base64Data: match[2], mimeType: match[1], imageUrl: null };
    }

    // Case 2: saved image with /images/ path — send the path, backend reads from disk
    if (src.startsWith('/images/')) {
        return { base64Data: null, mimeType: null, imageUrl: src };
    }

    // Case 3: full URL (already resolved) — extract the /images/ path from it
    if (src.includes('/images/')) {
        const imagePath = '/images/' + src.split('/images/')[1];
        return { base64Data: null, mimeType: null, imageUrl: imagePath };
    }

    return null;
};

// Extracts all images from HTML content for the vision LLM.
export const extractAllImagesData = (htmlString: string = ''): ImageData[] => {
    if (!htmlString) return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    return Array.from(doc.querySelectorAll('img'))
        .map(img => extractImageDataFromSrc(img.getAttribute('src') ?? ''))
        .filter((d): d is ImageData => d !== null);
};
// Example: given HTML with two images:
//   <img src="data:image/png;base64,iVBORw0KGgo...">
//   <img src="/images/bae25eb7e1121019b44210660f5a831c.png">
// returns:
//   [
//     { base64Data: "iVBORw0KGgo...", mimeType: "image/png", imageUrl: null },
//     { base64Data: null, mimeType: null, imageUrl: "/images/bae25eb7e1121019b44210660f5a831c.png" }
//   ]
// Any <img> with no src or unrecognized format is filtered out.
