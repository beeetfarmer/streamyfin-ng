import { Image } from "expo-image";
import { View } from "react-native";
import { getTmdbImageUrl } from "@/utils/tmdb/images";

type TmdbPosterProps = {
  posterPath: string | null;
};

const TmdbPoster: React.FC<TmdbPosterProps> = ({ posterPath }) => {
  const url = getTmdbImageUrl(posterPath, "w342");

  return (
    <View className='relative rounded-lg overflow-hidden border border-neutral-900 w-28 aspect-[10/15]'>
      <Image
        source={url ? { uri: url } : null}
        cachePolicy={"memory-disk"}
        contentFit='cover'
        style={{
          aspectRatio: "10/15",
          width: "100%",
        }}
      />
    </View>
  );
};

export default TmdbPoster;
