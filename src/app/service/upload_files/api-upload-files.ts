import { FileInfo } from "@/app/data/interface/file";

const isHttpUrl = (value?: string): boolean => /^https?:\/\//i.test(String(value || "").trim());

const pickSerializableFields = (file: FileInfo): FileInfo => {
  return {
    id: file.id,
    size: file.size,
    uploader: file.uploader,
    uploadedAt: file.uploadedAt,
    updatedAt: file.updatedAt,
    title: file.title,
    description: file.description,
    type: file.type,
    links: file.links,
    folder: file.folder,
    source: file.source,
    collectionId: file.collectionId,
    recordId: file.recordId,
    fileName: file.fileName,
    key: file.key,
    url: file.url,
    thumbUrl: file.thumbUrl,
    status: file.status,
  };
};

const normalizeFileInfo = (raw: unknown): (FileInfo & { originFileObj?: File }) | null => {
  if (!raw) return null;

  // Support old records storing only file URL string
  if (typeof raw === "string") {
    const url = raw.trim();
    if (!url) return null;
    return {
      title: url.split("/").pop() || "File",
      key: url,
      url,
    };
  }

  if (typeof raw !== "object") return null;

  const item = raw as FileInfo & { originFileObj?: File };
  const rawUrl = typeof item.url === "string" ? item.url.trim() : "";
  const rawKey = typeof item.key === "string" ? item.key.trim() : "";
  const rawThumbUrl = typeof item.thumbUrl === "string" ? item.thumbUrl.trim() : "";
  const rawLinks = Array.isArray(item.links) ? item.links : [];
  const linkUrl = rawLinks.find((link) => isHttpUrl(link));
  const fallbackUrl =
    rawUrl ||
    (isHttpUrl(rawKey) ? rawKey : "") ||
    (isHttpUrl(rawThumbUrl) ? rawThumbUrl : "") ||
    (typeof linkUrl === "string" ? linkUrl : "");

  const normalized: FileInfo & { originFileObj?: File } = {
    ...pickSerializableFields(item),
    key: rawKey || fallbackUrl,
    url: fallbackUrl || undefined,
    thumbUrl: rawThumbUrl || fallbackUrl || undefined,
  };

  if (item.originFileObj instanceof File) {
    normalized.originFileObj = item.originFileObj;
    if (!normalized.title) normalized.title = item.originFileObj.name;
  }

  if (!normalized.title && normalized.url) {
    normalized.title = normalized.url.split("/").pop() || "File";
  }

  return normalized;
};

export async function uploadFilesToMega(
  files: FileInfo[],
  folderPath: string,
): Promise<FileInfo[]> {
  void folderPath;

  if (!Array.isArray(files) || files.length === 0) return [];

  const normalizedFiles = files
    .map((file) => normalizeFileInfo(file))
    .filter((file): file is FileInfo & { originFileObj?: File } => Boolean(file));

  if (normalizedFiles.length === 0) return [];

  const hasNewFile = normalizedFiles.some((f) => !f.key && f.originFileObj instanceof File);
  if (!hasNewFile) {
    return normalizedFiles.map((f) => {
      const key = typeof f.key === "string" ? f.key.trim() : "";
      const url = typeof f.url === "string" ? f.url.trim() : "";
      const thumbUrl = typeof f.thumbUrl === "string" ? f.thumbUrl.trim() : "";
      const fallbackUrl = url || (isHttpUrl(key) ? key : "") || (isHttpUrl(thumbUrl) ? thumbUrl : "");
      return pickSerializableFields({
        ...f,
        key: key || fallbackUrl,
        url: fallbackUrl || undefined,
        thumbUrl: thumbUrl || fallbackUrl || undefined,
      });
    });
  }

  const uploadedFiles: FileInfo[] = [];

  for (const file of normalizedFiles) {
    if (!file.key && file.originFileObj instanceof File) {
      const formData = new FormData();
      formData.append("file", file.originFileObj);
      formData.append("title", file.title || file.originFileObj.name);
      formData.append("description", file.description || "");

      try {
        const response = await fetch("/api/pocket", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Upload error");
        }

        uploadedFiles.push({
          ...pickSerializableFields(file),
          title: file.title || file.originFileObj.name,
          key: result.data.id,
          url: result.data.url,
        });
      } catch (error) {
        console.error(`Upload file error: ${file.originFileObj.name}`, error);
        throw error;
      }
    } else {
      const key = typeof file.key === "string" ? file.key.trim() : "";
      const url = typeof file.url === "string" ? file.url.trim() : "";
      const thumbUrl = typeof file.thumbUrl === "string" ? file.thumbUrl.trim() : "";
      const fallbackUrl = url || (isHttpUrl(key) ? key : "") || (isHttpUrl(thumbUrl) ? thumbUrl : "");
      uploadedFiles.push(
        pickSerializableFields({
          ...file,
          key: key || fallbackUrl,
          url: fallbackUrl || undefined,
          thumbUrl: thumbUrl || fallbackUrl || undefined,
        }),
      );
    }
  }

  return uploadedFiles;
}
