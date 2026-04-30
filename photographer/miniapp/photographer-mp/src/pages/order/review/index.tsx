import { useState } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { Text, Textarea, View } from '@tarojs/components';

import { reviewOrder } from '@/api/orders';
import './index.scss';

const TAGS = ['出片好看', '准时', '态度好', '修图细', '性价比高', '会引导'];

export default function ReviewPage() {
  const router = useRouter();
  const id = Number(router.params.id || 0);

  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleTag = (t: string) => {
    setTags((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));
  };

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      await reviewOrder(id, { rating, text: text.trim() || undefined, tags });
      Taro.showToast({ title: '已发布评价', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 600);
    } catch (e: any) {
      Taro.showToast({ title: e.detail || '提交失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="review-page">
      <View className="card">
        <View className="card-title">综合评分</View>
        <View className="stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <Text
              key={n}
              className={`star ${n <= rating ? 'on' : ''}`}
              onClick={() => setRating(n)}
            >
              ★
            </Text>
          ))}
        </View>
      </View>

      <View className="card">
        <View className="card-title">标签</View>
        <View className="tags">
          {TAGS.map((t) => (
            <View
              key={t}
              className={`tag ${tags.includes(t) ? 'active' : ''}`}
              onClick={() => toggleTag(t)}
            >
              {t}
            </View>
          ))}
        </View>
      </View>

      <View className="card">
        <View className="card-title">写下你的评价</View>
        <Textarea
          className="textarea"
          placeholder="拍摄体验、出片感受、对其他用户的建议..."
          maxlength={500}
          value={text}
          onInput={(e: any) => setText(e.detail.value)}
        />
      </View>

      <View className="bottom-bar">
        <View className="submit" onClick={submitting ? undefined : onSubmit}>
          {submitting ? '提交中...' : '发布评价'}
        </View>
      </View>
    </View>
  );
}
