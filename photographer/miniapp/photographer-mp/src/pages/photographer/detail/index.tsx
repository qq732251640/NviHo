import { useEffect, useMemo, useState } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { Image, Text, View } from '@tarojs/components';

import { Category, PhotographerDetail, Work } from '@/types';
import { fmtPrice, resolveImageUrl } from '@/api/client';
import { getPhotographer, toggleFavorite } from '@/api/photographers';
import RatingStars from '@/components/RatingStars';
import WorkCard from '@/components/WorkCard';
import CategoryDrawer from '@/components/CategoryDrawer';
import PackageItem from '@/components/PackageItem';
import './index.scss';

export default function PhotographerDetailPage() {
  const router = useRouter();
  const id = Number(router.params.id || 0);

  const [data, setData] = useState<PhotographerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [worksCategory, setWorksCategory] = useState<number | null>(null);
  const [activePackageId, setActivePackageId] = useState<number | null>(null);
  const [isFav, setIsFav] = useState(false);
  const [favPending, setFavPending] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const detail = await getPhotographer(id);
      setData(detail);
      setIsFav(!!detail.is_favorited);
      if (detail.packages?.length) {
        setActivePackageId(detail.packages[0].id);
      }
    } catch (e: any) {
      Taro.showToast({ title: e.detail || '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const filteredWorks = useMemo<Work[]>(() => {
    if (!data) return [];
    if (worksCategory === null) return data.works;
    return data.works.filter((w) => w.category?.id === worksCategory);
  }, [data, worksCategory]);

  const allImages = useMemo(
    () => filteredWorks.map((w) => w.image_url),
    [filteredWorks]
  );

  const onToggleFav = async () => {
    if (favPending) return;
    const prev = isFav;
    setIsFav(!prev);
    setFavPending(true);
    try {
      const r = await toggleFavorite(id);
      setIsFav(r.favorited);
      Taro.showToast({ title: r.message || (r.favorited ? '已收藏' : '已取消收藏'), icon: 'success' });
    } catch (e: any) {
      setIsFav(prev);
      Taro.showToast({ title: e.detail || '请先登录', icon: 'none' });
    } finally {
      setFavPending(false);
    }
  };

  const onBook = () => {
    if (!data || !activePackageId) {
      Taro.showToast({ title: '请先选择套餐', icon: 'none' });
      return;
    }
    Taro.navigateTo({
      url: `/pages/order/create/index?photographer_id=${data.id}&package_id=${activePackageId}`,
    });
  };

  const onContact = () => {
    if (!data) return;
    Taro.showModal({
      title: '请通过下单咨询',
      content: '为保障双方权益,联系信息会在订单确认后释放',
      showCancel: false,
    });
  };

  const onOpenExternal = () => {
    if (!data?.external_portfolio_url) return;
    Taro.setClipboardData({
      data: data.external_portfolio_url,
      success: () => {
        Taro.showToast({ title: '链接已复制,可去浏览器打开', icon: 'none' });
      },
    });
  };

  if (loading || !data) {
    return <View className="loading">加载中...</View>;
  }

  const works_categories: Category[] = (() => {
    const map = new Map<number, Category>();
    data.works.forEach((w) => {
      if (w.category) map.set(w.category.id, w.category);
    });
    return Array.from(map.values());
  })();

  return (
    <View className="photographer-detail">
      <View className="hero">
        {data.cover_image && (
          <Image
            className="hero-bg"
            src={resolveImageUrl(data.cover_image)}
            mode="aspectFill"
          />
        )}
        <View className="hero-mask" />
        <View className="hero-info">
          <Image
            className="avatar"
            src={resolveImageUrl(data.avatar)}
            mode="aspectFill"
          />
          <View className="meta">
            <Text className="nickname">{data.nickname}</Text>
            <RatingStars
              rating={data.avg_rating || 5}
              count={data.review_count}
              size={22}
            />
            <View className="meta-row">
              <Text className="meta-item">{data.completed_orders || 0} 单</Text>
              <Text className="meta-item">
                {data.years_of_experience || 1} 年经验
              </Text>
              <Text className="meta-item">{data.base_city}</Text>
            </View>
          </View>
        </View>
      </View>

      <View className="section intro-section">
        {data.categories?.length ? (
          <View className="tags">
            {data.categories.map((c) => (
              <Text key={c.id} className="tag">{c.name}</Text>
            ))}
          </View>
        ) : null}
        {data.intro && <View className="intro">{data.intro}</View>}
      </View>

      <View className="section dark-section">
        <View className="section-head dark">
          <Text className="section-title">作品 · 共 {data.works.length}</Text>
          <View className="filter-btn" onClick={() => setDrawerVisible(true)}>
            <Text className="hamburger">≡</Text>
            <Text>
              {worksCategory === null
                ? '全部'
                : works_categories.find((c) => c.id === worksCategory)?.name || '筛选'}
            </Text>
          </View>
        </View>
        <View className="works-list">
          {filteredWorks.length === 0 && (
            <View className="works-empty">该分类下还没有作品</View>
          )}
          {filteredWorks.map((w) => (
            <WorkCard key={w.id} data={w} allImages={allImages} />
          ))}
        </View>
        {data.external_portfolio_url && (
          <View className="external-link" onClick={onOpenExternal}>
            完整作品集 →
          </View>
        )}
      </View>

      <View className="section">
        <View className="section-head">
          <Text className="section-title">套餐 / 价格表</Text>
        </View>
        {data.packages.map((p) => (
          <PackageItem
            key={p.id}
            data={p}
            active={p.id === activePackageId}
            onClick={() => setActivePackageId(p.id)}
          />
        ))}
      </View>

      <View className="section">
        <View className="section-head">
          <Text className="section-title">接单范围</Text>
        </View>
        <View className="service-area">
          <View className="line">基地: {data.base_city || '太原'}</View>
          <View className="line">
            周边 {data.service_radius_km || 50}km 接单
            {data.service_extra_fee
              ? ` · 加价 ¥${data.service_extra_fee}`
              : ''}
          </View>
        </View>
      </View>

      <View className="section">
        <View className="section-head">
          <Text className="section-title">用户评价 · {data.review_count}</Text>
        </View>
        {data.recent_reviews.length === 0 ? (
          <View className="reviews-empty">暂无评价</View>
        ) : (
          data.recent_reviews.map((r) => (
            <View key={r.id} className="review-card">
              <View className="review-head">
                <Image
                  className="review-avatar"
                  src={resolveImageUrl(r.user_avatar) || ''}
                  mode="aspectFill"
                />
                <View className="review-meta">
                  <Text className="review-name">
                    {r.user_nickname || '匿名用户'}
                  </Text>
                  <RatingStars rating={r.rating} size={20} showValue={false} />
                </View>
              </View>
              {r.text && <View className="review-text">{r.text}</View>}
            </View>
          ))
        )}
      </View>

      <View className="bottom-spacer" />

      <View className="action-bar">
        <View
          className={`action-ghost fav-btn ${isFav ? 'active' : ''}`}
          onClick={onToggleFav}
        >
          <Text className="fav-icon">{isFav ? '♥' : '♡'}</Text>
          <Text className="action-label">{isFav ? '已收藏' : '收藏'}</Text>
        </View>
        <View className="action-ghost" onClick={onContact}>
          <Text>💬</Text>
          <Text className="action-label">咨询</Text>
        </View>
        <View className="action-cta">
          <View className="cta-price">
            <Text className="price">{fmtPrice(data.starting_price)}</Text>
            <Text className="price-suffix">起</Text>
          </View>
          <View className="cta-btn" onClick={onBook}>立即预约</View>
        </View>
      </View>

      <CategoryDrawer
        visible={drawerVisible}
        categories={works_categories}
        current={worksCategory}
        onPick={setWorksCategory}
        onClose={() => setDrawerVisible(false)}
        title="作品"
      />
    </View>
  );
}
