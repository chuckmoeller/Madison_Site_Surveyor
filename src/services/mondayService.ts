export const pushToMonday = async (itemName: string, columnValues: any, boardId?: string, notes?: string, images?: string[], parentItemId?: string, existingItemId?: string) => {
  const response = await fetch("/api/monday/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      itemName,
      columnValues,
      boardId,
      notes,
      images,
      parentItemId,
      existingItemId
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to push to Monday.com");
  }

  return data;
};
