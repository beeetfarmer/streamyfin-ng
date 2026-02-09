import { type BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { View, type ViewProps } from "react-native";
import { ItemImage } from "../common/ItemImage";
import { ProgressBar } from "../common/ProgressBar";
import { WatchedIndicator } from "../WatchedIndicator";

interface Props extends ViewProps {
  item: BaseItemDto;
}

export const ItemPoster: React.FC<Props> = ({ item, ...props }) => {
  if (item.Type === "Movie" || item.Type === "Series" || item.Type === "BoxSet")
    return (
      <View
        className='relative rounded-lg overflow-hidden border border-neutral-900'
        {...props}
      >
        <ItemImage
          style={{
            aspectRatio: "10/15",
            width: "100%",
          }}
          item={item}
        />
        <WatchedIndicator item={item} />
        <ProgressBar item={item} />
      </View>
    );

  return (
    <View
      className='rounded-lg w-full aspect-square overflow-hidden border border-neutral-900'
      {...props}
    >
      <ItemImage className='w-full aspect-square' item={item} />
    </View>
  );
};
