import { View, Image, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';

import { PhotographerListItem } from '@/types';
import { fmtPrice, resolveImageUrl } from '@/api/client';
import RatingStars from '../RatingStars';
import './index.scss';

interface Props {
  data: PhotographerListItem;
}

export default function PhotographerCard({ data }: Props) {
  const onTap = () => {
    Taro.navigateTo({ url: `/pages/photographer/detail/index?id=${data.id}` });
  };

  return (
    <View className="photographer-card" onClick={onTap}>
      <View className="cover">
        <Image
          className="cover-image"
          src={resolveImageUrl(data.cover_image || data.avatar)}
          mode="aspectFill"
          lazyLoad
        />
      </View>
      <View className="body">
        <View className="title-row">
          <Image
            className="avatar"
            src={resolveImageUrl(data.avatar)}
            mode="aspectFill"
            lazyLoad
          />
          <View className="title-meta">
            <View className="nickname">{data.nickname}</View>
            <RatingStars rating={data.avg_rating || 5.0} count={data.review_count} size={20} />
          </View>
          <View className="price-col">
            <Text className="price">{fmtPrice(data.starting_price)}</Text>
            <Text className="price-suffix">起</Text>
          </View>
        </View>
        {data.intro && (
          <View className="intro">{data.intro}</View>
        )}
        {data.categories?.length ? (
          <View className="tags">
            {data.categories.slice(0, 4).map((c) => (
              <Text key={c.id} className="tag">{c.name}</Text>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}
