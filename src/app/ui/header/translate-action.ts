"use server";

export async function translateText(text: string, targetLang: string = "vi", sourceLang: string = "auto"): Promise<string | null> {
    try {
        // Try Google Translate (GTX) - Most reliable, requires Server-Side to avoid CORS
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);

        if (!res.ok) throw new Error("GTX failed");

        const data = await res.json();
        // GTX returns validation: [[["Translated Text", "Source Text", ...], ...], ...]
        if (data && data[0] && Array.isArray(data[0])) {
            // Join all segments if multiple sentences
            return data[0].map((segment: [string, string]) => segment[0]).join("");
        }
        return null;
    } catch {
        // Fallback to MyMemory
        try {
            // MyMemory works best with standard pairs. Fallback defaults to en|vi if auto, or constructs pair.
            const pair = sourceLang === 'auto' ? `en|${targetLang}` : `${sourceLang}|${targetLang}`;
            const resBackup = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${pair}`);
            const dataBackup = await resBackup.json();
            return dataBackup.responseData?.translatedText || null;
        } catch (error) {
            console.error("Translation error:", error);
            return null;
        }
    }
}
