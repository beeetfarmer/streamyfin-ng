import type { Api } from "@jellyfin/sdk";
import { getMediaInfoApi } from "@jellyfin/sdk/lib/utils/api";
import { stripSensitiveQueryParams } from "@/utils/networkSecurity";

/**
 * Retrieves the playback URL for the given item ID and user ID.
 *
 * @param api - The Jellyfin API instance.
 * @param itemId - The ID of the media item to retrieve playback URL for.
 * @param userId - The ID of the user requesting the playback URL.
 * @returns The playback URL as a string.
 */
export const getPlaybackUrl = async (
  api: Api,
  itemId: string,
  userId: string,
): Promise<string> => {
  const playbackData = await getMediaInfoApi(api).getPlaybackInfo({
    itemId,
    userId,
  });

  const mediaSources = playbackData.data?.MediaSources;
  if (!mediaSources || mediaSources.length === 0) {
    throw new Error(
      "No media sources available for the requested item and user.",
    );
  }

  const mediaSource = mediaSources[0];
  const transcodeUrl = mediaSource.TranscodingUrl;
  if (transcodeUrl) {
    const absoluteTranscodeUrl = transcodeUrl.startsWith("http")
      ? transcodeUrl
      : `${api.basePath}${transcodeUrl}`;
    return stripSensitiveQueryParams(absoluteTranscodeUrl);
  }

  // Construct a fallback URL if the TranscodingUrl is not available
  const { Id, ETag } = mediaSource;
  if (!Id) {
    throw new Error("Media source ID is missing.");
  }

  const queryParams = new URLSearchParams({
    deviceId: api.deviceInfo?.id || "",
    Tag: ETag || "",
    MediaSourceId: Id,
  });

  return `/Videos/${Id}/stream?${queryParams}`;
};
