import { Image, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';

import { Work } from '@/types';
import { resolveImageUrl } from '@/api/client';
import './index.scss';

interface Props {
  data: Work;
  allImages?: string[];
}

function fmtDate(s?: string): string {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

export default function WorkCard({ data, allImages }: Props) {
  const onTap = () => {
    Taro.previewImage({
      current: resolveImageUrl(data.image_url),
      urls: (allImages && allImages.length ? allImages : [data.image_url]).map((u) =>
        resolveImageUrl(u)
      ),
    });
  };

  return (
    <View className="work-card" onClick={onTap}>
      <Image
        className="work-image"
        src={resolveImageUrl(data.image_url)}
        mode="aspectFill"
        lazyLoad
      />
      <View className="meta">
        {data.shoot_date && (
          <View className="shoot-date">{fmtDate(data.shoot_date)}</View>
        )}
        {data.category && (
          <Text className="category-tag">#{data.category.name}</Text>
        )}
      </View>
    </View>
  );
}
