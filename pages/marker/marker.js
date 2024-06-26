const { MarkerModule, Package } = ARjsStudioBackend;

var githubButton = document.querySelector('page-footer').shadowRoot.querySelector('#github-publish');
var zipButton = document.querySelector('page-footer').shadowRoot.querySelector('#zip-publish');

window.assetParam = {
    scale: 1.0,
    size: {
        width: 1.0,
        height: 1.0,
        depth: 1.0,
    },
};

/**
 * Initialize the default marker image on page load.
 */
const setDefaultMarker = () => {
    const c = document.createElement('canvas');
    const img = document.querySelector('.default-marker-hidden');
    c.height = img.naturalHeight;
    c.width = img.naturalWidth;
    const ctx = c.getContext('2d');

    ctx.drawImage(img, 0, 0, c.width, c.height);
    const base64String = c.toDataURL();
    window.markerImage = base64String;

    MarkerModule.getFullMarkerImage(base64String, 0.5, 512, "black")
        .then((fullMarkerImage) => {
            window.fullMarkerImage = fullMarkerImage;
            img.remove();
        });
}

const checkUserUploadStatus = () => {
    enablePageFooter(window.markerImage && window.assetFile);
}

// All the required components are uploaded by the user => footer will be enable
const enablePageFooter = (enable) => {
    if (enable) {
        githubButton.classList.remove('publish-disabled');
        zipButton.classList.remove('publish-disabled');
        githubButton.removeAttribute('disabled');
        zipButton.removeAttribute('disabled');
    } else {
        githubButton.classList.add('publish-disabled');
        zipButton.classList.add('publish-disabled');
        githubButton.setAttribute('disabled', '');
        zipButton.setAttribute('disabled', '');
    }
}

const zip = () => {
    if (!window.markerImage) return alert('Please select a marker image');
    if (!window.assetType) return alert('Please select the correct content type');
    if (!window.assetFile || !window.assetName) return alert('Please upload a content');

    const folderName = `ar_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const folderPath = `./${folderName}/`;

    // Создаем новую папку
    fetch(`./create-folder.php?folderName=${folderName}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to create folder');
            }
            // Копируем файлы в созданную папку
            return Promise.all([
                fetch(window.markerImage),
                fetch(window.assetFile)
            ]);
        })
        .then(responses => Promise.all(responses.map(response => response.blob())))
        .then(blobs => Promise.all([
            writeBlobToFile(blobs[0], `${folderPath}markerImage.png`),
            writeBlobToFile(blobs[1], `${folderPath}${window.assetName}`)
        ]))
        .then(() => {
            alert('Files copied to folder: ' + folderName);
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to copy files: ' + error.message);
        });
};

// Функция для записи Blob в файл
function writeBlobToFile(blob, filePath) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const arrayBuffer = reader.result;
            const byteArray = new Uint8Array(arrayBuffer);
            const file = new File([byteArray], filePath.split('/').pop(), { type: blob.type });
            fetch(`./save-file.php`, {
                method: 'POST',
                body: file
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to write file');
                }
                resolve();
            })
            .catch(reject);
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
    });
}



/**
 * Stores the session data and redirects to publish page.
 *
 * @param {event} event
 */
const publish = () => {
    // TODO: replace alerts with HTML error messages.

    if (!window.markerImage) return alert('Please, select a marker image.');
    if (!window.assetType) return alert('Please, select the correct content type.');
    if (!window.assetFile || !window.assetName) return alert('Please, upload a content.');

    MarkerModule.getMarkerPattern(window.markerImage)
        .then((markerPattern) => {
            window.name = JSON.stringify({
                arType: 'pattern',
                assetType: window.assetType, // image/audio/video/3d
                assetFile: window.assetFile,
                assetName: window.assetName,
                assetParam: window.assetParam,
                markerPatt: markerPattern,
                markerImage: window.markerImage,
                fullMarkerImage: window.fullMarkerImage,
            });
            window.location = '../publish';
        }
        )
}

zipButton.addEventListener('click', zip);
githubButton.addEventListener('click', publish);
