const API_BASE = 'https://uploadtourl.com/api';

export async function verifyApiKey(apiKey) {
    const res = await fetch(`${API_BASE}/api-key/verify`, {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            'x-api-key': apiKey,
        },
    });
    if (!res.ok) {
        throw new Error(`Verification failed (${res.status})`);
    }
    return res.json();
}

export async function uploadFile(apiKey, file, expiryDays) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('expiry_days', expiryDays);
    formData.append('source', 'airtable');

    const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
        },
        body: formData,
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Upload failed (${res.status}): ${text}`);
    }
    return res.json();
}

export async function uploadFromUrl(apiKey, sourceUrl, fileName, expiryDays) {
    // Download the file from the Airtable attachment URL, then re-upload
    const res = await fetch(sourceUrl);
    if (!res.ok) {
        throw new Error(`Failed to download attachment: ${res.status}`);
    }
    const blob = await res.blob();
    const file = new File([blob], fileName || 'attachment', {type: blob.type});
    return uploadFile(apiKey, file, expiryDays);
}
