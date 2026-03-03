
const LAB_HOST = process.env.REACT_APP_API_LAB_HOST?.replace('/api', '') ?? '';


// Uploads all base64 images in an HTML string to the server, replaces their src with the returned URLs.
// Used at grade time to persist student response images before vision extraction.
export const uploadBase64Images = async (htmlString: string, subfolder: string = 'sessions'): Promise<string> => {
    if (!htmlString || !htmlString.includes('data:image')) return htmlString;
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const imgs = Array.from(doc.querySelectorAll('img'));

    await Promise.all(imgs.map(async (img) => {
        const src = img.getAttribute('src') ?? '';
        const imageData = extractImageDataFromSrc(src);
        if (!imageData?.base64Data) return; // skip already-uploaded images
        try {
            const res = await fetch(`${LAB_HOST}/api/image/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ base64Data: imageData.base64Data, mimeType: imageData.mimeType, subfolder }),
            });
            const data = await res.json();
            if (data.imageUrl) img.setAttribute('src', data.imageUrl);
        } catch (err) {
            console.error('Failed to upload student image:', err);
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
        const match = src.match(/^data:(image\/[^;]+);base64,(.+)$/s);
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
                        //will exttract img=src or base64
        .map(img => extractImageDataFromSrc(img.getAttribute('src') ?? ''))
        .filter((d): d is ImageData => d !== null);
};
// EXAMPLE OF RETURN  Example: given HTML with two images:
//   <img src="data:image/png;base64,iVBORw0KGgo...">
//   <img src="/images/bae25eb7e1121019b44210660f5a831c.png">
// returns:
//   [
//     { base64Data: "iVBORw0KGgo...", mimeType: "image/png", imageUrl: null },
//     { base64Data: null, mimeType: null, imageUrl: "/images/bae25eb7e1121019b44210660f5a831c.png" }
//   ]
// Any <img> with no src or unrecognized format is filtered out.




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


//this is used for rendering any text with image urls with . It replaces any image src that starts with
// /images/ with the full URL to the lab server so that the images can be displayed correctly.
// or example, it converts src="/images/bae25eb7e1121019b44210660f5a831c.png"
// to src="http://localhost:14000/images/bae25eb7e1121019b44210660f5a831c.png". It also leaves data URIs and absolute URLs unchanged.
// -/images/bae25eb7e1121019b44210660f5a831c.png" --> localhost:14000/images/bae...png
export const resolveImageSrcs = (htmlString: string = ''): string => {
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

// Strip base64 <img> tags from HTML string — used before autosave to avoid writing images to disk
export const stripBase64Images = (html: string): string => {
    if (!html || !html.includes('data:image')) return html;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    doc.querySelectorAll('img').forEach(img => {
        if (img.getAttribute('src')?.startsWith('data:')) img.remove();
    });
    return doc.body.innerHTML;
};

// Strip base64 images from all HTML fields in a blocks array
export const stripBase64FromBlocks = (blocks: any[]): any[] =>
    blocks.map(block => {
        if (block.blockType === 'material') {
            return { ...block, content: stripBase64Images(block.content || '') };
        }
        if (block.blockType === 'question') {
            return {
                ...block,
                prompt: stripBase64Images(block.prompt || ''),
                key: stripBase64Images(block.key || ''),
                explanation: stripBase64Images(block.explanation || ''),
                subQuestions: (block.subQuestions || []).map((sq: any) => ({
                    ...sq,
                    prompt: stripBase64Images(sq.prompt || ''),
                    key: stripBase64Images(sq.key || ''),
                    explanation: stripBase64Images(sq.explanation || ''),
                })),
            };
        }
        return block;
    });
