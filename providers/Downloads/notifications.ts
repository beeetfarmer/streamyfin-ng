import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import type { TFunction } from "i18next";

/**
 * Generate notification content based on item type
 */
export function getNotificationContent(
  item: BaseItemDto,
  isSuccess: boolean,
  t: TFunction,
): { title: string; body: string } {
  if (item.Type === "Episode") {
    const season = item.ParentIndexNumber
      ? String(item.ParentIndexNumber).padStart(2, "0")
      : "??";
    const episode = item.IndexNumber
      ? String(item.IndexNumber).padStart(2, "0")
      : "??";
    const subtitle = `${item.Name} - [S${season}E${episode}] (${item.SeriesName})`;

    return {
      title: isSuccess
        ? t("home.downloads.toasts.download_completed")
        : t("home.downloads.toasts.download_failed"),
      body: subtitle,
    };
  }

  if (item.Type === "Movie") {
    const year = item.ProductionYear ? ` (${item.ProductionYear})` : "";
    const subtitle = `${item.Name}${year}`;

    return {
      title: isSuccess
        ? t("home.downloads.toasts.download_completed")
        : t("home.downloads.toasts.download_failed"),
      body: subtitle,
    };
  }

  return {
    title: isSuccess
      ? t("home.downloads.toasts.download_completed_for_item", {
          item: item.Name,
        })
      : t("home.downloads.toasts.download_failed_for_item", {
          item: item.Name,
        }),
    body: item.Name || "Unknown item",
  };
}

/**
 * Send a local notification for download events
 */
export async function sendDownloadNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<void> {
  // Notifications are intentionally disabled in this build profile.
  void title;
  void body;
  void data;
}
