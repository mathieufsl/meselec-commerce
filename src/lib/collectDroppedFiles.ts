async function readEntry(entry: FileSystemEntry, pathPrefix: string): Promise<File[]> {
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    const file = await new Promise<File>((resolve, reject) => {
      fileEntry.file(resolve, reject);
    });
    if (file.size === 0) return [];
    return [file];
  }

  if (entry.isDirectory) {
    const dirEntry = entry as FileSystemDirectoryEntry;
    const reader = dirEntry.createReader();
    const files: File[] = [];
    const prefix = pathPrefix ? `${pathPrefix}/${entry.name}` : entry.name;

    const readBatch = (): Promise<FileSystemEntry[]> =>
      new Promise((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });

    let batch: FileSystemEntry[];
    do {
      batch = await readBatch();
      for (const child of batch) {
        const nested = await readEntry(child, prefix);
        files.push(...nested);
      }
    } while (batch.length > 0);

    return files;
  }

  return [];
}

export async function collectDroppedFiles(dataTransfer: DataTransfer): Promise<File[]> {
  const items = Array.from(dataTransfer.items ?? []);
  const fromEntries: File[] = [];

  for (const item of items) {
    if (item.kind !== "file") continue;
    const entry = item.webkitGetAsEntry?.();
    if (entry) {
      const nested = await readEntry(entry, "");
      fromEntries.push(...nested);
    }
  }

  if (fromEntries.length > 0) {
    return fromEntries.filter((f) => f.size > 0);
  }

  return Array.from(dataTransfer.files ?? []).filter((f) => f.size > 0);
}
