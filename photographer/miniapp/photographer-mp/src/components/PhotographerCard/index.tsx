import { useEffect, useState } from 'react';
import { View, Image, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';

import { PhotographerListItem } from '@/types';
import { fmtPrice, resolveImageUrl } from '@/api/client';
import { toggleFavorite } from '@/api/photographers';
import RatingStars from '../RatingStars';
import './index.scss';

interface Props {
  data: PhotographerListItem;
  onFavChange?: (id: number, favorited: boolean) => void;
}

export default function PhotographerCard({ data, onFavChange }: Props) {
  const [isFav, setIsFav] = useState<boolean>(!!data.is_favorited);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setIsFav(!!data.is_favorited);
  }, [data.is_favorited, data.id]);

  const onTap = () => {
    Taro.navigateTo({ url: `/pages/photographer/detail/index?id=${data.id}` });
  };

  const onTapFav = async (e: any) => {
    e?.stopPropagation && e.stopPropagation();
    if (pending) return;
    const prev = isFav;
    setIsFav(!prev);
    setPending(true);
    try {
      const r = await toggleFavorite(data.id);
      setIsFav(r.favorited);
      onFavChange && onFavChange(data.id, r.favorited);
      Taro.showToast({
        title: r.message || (r.favorited ? '已收藏' : '已取消收藏'),
        icon: 'success',
      });
    } catch (err: any) {
      setIsFav(prev);
      Taro.showToast({ title: err.detail || '请先登录', icon: 'none' });
    } finally {
      setPending(false);
    }
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
        <View
          className={`fav-badge ${isFav ? 'active' : ''}`}
          onClick={onTapFav}
          catchMove
        >
          <Text className="fav-icon">{isFav ? '♥' : '♡'}</Text>
        </View>
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
