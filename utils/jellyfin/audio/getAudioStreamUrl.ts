import type { Api } from "@jellyfin/sdk";
import type { MediaSourceInfo } from "@jellyfin/sdk/lib/generated-client/models";
import { getMediaInfoApi } from "@jellyfin/sdk/lib/utils/api";
import { stripSensitiveQueryParams } from "@/utils/networkSecurity";
import trackPlayerProfile from "@/utils/profiles/trackplayer";

export interface AudioStreamResult {
  url: string;
  sessionId: string | null;
  mediaSource: MediaSourceInfo | null;
  isTranscoding: boolean;
  headers: Record<string, string>;
}

/**
 * Get the audio stream URL for a Jellyfin item
 * Handles both direct streaming and transcoding scenarios
 */
export const getAudioStreamUrl = async (
  api: Api,
  userId: string,
  itemId: string,
): Promise<AudioStreamResult | null> => {
  try {
    const headers = {
      Authorization: `MediaBrowser Token="${api.accessToken}"`,
      "X-Emby-Token": api.accessToken,
    };

    const res = await getMediaInfoApi(api).getPlaybackInfo(
      { itemId },
      {
        method: "POST",
        data: {
          userId,
          deviceProfile: trackPlayerProfile,
          startTimeTicks: 0,
          isPlayback: true,
          autoOpenLiveStream: true,
        },
      },
    );

    const sessionId = res.data.PlaySessionId || null;
    const mediaSource = res.data.MediaSources?.[0] || null;

    if (mediaSource?.TranscodingUrl) {
      const transcodingUrl = `${api.basePath}${mediaSource.TranscodingUrl}`;
      return {
        url: stripSensitiveQueryParams(transcodingUrl),
        sessionId,
        mediaSource,
        isTranscoding: true,
        headers,
      };
    }

    // Direct stream
    const streamParams = new URLSearchParams({
      static: "true",
      container: mediaSource?.Container || "mp3",
      mediaSourceId: mediaSource?.Id || "",
      deviceId: api.deviceInfo.id,
      userId,
    });

    return {
      url: `${api.basePath}/Audio/${itemId}/stream?${streamParams.toString()}`,
      sessionId,
      mediaSource,
      isTranscoding: false,
      headers,
    };
  } catch {
    return null;
  }
};
